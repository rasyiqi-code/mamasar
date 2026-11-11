// Client-side Interactive Logic for Modern SaaS Admin Portal

export function initAdminClient() {
  // Tab switching logic via Sidebar & URL hash
  function initTabs() {
    const tabBtns = document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]');
    const panels = document.querySelectorAll<HTMLElement>('.admin-tab-panel');

    function switchTab(targetName: string) {
      tabBtns.forEach((btn) => {
        if (btn.getAttribute('data-admin-tab') === targetName) {
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
        const tabName = btn.getAttribute('data-admin-tab');
        if (tabName) {
          switchTab(tabName);
          window.location.hash = tabName;
        }
      });
    });

    const currentHash = window.location.hash.replace('#', '');
    if (['agents', 'stores', 'entry', 'events', 'zones'].includes(currentHash)) {
      switchTab(currentHash);
    }
  }

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-admin-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-admin-sidebar');

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

  // Status notification helper
  function notify(msg: string, isError = false) {
    if ((window as any).showAppToast) {
      (window as any).showAppToast(msg, isError);
    } else {
      const statusBox = document.getElementById('admin-status-box');
      if (statusBox) {
        statusBox.className = isError
          ? 'p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200'
          : 'p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200';
        statusBox.textContent = msg;
        statusBox.classList.remove('hidden');
        setTimeout(() => statusBox.classList.add('hidden'), 4000);
      }
    }
  }

  // Handle Petugas Review (Approve/Reject)
  document.querySelectorAll<HTMLButtonElement>('[data-action="review-agent"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      const decision = btn.dataset.decision;
      if (!userId || !decision) return;

      btn.disabled = true;
      btn.textContent = 'Memproses...';

      try {
        const form = new FormData();
        form.set('userId', userId);
        form.set('action', decision);

        const res = await fetch('/api/admin/petugas/action', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          notify(data.message || 'Permohonan petugas berhasil diproses.');
          setTimeout(() => window.location.reload(), 900);
        } else {
          notify(data.message || 'Gagal memproses permohonan petugas.', true);
          btn.disabled = false;
        }
      } catch (err: any) {
        notify(err.message || 'Terjadi kesalahan jaringan.', true);
        btn.disabled = false;
      }
    });
  });

  // Handle Verify Store
  document.querySelectorAll<HTMLButtonElement>('[data-action="verify-store"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const umkmId = btn.dataset.id;
      const verified = btn.dataset.verified || '1';
      if (!umkmId) return;

      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      try {
        const form = new FormData();
        form.set('umkmId', umkmId);
        form.set('verified', verified);

        const res = await fetch('/api/umkm/verify', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          notify(data.message || 'Status verifikasi berhasil diperbarui.');
          setTimeout(() => window.location.reload(), 900);
        } else {
          notify(data.message || 'Gagal mengubah status verifikasi.', true);
          btn.disabled = false;
        }
      } catch (err: any) {
        notify(err.message || 'Terjadi kesalahan jaringan.', true);
        btn.disabled = false;
      }
    });
  });

  // Handle Delete Store
  document.querySelectorAll<HTMLButtonElement>('[data-action="delete-store"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const umkmId = btn.dataset.id;
      const name = btn.dataset.name || 'toko ini';
      if (!umkmId) return;

      if (!confirm(`Hapus toko "${name}" beserta seluruh produknya? Tindakan ini tidak dapat dibatalkan.`)) {
        return;
      }

      try {
        const form = new FormData();
        form.set('umkmId', umkmId);

        const res = await fetch('/api/umkm/delete', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          notify(data.message || 'Toko berhasil dihapus.');
          setTimeout(() => window.location.reload(), 900);
        } else {
          notify(data.message || 'Gagal menghapus toko.', true);
        }
      } catch (err: any) {
        notify(err.message || 'Terjadi kesalahan jaringan.', true);
      }
    });
  });

  // --- EVENT MANAGEMENT MODAL & CRUD ---
  const eventModal = document.getElementById('modal-event');
  const btnOpenAddEvent = document.getElementById('btn-open-add-event');
  const btnCloseEventModal = document.getElementById('btn-close-event-modal');
  const eventForm = document.getElementById('admin-event-form') as HTMLFormElement | null;
  const eventFormTitle = document.getElementById('modal-event-title');
  const adminEventAction = document.getElementById('adminEventAction') as HTMLInputElement | null;
  const adminEventId = document.getElementById('adminEventId') as HTMLInputElement | null;

  let adminEvents: any[] = [];
  try {
    const rawEvents = document.getElementById('admin-events-json')?.textContent || '[]';
    adminEvents = JSON.parse(rawEvents);
  } catch {
    adminEvents = [];
  }

  function openEventModal() {
    eventModal?.classList.remove('hidden');
  }

  function closeEventModal() {
    eventModal?.classList.add('hidden');
  }

  function resetEventForm() {
    eventForm?.reset();
    if (adminEventAction) adminEventAction.value = 'create';
    if (adminEventId) adminEventId.value = '';
    if (eventFormTitle) eventFormTitle.textContent = 'Publikasikan Agenda Baru';
    const allowStalls = document.getElementById('adminEvAllowStalls') as HTMLInputElement | null;
    if (allowStalls) allowStalls.checked = true;
  }

  btnOpenAddEvent?.addEventListener('click', () => {
    resetEventForm();
    openEventModal();
  });

  btnCloseEventModal?.addEventListener('click', closeEventModal);
  eventModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeEventModal);

  // Edit Event trigger
  document.querySelectorAll<HTMLButtonElement>('[data-action="edit-event"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      const ev = adminEvents.find((e) => e.id === id);
      if (!ev) return;

      if (adminEventAction) adminEventAction.value = 'update';
      if (adminEventId) adminEventId.value = String(ev.id);
      if (eventFormTitle) eventFormTitle.textContent = `Ubah Agenda: ${ev.title}`;

      const titleInput = document.getElementById('adminEvTitle') as HTMLInputElement | null;
      const orgInput = document.getElementById('adminEvOrganizer') as HTMLInputElement | null;
      const zoneSelect = document.getElementById('adminEvZone') as HTMLSelectElement | null;
      const dateInput = document.getElementById('adminEvDate') as HTMLInputElement | null;
      const timeDescInput = document.getElementById('adminEvTimeDesc') as HTMLInputElement | null;
      const locNameInput = document.getElementById('adminEvLocationName') as HTMLInputElement | null;
      const locAddrInput = document.getElementById('adminEvLocationAddress') as HTMLInputElement | null;
      const attendInput = document.getElementById('adminEvAttendance') as HTMLInputElement | null;
      const coordNameInput = document.getElementById('adminEvCoordinatorName') as HTMLInputElement | null;
      const coordPhoneInput = document.getElementById('adminEvCoordinatorPhone') as HTMLInputElement | null;
      const consumInput = document.getElementById('adminEvConsumption') as HTMLTextAreaElement | null;
      const stallsInput = document.getElementById('adminEvAllowStalls') as HTMLInputElement | null;

      if (titleInput) titleInput.value = ev.title;
      if (orgInput) orgInput.value = ev.organizer;
      if (zoneSelect) zoneSelect.value = String(ev.zone_id);
      if (dateInput && ev.event_date) dateInput.value = ev.event_date.slice(0, 16);
      if (timeDescInput) timeDescInput.value = ev.time_description;
      if (locNameInput) locNameInput.value = ev.location_name;
      if (locAddrInput) locAddrInput.value = ev.location_address || '';
      if (attendInput) attendInput.value = String(ev.estimated_attendance || '');
      if (coordNameInput) coordNameInput.value = ev.coordinator_name || '';
      if (coordPhoneInput) coordPhoneInput.value = ev.coordinator_phone || '';
      if (consumInput) consumInput.value = ev.consumption_needed || '';
      if (stallsInput) stallsInput.checked = Boolean(ev.allow_stalls);

      openEventModal();
    });
  });

  // Submit Event Form (create or update)
  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-admin-event') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const formData = new FormData(eventForm);
      const res = await fetch('/api/events', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        closeEventModal();
        notify(data.message || 'Agenda berhasil disimpan!');
        setTimeout(() => window.location.reload(), 900);
      } else {
        notify(data.message || 'Gagal menyimpan agenda.', true);
      }
    } catch (err: any) {
      notify('Kendala jaringan: ' + err.message, true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Delete Event
  document.querySelectorAll<HTMLButtonElement>('[data-action="delete-event"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title') || 'agenda ini';
      if (!confirm(`Hapus agenda "${title}" dari daftar kegiatan?`)) return;

      try {
        const body = new FormData();
        body.set('action', 'delete');
        body.set('eventId', id || '');

        const res = await fetch('/api/events', { method: 'POST', body });
        const data = await res.json();
        if (res.ok && data.success) {
          notify(data.message || 'Agenda berhasil dihapus.');
          const row = document.getElementById(`event-row-${id}`);
          row?.remove();
        } else {
          notify(data.message || 'Gagal menghapus agenda.', true);
        }
      } catch (err: any) {
        notify('Kendala jaringan: ' + err.message, true);
      }
    });
  });

  // --- JEMPUT BOLA ENTRY (CAMERA COMPRESSION & PRODUCT SUBMISSION) ---
  const cameraInput = document.getElementById('petugas-camera-input') as HTMLInputElement | null;
  const base64Input = document.getElementById('entryImageBase64') as HTMLInputElement | null;
  const compressInfo = document.getElementById('petugas-compress-info');
  const entryForm = document.getElementById('petugas-entry-form') as HTMLFormElement | null;
  const btnSaveAndAddMore = document.getElementById('btn-save-and-add-more');
  let keepStore = false;

  cameraInput?.addEventListener('change', () => {
    const file = cameraInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        if (base64Input) base64Input.value = compressed;
        if (compressInfo) compressInfo.textContent = '✓ Foto berhasil terkompresi otomatis.';
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

  btnSaveAndAddMore?.addEventListener('click', () => {
    keepStore = true;
    entryForm?.requestSubmit();
  });

  entryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-entry') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan Produk...';
    }

    try {
      const formData = new FormData(entryForm);
      const res = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        notify('Alhamdulillah! Produk berhasil diterbitkan ke katalog Pasar NU.');

        if (keepStore) {
          const nameInput = document.getElementById('productName') as HTMLInputElement | null;
          const priceInput = document.getElementById('prodPrice') as HTMLInputElement | null;
          const descInput = document.getElementById('prodDesc') as HTMLTextAreaElement | null;
          if (nameInput) nameInput.value = '';
          if (priceInput) priceInput.value = '';
          if (descInput) descInput.value = '';
          if (base64Input) base64Input.value = '';
          if (cameraInput) cameraInput.value = '';
          if (compressInfo) compressInfo.textContent = '';
          keepStore = false;
        } else {
          entryForm.reset();
          if (base64Input) base64Input.value = '';
          if (compressInfo) compressInfo.textContent = '';
        }
      } else {
        notify(data.message || 'Gagal menerbitkan iklan produk.', true);
      }
    } catch (err: any) {
      notify(err.message || 'Terjadi kesalahan jaringan.', true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Terbitkan Iklan Produk ➔';
      }
    }
  });

  initTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminClient);
} else {
  initAdminClient();
}
