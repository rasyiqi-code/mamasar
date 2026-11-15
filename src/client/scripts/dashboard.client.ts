// Client-side Interactive Logic for Modern SaaS Dashboard
import { confirmAction, openNativeDialog, closeNativeDialog } from '../../lib/dialog';

export function initDashboardClient() {
  // Support legacy /dashboard#section hashes via dedicated routes
  function initTabs() {
    const hashRouteMap: Record<string, string> = {
      products: '/dashboard/produk',
      cashbook: '/dashboard/kas',
      profile: '/dashboard/profil',
      services: '/dashboard/kemitraan',
    };
    const currentHash = window.location.hash.replace('#', '');
    if (hashRouteMap[currentHash] && document.getElementById('dashboard-sidebar')) {
      window.location.replace(hashRouteMap[currentHash]);
      return;
    }

    const tabBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-nav-tab]'));
    const panels = document.querySelectorAll<HTMLElement>('.tab-panel');
    if (tabBtns.length === 0) return;

    function switchTab(targetName: string, syncUrl = false) {
      tabBtns.forEach((btn) => {
        const isActive = btn.getAttribute('data-nav-tab') === targetName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      panels.forEach((p) => {
        if (p.id === `panel-${targetName}`) {
          p.classList.remove('hidden');
        } else {
          p.classList.add('hidden');
        }
      });

      if (syncUrl) {
        history.replaceState(null, '', `#${targetName}`);
      }

      closeSidebar();
    }

    tabBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-nav-tab');
        if (tabName) {
          switchTab(tabName, true);
        }
      });

      btn.addEventListener('keydown', (e) => {
        if (tabBtns.length === 0) return;
        let nextIdx = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIdx = (idx + 1) % tabBtns.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabBtns.length - 1;

        if (nextIdx >= 0) {
          e.preventDefault();
          const nextBtn = tabBtns[nextIdx];
          const tabName = nextBtn.getAttribute('data-nav-tab');
          if (tabName) switchTab(tabName, true);
          nextBtn.focus();
        }
      });
    });
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

  // Native <dialog> Modal Manager
  function openModal(id: string) {
    const modal = document.getElementById(`modal-${id}`);
    if (modal instanceof HTMLDialogElement) {
      openNativeDialog(modal);
    } else if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function closeModal(id: string) {
    const modal = document.getElementById(`modal-${id}`);
    if (modal instanceof HTMLDialogElement) {
      closeNativeDialog(modal);
    } else if (modal) {
      modal.classList.add('hidden');
    }
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

  const editProdDialog = document.getElementById('modal-edit-product');
  if (editProdDialog instanceof HTMLDialogElement) {
    editProdDialog.addEventListener('click', (e) => {
      if (e.target === editProdDialog) closeNativeDialog(editProdDialog);
    });
  }

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
          editCompressInfo.textContent = `Foto baru dikompres: ${originalSizeKB} KB ke ~${compressedSizeKB} KB`;
          editCompressInfo.className = 'text-xs font-bold text-emerald-700';
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
      const stockStatus = btn.getAttribute('data-stock-status') || 'ready';
      const capacity = btn.getAttribute('data-capacity') || '';
      const originalPrice = btn.getAttribute('data-original-price') || '';

      const idInput = document.getElementById('editProductId') as HTMLInputElement | null;
      const nameInput = document.getElementById('editProdName') as HTMLInputElement | null;
      const priceInput = document.getElementById('editProdPrice') as HTMLInputElement | null;
      const origPriceInput = document.getElementById('editProdOriginalPrice') as HTMLInputElement | null;
      const catSelect = document.getElementById('editProdCategory') as HTMLSelectElement | null;
      const descInput = document.getElementById('editProdDesc') as HTMLTextAreaElement | null;
      const shopeeInput = document.getElementById('editProdShopee') as HTMLInputElement | null;
      const stockStatusSelect = document.getElementById('editProdStockStatus') as HTMLSelectElement | null;
      const capacityInput = document.getElementById('editProdCapacity') as HTMLInputElement | null;

      if (idInput) idInput.value = id;
      if (nameInput) nameInput.value = name;
      if (priceInput) priceInput.value = price;
      if (origPriceInput) origPriceInput.value = originalPrice;
      if (catSelect) catSelect.value = category;
      if (descInput) descInput.value = desc;
      if (shopeeInput) shopeeInput.value = shopee;
      if (stockStatusSelect) stockStatusSelect.value = stockStatus;
      if (capacityInput) capacityInput.value = capacity;
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

      try {
        const res = await fetch('/api/products/bump', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.success) {
          const remaining = data.remainingCredits !== undefined ? ` (Sisa kuota: ${data.remainingCredits} token)` : '';
          notify(`⚡ Berhasil! Iklan disundul ke posisi teratas${remaining}.`);
          setTimeout(() => window.location.reload(), 800);
        } else if (res.status === 402 || data.reason === 'insufficient_credits') {
          notify('⚠️ Kuota token sundul Anda habis. Membuka paket isi ulang token...', true);
          if ((window as any).openPromoModal) {
            (window as any).openPromoModal('bump');
          }
        } else {
          notify(data.message || 'Gagal menyundul produk.', true);
        }
      } catch (err: any) {
        notify('Kendala jaringan: ' + err.message, true);
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
      const confirmed = await confirmAction({
        title: 'Hapus Produk',
        message: `Hapus produk "${name}" dari katalog toko Anda?`,
        confirmLabel: 'Ya, Hapus Produk',
        tone: 'danger',
      });
      if (!confirmed) return;

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
  const cashToggleBtns = document.querySelectorAll<HTMLButtonElement>('[data-trigger="toggle-cashbook"], #btn-toggle-cashbook-form');
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
      const title = btn.getAttribute('data-title') || '';
      const amount = btn.getAttribute('data-amount') || '';

      const cashTitle = document.getElementById('cashTitle') as HTMLInputElement | null;
      const cashAmount = document.getElementById('cashAmount') as HTMLInputElement | null;
      const cashType = document.getElementById('cashType') as HTMLSelectElement | null;

      if (!cashTitle || !cashAmount) {
        const params = new URLSearchParams();
        if (title) params.set('new_title', title);
        if (amount) params.set('new_amount', amount);
        window.location.href = `/dashboard/kas?${params.toString()}`;
        return;
      }

      const cashTabBtn = document.querySelector<HTMLButtonElement>('[data-nav-tab="cashbook"]');
      cashTabBtn?.click();

      cashTitle.value = title;
      cashAmount.value = amount;
      if (cashType) cashType.value = 'income';

      cashContainer?.classList.remove('hidden');
      cashContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cashAmount.focus();
    });
  });

  if (cashContainer && window.location.pathname === '/dashboard/kas') {
    const kasParams = new URLSearchParams(window.location.search);
    const newTitle = kasParams.get('new_title');
    const newAmount = kasParams.get('new_amount');
    if (newTitle || newAmount) {
      const cashTitle = document.getElementById('cashTitle') as HTMLInputElement | null;
      const cashAmount = document.getElementById('cashAmount') as HTMLInputElement | null;
      const cashType = document.getElementById('cashType') as HTMLSelectElement | null;
      if (cashTitle && newTitle) cashTitle.value = newTitle;
      if (cashAmount && newAmount) cashAmount.value = newAmount;
      if (cashType) cashType.value = 'income';
      cashContainer.classList.remove('hidden');
      history.replaceState(null, '', '/dashboard/kas');
      cashAmount?.focus();
    }
  }

  cashToggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      cashContainer?.classList.toggle('hidden');
      if (!cashContainer?.classList.contains('hidden')) {
        document.getElementById('cashTitle')?.focus();
      }
    });
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
      const confirmed = await confirmAction({
        title: 'Hapus Catatan Kas',
        message: 'Hapus baris catatan buku kas ini secara permanen?',
        confirmLabel: 'Ya, Hapus Catatan',
        tone: 'danger',
      });
      if (!confirmed) return;

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
  document.querySelectorAll<HTMLButtonElement>('[data-trigger="export-csv"], #btn-export-csv').forEach((btn) => {
    btn.addEventListener('click', () => {
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
  });

  // Neon Auth Email Toggle (State 1)
  const neonAuthForm = document.getElementById('neon-auth-form') as HTMLFormElement | null;
  const neonAuthMsg = document.getElementById('neon-auth-msg');
  const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
  const nameFieldGroup = document.getElementById('name-field-group');
  const neonAuthAction = document.getElementById('neonAuthAction') as HTMLInputElement | null;
  const neonSubmitBtn = document.getElementById('neon-submit-btn') as HTMLButtonElement | null;
  const neonPasswordInput = document.getElementById('neonPassword') as HTMLInputElement | null;
  const toggleNeonPasswordBtn = document.getElementById('toggle-neon-password') as HTMLButtonElement | null;

  toggleNeonPasswordBtn?.addEventListener('click', () => {
    if (!neonPasswordInput) return;
    const isPassword = neonPasswordInput.type === 'password';
    neonPasswordInput.type = isPassword ? 'text' : 'password';
    toggleNeonPasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    toggleNeonPasswordBtn.textContent = isPassword ? 'Sembunyikan' : 'Tampilkan';
  });

  toggleAuthModeBtn?.addEventListener('click', () => {
    if (!neonAuthAction) return;
    const isSignIn = neonAuthAction.value === 'signin';
    if (isSignIn) {
      neonAuthAction.value = 'signup';
      nameFieldGroup?.classList.remove('hidden');
      if (neonPasswordInput) neonPasswordInput.autocomplete = 'new-password';
      if (neonSubmitBtn) neonSubmitBtn.textContent = 'Daftar Akun Baru';
      toggleAuthModeBtn.textContent = 'Sudah punya akun? Masuk di sini';
    } else {
      neonAuthAction.value = 'signin';
      nameFieldGroup?.classList.add('hidden');
      if (neonPasswordInput) neonPasswordInput.autocomplete = 'current-password';
      if (neonSubmitBtn) neonSubmitBtn.textContent = 'Masuk dengan Email';
      toggleAuthModeBtn.textContent = 'Belum punya akun? Daftar Baru di sini';
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

  // Tab Onboarding Multi-Peran (Ketika user belum memiliki profil toko)
  function initOnboardingTabs() {
    const onboardTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-onboard-tab]'));
    if (onboardTabs.length === 0) return;

    function activateOnboardTab(target: 'store' | 'kader', focusTab = false) {
      onboardTabs.forEach((btn) => {
        const name = btn.getAttribute('data-onboard-tab');
        const selected = name === target;
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        btn.setAttribute('tabindex', selected ? '0' : '-1');
        btn.classList.toggle('border-emerald-700', selected);
        btn.classList.toggle('text-emerald-800', selected);
        btn.classList.toggle('bg-emerald-50/50', selected);
        btn.classList.toggle('border-transparent', !selected);
        btn.classList.toggle('text-slate-600', !selected);
        if (selected && focusTab) btn.focus();

        const panel = document.getElementById(`onboard-panel-${name}`);
        if (panel) panel.hidden = !selected;
      });
    }

    onboardTabs.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-onboard-tab') as 'store' | 'kader' | null;
        if (name) activateOnboardTab(name);
      });

      btn.addEventListener('keydown', (e) => {
        let nextIdx: number | null = null;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % onboardTabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + onboardTabs.length) % onboardTabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = onboardTabs.length - 1;

        if (nextIdx !== null) {
          e.preventDefault();
          const nextName = onboardTabs[nextIdx].getAttribute('data-onboard-tab') as 'store' | 'kader' | null;
          if (nextName) activateOnboardTab(nextName, true);
        }
      });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash === 'services' || hash === 'daftar-kader') {
      activateOnboardTab('kader');
    }
  }
  initOnboardingTabs();

  // Pendaftaran Kader Ranting / Pengurus MWC NU
  const regForm = document.getElementById('petugas-register-form') as HTMLFormElement | null;
  const regRantingInput = document.getElementById('regRanting') as HTMLInputElement | null;
  const regRantingMark = document.getElementById('regRantingRequiredMark');
  const regStatusBox = document.getElementById('petugas-reg-status');
  const roleRadios = document.querySelectorAll<HTMLInputElement>('input[name="requestedRole"]');

  function syncRequestedRoleUI() {
    const selected = document.querySelector<HTMLInputElement>('input[name="requestedRole"]:checked')?.value || 'ranting';
    const isMwc = selected === 'mwcnu';
    if (regRantingInput) {
      regRantingInput.required = !isMwc;
      regRantingInput.placeholder = isMwc
        ? 'Opsional (mis. Bidang Ekonomi / LPNU MWC)'
        : 'Contoh: Gapura Barat / Pajagalan';
    }
    if (regRantingMark) {
      regRantingMark.classList.toggle('hidden', isMwc);
    }
  }

  if (roleRadios.length > 0) {
    roleRadios.forEach((r) => r.addEventListener('change', syncRequestedRoleUI));
    syncRequestedRoleUI();
  }

  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-petugas-reg') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim Pengajuan...';
    }

    try {
      const formData = new FormData(regForm);
      const res = await fetch('/api/petugas/register', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (regStatusBox) {
          regStatusBox.className = 'p-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200';
          regStatusBox.textContent = data.message || 'Pengajuan berhasil dikirim!';
          regStatusBox.classList.remove('hidden');
        }
        notify(data.message || 'Pengajuan berhasil dikirim!');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        if (regStatusBox) {
          regStatusBox.className = 'p-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200';
          regStatusBox.textContent = data.message || 'Gagal mengajukan permohonan.';
          regStatusBox.classList.remove('hidden');
        }
        notify(data.message || 'Gagal mengajukan permohonan.', true);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Kirim Pengajuan';
        }
      }
    } catch (err: any) {
      notify(err.message || 'Terjadi kesalahan jaringan.', true);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pengajuan';
      }
    }
  });

  // Promosi Iklan Berbayar & Kuota Token Sundul
  function initAdPromotionModal() {
    const modal = document.getElementById('modal-ad-promo');
    const promoTriggerBtns = document.querySelectorAll<HTMLButtonElement>('[data-trigger="open-promo"], #btn-open-promo-modal');
    const btnClose = document.getElementById('btn-close-ad-promo');
    const btnCancel = document.getElementById('btn-cancel-promo');
    const form = document.getElementById('form-order-promo') as HTMLFormElement | null;
    const tabFeatured = document.getElementById('tab-promo-featured');
    const tabBump = document.getElementById('tab-promo-bump');
    const secFeatured = document.getElementById('section-featured-fields');
    const secBump = document.getElementById('section-bump-fields');
    const selectedTypeInput = document.getElementById('selectedPromoType') as HTMLInputElement | null;
    const totalDisplay = document.getElementById('promo-total-display');
    const productSelect = document.getElementById('promoProductId') as HTMLSelectElement | null;
    const proofInput = document.getElementById('promoProofInput') as HTMLInputElement | null;
    const proofBase64 = document.getElementById('promoProofBase64') as HTMLInputElement | null;
    const compressInfo = document.getElementById('promo-compress-info');
    const modalAlert = document.getElementById('promo-modal-alert');
    const submitBtn = document.getElementById('btn-submit-promo-order') as HTMLButtonElement | null;
    const radioLabels = document.querySelectorAll<HTMLLabelElement>('.package-radio-label');

    if (!modal) return;

    function openPromoModal(category: 'featured' | 'bump' = 'featured', preselectedProductId?: string) {
      if (modal instanceof HTMLDialogElement) {
        openNativeDialog(modal);
      } else {
        modal?.classList.remove('hidden');
      }
      if (modalAlert) modalAlert.classList.add('hidden');
      switchCategory(category);
      if (preselectedProductId && productSelect) {
        productSelect.value = preselectedProductId;
      }
    }

    function closePromoModal() {
      if (modal instanceof HTMLDialogElement) {
        closeNativeDialog(modal);
      } else {
        modal?.classList.add('hidden');
      }
    }

    if (modal instanceof HTMLDialogElement) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closePromoModal();
      });
    }

    function switchCategory(category: 'featured' | 'bump') {
      if (category === 'featured') {
        tabFeatured?.classList.add('border-amber-500', 'text-amber-950');
        tabFeatured?.classList.remove('border-transparent', 'text-slate-500');
        tabBump?.classList.remove('border-amber-500', 'text-amber-950');
        tabBump?.classList.add('border-transparent', 'text-slate-500');
        secFeatured?.classList.remove('hidden');
        secBump?.classList.add('hidden');

        selectPackage('featured_14d');
      } else {
        tabBump?.classList.add('border-amber-500', 'text-amber-950');
        tabBump?.classList.remove('border-transparent', 'text-slate-500');
        tabFeatured?.classList.remove('border-amber-500', 'text-amber-950');
        tabFeatured?.classList.add('border-transparent', 'text-slate-500');
        secBump?.classList.remove('hidden');
        secFeatured?.classList.add('hidden');

        selectPackage('bump_pack_12');
      }
    }

    function selectPackage(pkgId: string) {
      radioLabels.forEach((label) => {
        const type = label.getAttribute('data-type');
        const radio = label.querySelector('input[type="radio"]') as HTMLInputElement | null;
        if (type === pkgId) {
          label.classList.add('border-amber-500', 'bg-amber-50/40', 'shadow-xs');
          label.classList.remove('border-slate-200');
          if (radio) radio.checked = true;
          if (selectedTypeInput) selectedTypeInput.value = pkgId;
          const price = Number(label.getAttribute('data-price') || 0);
          if (totalDisplay) {
            totalDisplay.textContent = 'Rp ' + price.toLocaleString('id-ID');
          }
        } else {
          label.classList.remove('border-amber-500', 'bg-amber-50/40', 'shadow-xs');
          label.classList.add('border-slate-200');
          if (radio) radio.checked = false;
        }
      });
    }

    promoTriggerBtns.forEach((btn) => {
      btn.addEventListener('click', () => openPromoModal('featured'));
    });
    btnClose?.addEventListener('click', closePromoModal);
    btnCancel?.addEventListener('click', closePromoModal);

    tabFeatured?.addEventListener('click', () => switchCategory('featured'));
    tabBump?.addEventListener('click', () => switchCategory('bump'));

    document.querySelectorAll<HTMLButtonElement>('[data-action="promote-single"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prodId = btn.getAttribute('data-id');
        openPromoModal('featured', prodId || undefined);
      });
    });

    radioLabels.forEach((label) => {
      label.addEventListener('click', () => {
        const pkgId = label.getAttribute('data-type');
        if (pkgId) selectPackage(pkgId);
      });
    });

    proofInput?.addEventListener('change', async () => {
      const file = proofInput.files?.[0];
      if (!file) return;

      if (compressInfo) {
        compressInfo.textContent = 'Mengompres foto bukti pembayaran...';
        compressInfo.className = 'text-xs text-amber-700 font-medium';
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          if (proofBase64) proofBase64.value = compressedBase64;

          const originalSizeKB = Math.round(file.size / 1024);
          const compressedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
          if (compressInfo) {
            compressInfo.textContent = `Bukti siap dikirim (${originalSizeKB} KB ke ${compressedSizeKB} KB)`;
            compressInfo.className = 'text-xs text-emerald-700 font-bold';
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (modalAlert) {
        modalAlert.className = 'hidden';
        modalAlert.textContent = '';
      }

      const hasProofFile = Boolean(proofInput?.files && proofInput.files.length > 0);
      const hasProofBase64 = Boolean(proofBase64?.value && proofBase64.value.includes(';base64,'));
      if (!hasProofFile && !hasProofBase64) {
        if (modalAlert) {
          modalAlert.className = 'm-4 p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 block';
          modalAlert.textContent = 'Unggah foto bukti pembayaran (QRIS / transfer) sebelum mengajukan promosi.';
        }
        proofInput?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim Pesanan...';
      }

      try {
        const formData = new FormData(form);
        const res = await fetch('/api/promotions/order', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          closePromoModal();
          notify('Alhamdulillah! Pesanan promosi iklan berhasil diajukan dan sedang diverifikasi admin.');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          if (modalAlert) {
            modalAlert.className = 'm-4 p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 block';
            modalAlert.textContent = data.message || 'Gagal mengajukan promosi iklan.';
          }
        }
      } catch (err: any) {
        if (modalAlert) {
          modalAlert.className = 'm-4 p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 block';
          modalAlert.textContent = 'Kendala server: ' + err.message;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Konfirmasi & Ajukan Iklan';
        }
      }
    });

    (window as any).openPromoModal = openPromoModal;
  }

  function initPrivacyAccountControls() {
    const toggleBtn = document.getElementById('btn-toggle-delete-account');
    const box = document.getElementById('delete-account-box');
    const form = document.getElementById('delete-account-form') as HTMLFormElement | null;
    const statusBox = document.getElementById('delete-account-status');
    const confirmInput = document.getElementById('deleteConfirmInput') as HTMLInputElement | null;
    const submitBtn = document.getElementById('btn-confirm-delete-account') as HTMLButtonElement | null;

    toggleBtn?.addEventListener('click', () => {
      if (!box) return;
      const hidden = box.classList.toggle('hidden');
      toggleBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      if (!hidden) confirmInput?.focus();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const confirmText = confirmInput?.value.trim() || '';
      if (confirmText !== 'HAPUS') {
        if (statusBox) {
          statusBox.textContent = 'Ketik HAPUS dengan huruf kapital untuk mengonfirmasi penghapusan akun.';
          statusBox.className = 'p-2.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 block';
        }
        confirmInput?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menghapus Akun...';
      }

      try {
        const res = await fetch('/api/user/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmText }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          try {
            localStorage.removeItem('mamasar_favorites');
          } catch {}
          window.location.href = '/?account_deleted=1';
          return;
        }
        if (statusBox) {
          statusBox.textContent = data.message || 'Gagal menghapus akun.';
          statusBox.className = 'p-2.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 block';
        }
      } catch {
        if (statusBox) {
          statusBox.textContent = 'Terjadi gangguan jaringan saat menghapus akun.';
          statusBox.className = 'p-2.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ya, Hapus Akun Permanen';
        }
      }
    });
  }

  // Initialize features
  initAdPromotionModal();
  initPrivacyAccountControls();
  initTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardClient);
} else {
  initDashboardClient();
}
