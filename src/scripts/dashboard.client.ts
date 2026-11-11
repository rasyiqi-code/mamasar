// Client-side Interactive Logic for Modern SaaS Dashboard

export function initDashboardClient() {
  // Tab switching logic via Sidebar & URL hash
  function initTabs() {
    const tabBtns = document.querySelectorAll<HTMLButtonElement>('[data-nav-tab]');
    const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

    function switchTab(targetName: string) {
      tabBtns.forEach((btn) => {
        if (btn.getAttribute('data-nav-tab') === targetName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      panels.forEach((p) => {
        if (p.id === `panel-${targetName}`) {
          p.classList.remove('hidden');
        } else {
          p.classList.add('hidden');
        }
      });

      closeSidebar();
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-nav-tab');
        if (tabName) {
          switchTab(tabName);
          window.location.hash = tabName;
        }
      });
    });

    const currentHash = window.location.hash.replace('#', '');
    if (['products', 'cashbook', 'profile', 'services'].includes(currentHash)) {
      switchTab(currentHash);
    }
  }

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('dashboard-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');

  function openSidebar() {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
  }

  function closeSidebar() {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  }

  btnToggleSidebar?.addEventListener('click', openSidebar);
  btnCloseSidebar?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);

  // Modal Manager
  function openModal(id: string) {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal(id: string) {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) modal.classList.add('hidden');
  }

  document.querySelectorAll('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-modal');
      if (id) openModal(id);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close-modal');
      if (id) closeModal(id);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((el) => {
    el.addEventListener('click', () => {
      const modal = el.closest('[id^="modal-"]');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Status notification helper
  function notify(msg: string, isError = false) {
    if ((window as any).showAppToast) {
      (window as any).showAppToast(msg, isError);
    } else {
      const actionStatus = document.getElementById('action-status');
      if (actionStatus) {
        actionStatus.className = isError
          ? 'p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200'
          : 'p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200';
        actionStatus.textContent = msg;
        actionStatus.classList.remove('hidden');
        setTimeout(() => actionStatus.classList.add('hidden'), 4000);
      }
    }
  }

  // Setup Store Form (State 2)
  const storeSetupForm = document.getElementById('store-setup-form') as HTMLFormElement | null;
  storeSetupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-store') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData(storeSetupForm);
      const res = await fetch('/api/umkm/setup', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.claim_available) {
        const claimOffer = document.getElementById('claim-offer');
        const claimOfferText = document.getElementById('claim-offer-text');
        const input = document.getElementById('claimStoreIdInput') as HTMLInputElement | null;
        if (input) input.value = String(data.candidate?.id || '');
        if (claimOfferText) claimOfferText.textContent = data.message || '';
        claimOffer?.classList.remove('hidden');
        return;
      }

      if (res.ok && data.success) {
        window.location.reload();
        return;
      }
      notify(data.message || 'Gagal menyimpan profil toko.', true);
    } catch (err: any) {
      notify('Kendala koneksi: ' + err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Edit Store Profile Form
  const editStoreForm = document.getElementById('edit-store-form') as HTMLFormElement | null;
  editStoreForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-edit-store') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData(editStoreForm);
      const res = await fetch('/api/umkm/update', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        notify('✅ Profil toko berhasil diperbarui!');
        setTimeout(() => window.location.reload(), 800);
      } else {
        notify(data.message || 'Gagal memperbarui profil toko.', true);
      }
    } catch (err: any) {
      notify('Kendala server: ' + err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Add Product Camera Compression
  const dashCameraInput = document.getElementById('dash-camera-input') as HTMLInputElement | null;
  const dashImageBase64 = document.getElementById('dashImageBase64') as HTMLInputElement | null;
  const dashCompressInfo = document.getElementById('dash-compress-info');

  dashCameraInput?.addEventListener('change', () => {
    const file = dashCameraInput.files?.[0];
    if (!file) return;

    const originalSizeKB = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        if (dashImageBase64) dashImageBase64.value = compressedBase64;

        const compressedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
        if (dashCompressInfo) {
          dashCompressInfo.textContent = `✓ Foto dikompres: ${originalSizeKB} KB ➔ ~${compressedSizeKB} KB`;
          dashCompressInfo.className = 'text-[10px] font-bold text-emerald-600';
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  // Add Product Form Submit
  const addProductForm = document.getElementById('add-product-form') as HTMLFormElement | null;
  addProductForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-product') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData(addProductForm);
      const res = await fetch('/api/umkm/add-product', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        window.location.reload();
      } else {
        notify('Gagal menambah produk: ' + (data.message || 'Terjadi kesalahan sistem.'), true);
      }
    } catch (err: any) {
      notify('Gagal mengirim ke server: ' + err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Edit Product Camera Compression
  const editCameraInput = document.getElementById('edit-camera-input') as HTMLInputElement | null;
  const editImageBase64 = document.getElementById('editImageBase64') as HTMLInputElement | null;
  const editCompressInfo = document.getElementById('edit-compress-info');

  editCameraInput?.addEventListener('change', () => {
    const file = editCameraInput.files?.[0];
    if (!file) return;

    const originalSizeKB = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        if (editImageBase64) editImageBase64.value = compressedBase64;

        const compressedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
        if (editCompressInfo) {
          editCompressInfo.textContent = `✓ Foto baru dikompres: ${originalSizeKB} KB ➔ ~${compressedSizeKB} KB`;
          editCompressInfo.className = 'text-[10px] font-bold text-emerald-600';
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  // Populate Edit Product Modal
  document.querySelectorAll<HTMLButtonElement>('[data-action="edit-product"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id') || '';
      const name = btn.getAttribute('data-name') || '';
      const price = btn.getAttribute('data-price') || '';
      const category = btn.getAttribute('data-category') || '';
      const desc = btn.getAttribute('data-desc') || '';
      const shopee = btn.getAttribute('data-shopee') || '';

      const idInput = document.getElementById('editProductId') as HTMLInputElement | null;
      const nameInput = document.getElementById('editProdName') as HTMLInputElement | null;
      const priceInput = document.getElementById('editProdPrice') as HTMLInputElement | null;
      const catSelect = document.getElementById('editProdCategory') as HTMLSelectElement | null;
      const descInput = document.getElementById('editProdDesc') as HTMLTextAreaElement | null;
      const shopeeInput = document.getElementById('editProdShopee') as HTMLInputElement | null;

      if (idInput) idInput.value = id;
      if (nameInput) nameInput.value = name;
      if (priceInput) priceInput.value = price;
      if (catSelect) catSelect.value = category;
      if (descInput) descInput.value = desc;
      if (shopeeInput) shopeeInput.value = shopee;
      if (editImageBase64) editImageBase64.value = '';
      if (editCompressInfo) editCompressInfo.textContent = '';
      if (editCameraInput) editCameraInput.value = '';

      openModal('edit-product');
    });
  });

  // Submit Edit Product
  const editProductForm = document.getElementById('edit-product-form') as HTMLFormElement | null;
  editProductForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-edit-product') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    try {
      const formData = new FormData(editProductForm);
      const res = await fetch('/api/products/edit', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        closeModal('edit-product');
        notify('✅ Produk berhasil diperbarui!');
        setTimeout(() => window.location.reload(), 800);
      } else {
        notify(data.message || 'Gagal memperbarui produk.', true);
      }
    } catch (err: any) {
      notify('Kendala server: ' + err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Quick Actions: Bump, Toggle Stock, Delete
  document.querySelectorAll<HTMLButtonElement>('[data-action="bump"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const formData = new FormData();
      formData.append('productId', id || '');

      const res = await fetch('/api/products/bump', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        notify('⚡ Berhasil! Iklan disundul ke posisi teratas.');
        setTimeout(() => window.location.reload(), 800);
      } else {
        notify(data.message || 'Gagal menyundul produk.', true);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="toggle-stock"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const formData = new FormData();
      formData.append('productId', id || '');

      const res = await fetch('/api/products/toggle-stock', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        notify(data.message || 'Gagal mengubah status stok.', true);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      if (!confirm(`Hapus produk "${name}" dari katalog toko Anda?`)) return;

      const formData = new FormData();
      formData.append('productId', id || '');

      const res = await fetch('/api/products/delete', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        notify(data.message || 'Gagal menghapus produk.', true);
      }
    });
  });

  // Cashbook Entry & Quick Sale Recording
  const btnToggleCash = document.getElementById('btn-toggle-cashbook-form');
  const btnCancelCash = document.getElementById('btn-cancel-cashbook');
  const cashContainer = document.getElementById('cashbook-form-container');
  const cashForm = document.getElementById('cashbook-entry-form') as HTMLFormElement | null;
  const cashProdSelect = document.getElementById('cashProdSelect') as HTMLSelectElement | null;
  const cashDateInput = document.getElementById('cashDate') as HTMLInputElement | null;

  if (cashDateInput && !cashDateInput.value) {
    cashDateInput.value = new Date().toISOString().slice(0, 10);
  }

  cashProdSelect?.addEventListener('change', () => {
    const selectedOption = cashProdSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;
    const name = selectedOption.getAttribute('data-name') || '';
    const price = selectedOption.getAttribute('data-price') || '';

    const cashTitle = document.getElementById('cashTitle') as HTMLInputElement | null;
    const cashAmount = document.getElementById('cashAmount') as HTMLInputElement | null;
    const cashType = document.getElementById('cashType') as HTMLSelectElement | null;

    if (cashTitle) cashTitle.value = `Penjualan ${name}`;
    if (cashAmount) cashAmount.value = price;
    if (cashType) cashType.value = 'income';
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="record-sale"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cashTabBtn = document.querySelector<HTMLButtonElement>('[data-nav-tab="cashbook"]');
      cashTabBtn?.click();

      const title = btn.getAttribute('data-title') || '';
      const amount = btn.getAttribute('data-amount') || '';

      const cashTitle = document.getElementById('cashTitle') as HTMLInputElement | null;
      const cashAmount = document.getElementById('cashAmount') as HTMLInputElement | null;
      const cashType = document.getElementById('cashType') as HTMLSelectElement | null;

      if (cashTitle) cashTitle.value = title;
      if (cashAmount) cashAmount.value = amount;
      if (cashType) cashType.value = 'income';

      cashContainer?.classList.remove('hidden');
      cashContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cashAmount?.focus();
    });
  });

  btnToggleCash?.addEventListener('click', () => {
    cashContainer?.classList.toggle('hidden');
    if (!cashContainer?.classList.contains('hidden')) {
      document.getElementById('cashTitle')?.focus();
    }
  });

  btnCancelCash?.addEventListener('click', () => {
    cashContainer?.classList.add('hidden');
  });

  cashForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = (document.getElementById('cashTitle') as HTMLInputElement).value;
    const amount = Number((document.getElementById('cashAmount') as HTMLInputElement).value);
    const type = (document.getElementById('cashType') as HTMLSelectElement).value;
    const transactionDate = (document.getElementById('cashDate') as HTMLInputElement)?.value;

    try {
      const res = await fetch('/api/user/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount, type, transactionDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        notify(data.message || 'Gagal menyimpan catatan kas.', true);
      }
    } catch (err: any) {
      notify('Gagal menghubungi server: ' + err.message, true);
    }
  });

  document.querySelectorAll('.btn-delete-cash').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Hapus baris catatan buku kas ini?')) return;

      try {
        const res = await fetch('/api/user/cashbook', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const row = document.getElementById(`cash-row-${id}`);
          row?.remove();
          notify('Catatan kas dihapus.');
        } else {
          notify(data.message || 'Gagal menghapus baris kas.', true);
        }
      } catch (err: any) {
        notify('Gagal menghubungi server: ' + err.message, true);
      }
    });
  });

  // Export Cashbook to CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const rows = document.querySelectorAll('#cashbook-rows tr');
    if (!rows || rows.length === 0 || rows[0].querySelector('td[colspan]')) {
      notify('Belum ada data catatan buku kas untuk diunduh.', true);
      return;
    }
    let csvContent = '\uFEFF';
    csvContent += 'Tanggal,Keterangan,Jenis,Nominal (Rp)\r\n';
    rows.forEach((row) => {
      const cols = row.querySelectorAll('td');
      if (cols.length >= 4) {
        const date = cols[0].textContent?.trim() || '';
        const title = `"${cols[1].textContent?.trim().replace(/"/g, '""')}"`;
        const type = cols[2].textContent?.trim() || '';
        const rawAmount = cols[3].textContent?.trim() || '';
        const cleanAmount = rawAmount.replace(/[^\d]/g, '');
        const prefix = rawAmount.startsWith('+') ? '' : '-';
        csvContent += `${date},${title},${type},${prefix}${cleanAmount}\r\n`;
      }
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap-Kas-Mamasar-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // Neon Auth Email Toggle (State 1)
  const neonAuthForm = document.getElementById('neon-auth-form') as HTMLFormElement | null;
  const neonAuthMsg = document.getElementById('neon-auth-msg');
  const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
  const nameFieldGroup = document.getElementById('name-field-group');
  const neonAuthAction = document.getElementById('neonAuthAction') as HTMLInputElement | null;
  const neonSubmitBtn = document.getElementById('neon-submit-btn') as HTMLButtonElement | null;

  toggleAuthModeBtn?.addEventListener('click', () => {
    if (!neonAuthAction) return;
    const isSignIn = neonAuthAction.value === 'signin';
    if (isSignIn) {
      neonAuthAction.value = 'signup';
      nameFieldGroup?.classList.remove('hidden');
      if (neonSubmitBtn) neonSubmitBtn.textContent = 'Daftar Akun Baru';
      toggleAuthModeBtn.textContent = 'Sudah punya akun? Masuk di sini ➔';
    } else {
      neonAuthAction.value = 'signin';
      nameFieldGroup?.classList.add('hidden');
      if (neonSubmitBtn) neonSubmitBtn.textContent = 'Masuk dengan Email';
      toggleAuthModeBtn.textContent = 'Belum punya akun? Daftar Baru di sini ➔';
    }
    if (neonAuthMsg) neonAuthMsg.classList.add('hidden');
  });

  neonAuthForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (neonSubmitBtn) neonSubmitBtn.disabled = true;
    if (neonAuthMsg) {
      neonAuthMsg.className = 'p-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
      neonAuthMsg.textContent = 'Menghubungi server autentikasi...';
      neonAuthMsg.classList.remove('hidden');
    }

    const formData = new FormData(neonAuthForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        if (neonAuthMsg) neonAuthMsg.textContent = 'Berhasil masuk! Membuka dashboard...';
        window.location.href = data.redirect || '/dashboard';
      } else {
        if (neonAuthMsg) {
          neonAuthMsg.className = 'p-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200';
          neonAuthMsg.textContent = data.error || 'Autentikasi gagal.';
        }
      }
    } catch (err: any) {
      if (neonAuthMsg) {
        neonAuthMsg.className = 'p-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200';
        neonAuthMsg.textContent = 'Kendala koneksi: ' + err.message;
      }
    } finally {
      if (neonSubmitBtn) neonSubmitBtn.disabled = false;
    }
  });

  // Pendaftaran Petugas Pendata MWC (Layanan Kemitraan)
  const regForm = document.getElementById('petugas-register-form') as HTMLFormElement | null;
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-petugas-reg') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim Permohonan...';
    }

    try {
      const formData = new FormData(regForm);
      const res = await fetch('/api/petugas/register', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        notify(data.message || 'Permohonan berhasil dikirim!');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        notify(data.message || 'Gagal mengajukan permohonan.', true);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Kirim Pengajuan Petugas Lapangan ➔';
        }
      }
    } catch (err: any) {
      notify(err.message || 'Terjadi kesalahan jaringan.', true);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pengajuan Petugas Lapangan ➔';
      }
    }
  });

  // Initialize tabs
  initTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardClient);
} else {
  initDashboardClient();
}
