// Client-side Interactive Logic for Modern SaaS Admin Portal
import { confirmAction, openConfirmDialog, openNativeDialog, closeNativeDialog } from '../../lib/dialog';

export function initAdminClient() {
  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  const btnToggleSidebar = document.getElementById('btn-toggle-admin-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-admin-sidebar');

  function openSidebar() {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
    btnToggleSidebar?.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
    btnToggleSidebar?.setAttribute('aria-expanded', 'false');
  }

  btnToggleSidebar?.addEventListener('click', openSidebar);
  btnCloseSidebar?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && !sidebar.classList.contains('-translate-x-full')) {
      closeSidebar();
      btnToggleSidebar?.focus();
    }
  });

  // Tab switching logic via Sidebar, keyboard arrows & URL hash (history.replaceState)
  function initTabs() {
    const tabBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]'));
    const panels = document.querySelectorAll<HTMLElement>('.admin-tab-panel');
    const desktopTitleEl = document.getElementById('admin-desktop-title');
    const mobileTitleEl = document.getElementById('admin-mobile-title');
    const quickEntryBtn = document.getElementById('admin-quick-entry-btn');
    const canShowQuickEntry = Boolean(quickEntryBtn && !quickEntryBtn.classList.contains('hidden'));
    const headerGroups = Array.from(document.querySelectorAll<HTMLElement>('[data-admin-header-group]'));
    const jumpTabBtns = Array.from(document.querySelectorAll<HTMLElement>('[data-jump-admin-tab]'));

    function switchTab(targetName: string, syncUrl = false) {
      let activeLabel = '';

      tabBtns.forEach((btn) => {
        const isActive = btn.getAttribute('data-admin-tab') === targetName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive && !activeLabel) {
          activeLabel = btn.getAttribute('data-admin-label') || '';
        }
      });

      panels.forEach((p) => {
        if (p.id === `panel-${targetName}`) {
          p.classList.remove('hidden');
        } else {
          p.classList.add('hidden');
        }
      });

      if (activeLabel) {
        if (desktopTitleEl) desktopTitleEl.textContent = activeLabel;
        if (mobileTitleEl) mobileTitleEl.textContent = activeLabel;
      }

      const activeGroupKey = ['agents', 'events', 'entry'].includes(targetName) ? targetName : 'default';
      headerGroups.forEach((group) => {
        group.classList.toggle('hidden', group.getAttribute('data-admin-header-group') !== activeGroupKey);
      });

      if (quickEntryBtn && canShowQuickEntry) {
        const showBtn = targetName !== 'entry';
        quickEntryBtn.classList.toggle('hidden', !showBtn);
        quickEntryBtn.classList.toggle('inline-flex', showBtn);
      }

      if (syncUrl) {
        history.replaceState(null, '', `#${targetName}`);
      }

      closeSidebar();
    }

    tabBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-admin-tab');
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
          const tabName = nextBtn.getAttribute('data-admin-tab');
          if (tabName) switchTab(tabName, true);
          nextBtn.focus();
        }
      });
    });

    jumpTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-jump-admin-tab');
        if (target) switchTab(target, true);
      });
    });

    const currentHash = window.location.hash.replace('#', '');
    if (['agents', 'stores', 'entry', 'events', 'promotions', 'zones'].includes(currentHash)) {
      const targetPanelExists = document.getElementById(`panel-${currentHash}`) !== null;
      if (targetPanelExists) {
        switchTab(currentHash, false);
      }
    }
  }

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

  // Handle Petugas / Pengurus Review (Approve with selected role / Reject)
  document.querySelectorAll<HTMLButtonElement>('[data-action="review-agent"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      const decision = btn.dataset.decision;
      if (!userId || !decision) return;

      const originalLabel = btn.textContent || 'Proses';
      btn.disabled = true;
      btn.textContent = 'Memproses...';

      try {
        const form = new FormData();
        form.set('userId', userId);
        form.set('action', decision);

        const roleSelect = document.querySelector<HTMLSelectElement>(`[data-role-select-for="${userId}"]`);
        if (decision === 'approve' && roleSelect?.value) {
          form.set('role', roleSelect.value);
        }

        const res = await fetch('/api/admin/petugas/action', {
          method: 'POST',
          body: form,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          notify(data.message || 'Permohonan berhasil diproses.');
          setTimeout(() => window.location.reload(), 900);
        } else {
          notify(data.message || 'Gagal memproses permohonan.', true);
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      } catch (err: any) {
        notify(err.message || 'Terjadi kesalahan jaringan.', true);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });

  // Fallback light-dismiss for browsers without native dialog `closedby="any"`
  function attachDialogLightDismiss(dialog: HTMLDialogElement | null) {
    dialog?.addEventListener('click', (e) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (e.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const clickedInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!clickedInDialog) closeNativeDialog(dialog);
    });
  }

  // Form Daftarkan / Tetapkan Akun Peran Khusus (Modal PCNU)
  function initAdminUserManagement() {
    const addUserModal = document.getElementById('modal-add-user') as HTMLDialogElement | null;
    const openAddUserBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-open-add-user]'));
    const btnCloseAddUser = document.getElementById('btn-close-add-user-modal');
    const btnCancelAddUser = document.getElementById('btn-cancel-add-user-modal');
    const addUserForm = document.getElementById('form-admin-add-user') as HTMLFormElement | null;
    const addUserRole = document.getElementById('addUserRole') as HTMLSelectElement | null;
    const addUserZone = document.getElementById('addUserZone') as HTMLSelectElement | null;
    const addUserZoneMark = document.getElementById('addUserZoneRequiredMark');
    const addUserStatus = document.getElementById('admin-add-user-status');
    const addUserBtn = document.getElementById('btn-admin-add-user') as HTMLButtonElement | null;

    function resetAddUserForm() {
      addUserForm?.reset();
      if (addUserStatus) {
        addUserStatus.textContent = '';
        addUserStatus.classList.add('hidden');
      }
      if (addUserBtn) {
        addUserBtn.disabled = false;
        addUserBtn.textContent = 'Simpan & Tetapkan Akun';
      }
      syncAddUserZoneReq();
    }

    openAddUserBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        resetAddUserForm();
        openNativeDialog(addUserModal);
      });
    });
    btnCloseAddUser?.addEventListener('click', () => closeNativeDialog(addUserModal));
    btnCancelAddUser?.addEventListener('click', () => closeNativeDialog(addUserModal));
    attachDialogLightDismiss(addUserModal);

    function syncAddUserZoneReq() {
      if (!addUserRole || !addUserZone) return;
      const needsZone = addUserRole.value === 'ranting' || addUserRole.value === 'mwcnu';
      addUserZone.required = needsZone;
      if (addUserZoneMark) addUserZoneMark.classList.toggle('hidden', !needsZone);
    }

    if (addUserRole) {
      addUserRole.addEventListener('change', syncAddUserZoneReq);
      syncAddUserZoneReq();
    }

    addUserForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (addUserBtn) {
        addUserBtn.disabled = true;
        addUserBtn.textContent = 'Menyimpan...';
      }

      try {
        const formData = new FormData(addUserForm);
        const res = await fetch('/api/admin/users/role', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (addUserStatus) {
            addUserStatus.className = 'p-2.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200';
            addUserStatus.textContent = data.message || 'Akun berhasil ditetapkan.';
            addUserStatus.classList.remove('hidden');
          }
          notify(data.message || 'Akun berhasil ditetapkan.');
          closeNativeDialog(addUserModal);
          setTimeout(() => window.location.reload(), 900);
        } else {
          if (addUserStatus) {
            addUserStatus.className = 'p-2.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200';
            addUserStatus.textContent = data.message || 'Gagal menetapkan peran akun.';
            addUserStatus.classList.remove('hidden');
          }
          notify(data.message || 'Gagal menetapkan peran akun.', true);
          if (addUserBtn) {
            addUserBtn.disabled = false;
            addUserBtn.textContent = 'Simpan & Tetapkan Akun';
          }
        }
      } catch (err: any) {
        notify(err.message || 'Terjadi kesalahan jaringan.', true);
        if (addUserBtn) {
          addUserBtn.disabled = false;
          addUserBtn.textContent = 'Simpan & Tetapkan Akun';
        }
      }
    });

    // Filter Direktori Pengguna
    const searchInput = document.getElementById('user-directory-search') as HTMLInputElement | null;
    const roleFilter = document.getElementById('user-directory-role-filter') as HTMLSelectElement | null;
    const countLabel = document.getElementById('user-directory-count');
    const userEmptyRow = document.getElementById('user-directory-empty');
    const userRows = Array.from(document.querySelectorAll<HTMLTableRowElement>('[data-user-row]'));

    function filterUserRows() {
      const q = (searchInput?.value || '').trim().toLowerCase();
      const roleVal = roleFilter?.value || '';
      let visible = 0;

      userRows.forEach((row) => {
        const rowSearch = row.dataset.search || '';
        const rowRole = row.dataset.role || '';
        const matchSearch = !q || rowSearch.includes(q);
        const matchRole = !roleVal || rowRole === roleVal;
        const show = matchSearch && matchRole;
        row.classList.toggle('hidden', !show);
        if (show) visible += 1;
      });

      if (countLabel) {
        countLabel.textContent = `${visible}/${userRows.length} akun`;
      }
      if (userEmptyRow) {
        userEmptyRow.classList.toggle('hidden', visible > 0 || userRows.length === 0);
      }
    }

    searchInput?.addEventListener('input', filterUserRows);
    roleFilter?.addEventListener('change', filterUserRows);

    // Filter Direktori Toko (Search + Status Pills)
    const storeSearchInput = document.getElementById('store-directory-search') as HTMLInputElement | null;
    const storeFilterBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.store-filter-btn[data-store-filter]'));
    const storeRows = Array.from(document.querySelectorAll<HTMLElement>('[data-store-row]'));
    const pendingSection = document.getElementById('stores-section-pending');
    const verifiedSection = document.getElementById('stores-section-verified');
    const storeEmptyState = document.getElementById('store-directory-empty');
    let activeStoreFilter = 'all';

    function filterStores() {
      const q = (storeSearchInput?.value || '').trim().toLowerCase();
      let visiblePending = 0;
      let visibleVerified = 0;

      storeRows.forEach((row) => {
        const rowSearch = row.dataset.search || '';
        const rowStatus = row.dataset.storeStatus || '';
        const matchSearch = !q || rowSearch.includes(q);
        const matchFilter = activeStoreFilter === 'all' || rowStatus === activeStoreFilter;
        const show = matchSearch && matchFilter;
        row.classList.toggle('hidden', !show);
        if (show) {
          if (rowStatus === 'pending') visiblePending += 1;
          else if (rowStatus === 'verified') visibleVerified += 1;
        }
      });

      const totalVisible = visiblePending + visibleVerified;
      const showEmptySearch = totalVisible === 0 && (q !== '' || storeRows.length > 0 && activeStoreFilter !== 'all' && ((activeStoreFilter === 'pending' && visiblePending === 0 && pendingSection?.querySelector('[data-store-row]') !== null) || (activeStoreFilter === 'verified' && visibleVerified === 0 && verifiedSection?.querySelector('[data-store-row]') !== null)));

      if (pendingSection) {
        const hidePending =
          activeStoreFilter === 'verified' ||
          (q !== '' && visiblePending === 0) ||
          Boolean(showEmptySearch);
        pendingSection.classList.toggle('hidden', hidePending);
      }

      if (verifiedSection) {
        const hideVerified =
          activeStoreFilter === 'pending' ||
          (q !== '' && visibleVerified === 0) ||
          Boolean(showEmptySearch);
        verifiedSection.classList.toggle('hidden', hideVerified);
      }

      if (storeEmptyState) {
        const showEmpty = q !== '' ? totalVisible === 0 : Boolean(showEmptySearch);
        storeEmptyState.classList.toggle('hidden', !showEmpty);
      }
    }

    storeRows.forEach((row) => {
      const headerTrigger = row.querySelector<HTMLElement>('[data-store-header]');
      const toggleBtn = row.querySelector<HTMLButtonElement>('[data-store-toggle]');
      const chevronEl = row.querySelector<HTMLElement>('[data-store-chevron]');
      const actionsPanel = row.querySelector<HTMLElement>('[data-store-actions]');
      if (!headerTrigger || !actionsPanel) return;

      headerTrigger.addEventListener('click', () => {
        if (!window.matchMedia('(max-width: 639px)').matches) return;
        const isOpen = toggleBtn?.getAttribute('aria-expanded') === 'true';
        const nextOpen = !isOpen;

        if (nextOpen) {
          actionsPanel.classList.remove('hidden');
          actionsPanel.classList.add('grid', 'grid-cols-[1fr_1fr_32px]');
        } else {
          actionsPanel.classList.add('hidden');
          actionsPanel.classList.remove('grid', 'grid-cols-[1fr_1fr_32px]');
        }
        toggleBtn?.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        chevronEl?.classList.toggle('rotate-180', nextOpen);
      });
    });

    storeFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeStoreFilter = btn.getAttribute('data-store-filter') || 'all';
        storeFilterBtns.forEach((b) => {
          const isSelected = b === btn;
          b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
          b.classList.toggle('bg-slate-900', isSelected);
          b.classList.toggle('text-white', isSelected);
          b.classList.toggle('border-slate-900', isSelected);
          b.classList.toggle('bg-white', !isSelected);
          b.classList.toggle('text-slate-700', !isSelected);
          b.classList.toggle('hover:text-slate-900', !isSelected);
          b.classList.toggle('border-slate-300', !isSelected);
        });
        filterStores();
      });
    });

    storeSearchInput?.addEventListener('input', filterStores);

    // Simpan perubahan peran per baris
    document.querySelectorAll<HTMLButtonElement>('[data-action="save-user-role"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.id;
        if (!userId) return;

        const roleSelect = document.querySelector<HTMLSelectElement>(`[data-user-role-select][data-id="${userId}"]`);
        const zoneSelect = document.querySelector<HTMLSelectElement>(`[data-user-zone-select][data-id="${userId}"]`);
        const rantingInput = document.querySelector<HTMLInputElement>(`[data-user-ranting-input][data-id="${userId}"]`);
        if (!roleSelect) return;

        const role = roleSelect.value;
        const zoneId = zoneSelect?.value || '';
        const ranting = rantingInput?.value || '';

        if ((role === 'ranting' || role === 'mwcnu') && !zoneId) {
          notify('Pilih Wilayah MWC NU terlebih dahulu untuk Kader Ranting atau Pengurus MWC.', true);
          zoneSelect?.focus();
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
          const form = new FormData();
          form.set('mode', 'update');
          form.set('userId', userId);
          form.set('role', role);
          form.set('zoneId', zoneId);
          form.set('ranting', ranting);

          const res = await fetch('/api/admin/users/role', {
            method: 'POST',
            body: form,
          });
          const data = await res.json();

          if (res.ok && data.success) {
            notify(data.message || 'Peran pengguna berhasil diperbarui.');
            setTimeout(() => window.location.reload(), 900);
          } else {
            notify(data.message || 'Gagal memperbarui peran pengguna.', true);
            btn.disabled = false;
            btn.textContent = 'Simpan';
          }
        } catch (err: any) {
          notify(err.message || 'Terjadi kesalahan jaringan.', true);
          btn.disabled = false;
          btn.textContent = 'Simpan';
        }
      });
    });
  }
  initAdminUserManagement();

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

      const confirmed = await confirmAction({
        title: 'Hapus Toko Warga',
        message: `Hapus toko "${name}" beserta seluruh produknya? Tindakan ini tidak dapat dibatalkan.`,
        confirmLabel: 'Ya, Hapus Toko',
        tone: 'danger',
      });
      if (!confirmed) {
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
  const eventModal = document.getElementById('modal-event') as HTMLDialogElement | null;
  const openAddEventBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-open-add-event]'));
  const btnCloseEventModal = document.getElementById('btn-close-event-modal');
  const btnCancelEventModal = document.getElementById('btn-cancel-event-modal');
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
    openNativeDialog(eventModal);
  }

  function closeEventModal() {
    closeNativeDialog(eventModal);
  }

  function resetEventForm() {
    eventForm?.reset();
    if (adminEventAction) adminEventAction.value = 'create';
    if (adminEventId) adminEventId.value = '';
    if (eventFormTitle) eventFormTitle.textContent = 'Publikasikan Agenda Baru';
    const allowStalls = document.getElementById('adminEvStalls') as HTMLSelectElement | null;
    if (allowStalls) allowStalls.value = '1';
  }

  openAddEventBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      resetEventForm();
      openEventModal();
    });
  });

  btnCloseEventModal?.addEventListener('click', closeEventModal);
  btnCancelEventModal?.addEventListener('click', closeEventModal);
  attachDialogLightDismiss(eventModal);

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
      const timeDescInput = document.getElementById('adminEvTime') as HTMLInputElement | null;
      const locNameInput = document.getElementById('adminEvLocation') as HTMLInputElement | null;
      const locAddrInput = document.getElementById('adminEvAddress') as HTMLInputElement | null;
      const attendInput = document.getElementById('adminEvAttendance') as HTMLInputElement | null;
      const coordNameInput = document.getElementById('adminEvCoordinator') as HTMLInputElement | null;
      const coordPhoneInput = document.getElementById('adminEvPhone') as HTMLInputElement | null;
      const consumInput = document.getElementById('adminEvConsumption') as HTMLInputElement | null;
      const stallsSelect = document.getElementById('adminEvStalls') as HTMLSelectElement | null;

      if (titleInput) titleInput.value = ev.title;
      if (orgInput) orgInput.value = ev.organizer;
      if (zoneSelect) zoneSelect.value = String(ev.zone_id);
      if (dateInput && ev.event_date) dateInput.value = ev.event_date.slice(0, 10);
      if (timeDescInput) timeDescInput.value = ev.time_description;
      if (locNameInput) locNameInput.value = ev.location_name;
      if (locAddrInput) locAddrInput.value = ev.location_address || '';
      if (attendInput) attendInput.value = String(ev.estimated_attendance || '');
      if (coordNameInput) coordNameInput.value = ev.coordinator_name || '';
      if (coordPhoneInput) coordPhoneInput.value = ev.coordinator_phone || '';
      if (consumInput) consumInput.value = ev.consumption_needed || '';
      if (stallsSelect) stallsSelect.value = ev.allow_stalls ? '1' : '0';

      openEventModal();
    });
  });

  // Submit Event Form (create or update)
  eventForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-event') as HTMLButtonElement | null;
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
      const confirmed = await confirmAction({
        title: 'Hapus Agenda Kegiatan',
        message: `Hapus agenda "${title}" dari daftar kegiatan?`,
        confirmLabel: 'Ya, Hapus Agenda',
        tone: 'danger',
      });
      if (!confirmed) return;

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

  // Event Orders (Accept / Reject)
  document.querySelectorAll<HTMLButtonElement>('[data-action="event-order-status"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = Number(btn.getAttribute('data-id'));
      const status = btn.getAttribute('data-status') as 'accepted' | 'rejected' | null;
      if (!orderId || (status !== 'accepted' && status !== 'rejected')) return;

      btn.disabled = true;
      try {
        const res = await fetch('/api/events/order', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          notify(data.message || 'Status pengajuan diperbarui.');
          setTimeout(() => window.location.reload(), 700);
        } else {
          notify(data.message || 'Gagal memperbarui status pengajuan.', true);
          btn.disabled = false;
        }
      } catch (err: any) {
        notify('Kendala jaringan: ' + err.message, true);
        btn.disabled = false;
      }
    });
  });

  // --- JEMPUT BOLA ENTRY (2-STEP FLOW) ---
  const step1Indicator = document.getElementById('step1-indicator');
  const step1Badge = document.getElementById('step1-badge');
  const step2Indicator = document.getElementById('step2-indicator');
  const step2Badge = document.getElementById('step2-badge');
  const step2Title = document.getElementById('step2-title');

  const step1Container = document.getElementById('jemput-step-1');
  const step2Container = document.getElementById('jemput-step-2');
  const jemputAlertBox = document.getElementById('jemput-alert-box');

  const sectionStorePicker = document.getElementById('section-store-picker');
  const storePickerSearchInput = document.getElementById('store-picker-search') as HTMLInputElement | null;
  const storePickerCount = document.getElementById('store-picker-count');
  const storePickerList = document.getElementById('store-picker-list');
  const pickStoreBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-pick-store]'));
  const storePickerEmpty = document.getElementById('store-picker-empty');
  const storePickerEmptyText = document.getElementById('store-picker-empty-text');
  const storePickerFooter = document.getElementById('store-picker-footer');
  const btnEmptyCreateStore = document.getElementById('btn-empty-create-store');
  const btnEmptyCreateStoreLabel = document.getElementById('btn-empty-create-store-label');
  const btnShowNewStoreForm = document.getElementById('btn-show-new-store-form');
  const btnBackToStorePicker = document.getElementById('btn-back-to-store-picker');

  const formStep1Store = document.getElementById('form-petugas-step1-store') as HTMLFormElement | null;
  const umkmNameInput = document.getElementById('umkmName') as HTMLInputElement | null;
  const storePhoneInput = document.getElementById('storePhone') as HTMLInputElement | null;
  const btnSubmitStep1 = document.getElementById('btn-submit-step1') as HTMLButtonElement | null;

  const activeStoreName = document.getElementById('active-store-name');
  const activeStoreZone = document.getElementById('active-store-zone');
  const activeStorePhone = document.getElementById('active-store-phone');
  const sessionProductCounter = document.getElementById('session-product-counter');
  const btnBackToStep1 = document.getElementById('btn-back-to-step1');

  const formStep2Product = document.getElementById('form-petugas-step2-product') as HTMLFormElement | null;
  const step2UmkmIdInput = document.getElementById('step2UmkmId') as HTMLInputElement | null;
  const cameraInput = document.getElementById('petugas-camera-input') as HTMLInputElement | null;
  const galleryInput = document.getElementById('petugas-gallery-input') as HTMLInputElement | null;
  const base64Input = document.getElementById('entryImageBase64') as HTMLInputElement | null;
  const galleryImagesInput = document.getElementById('entryGalleryImages') as HTMLInputElement | null;
  const compressInfo = document.getElementById('petugas-compress-info');
  const photosGrid = document.getElementById('petugas-photos-grid');
  const photoCounter = document.getElementById('petugas-photo-counter');
  const uploadBoxes = document.getElementById('petugas-upload-boxes');
  const btnSaveAndAddMore = document.getElementById('btn-save-and-add-more');
  const btnSubmitStep2 = document.getElementById('btn-submit-step2') as HTMLButtonElement | null;

  let currentStore: { id: number; name: string; phone: string; zoneName: string } | null = null;
  let sessionProductCount = 0;
  let petugasPhotos: string[] = [];
  let isAddMoreMode = false;

  function showJemputAlert(msg: string, isError = false) {
    if (!jemputAlertBox) return;
    jemputAlertBox.textContent = msg;
    jemputAlertBox.classList.remove('hidden', 'bg-rose-50', 'text-rose-900', 'border-rose-200', 'bg-emerald-50', 'text-emerald-950', 'border-emerald-200');
    if (isError) {
      jemputAlertBox.classList.add('bg-rose-50', 'text-rose-900', 'border-rose-200');
    } else {
      jemputAlertBox.classList.add('bg-emerald-50', 'text-emerald-950', 'border-emerald-200');
    }
    jemputAlertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openNewStoreForm(prefillName = '') {
    sectionStorePicker?.classList.add('hidden');
    formStep1Store?.classList.remove('hidden');
    const cleanName = prefillName.trim();
    if (cleanName && umkmNameInput) {
      umkmNameInput.value = cleanName;
      storePhoneInput?.focus();
    } else {
      umkmNameInput?.focus();
    }
  }

  function openStorePicker() {
    formStep1Store?.classList.add('hidden');
    sectionStorePicker?.classList.remove('hidden');
    storePickerSearchInput?.focus();
  }

  function filterStorePicker() {
    const rawQuery = (storePickerSearchInput?.value || '').trim();
    const q = rawQuery.toLowerCase();
    let visible = 0;

    pickStoreBtns.forEach((btn) => {
      const hay = btn.getAttribute('data-search') || '';
      const matched = !q || hay.includes(q);
      btn.classList.toggle('hidden', !matched);
      btn.classList.toggle('flex', matched);
      if (matched) visible += 1;
    });

    if (storePickerCount) {
      storePickerCount.textContent = q
        ? `${visible} dari ${pickStoreBtns.length} toko`
        : `${pickStoreBtns.length} toko`;
    }

    const noMatches = visible === 0;
    storePickerList?.classList.toggle('hidden', noMatches);
    storePickerFooter?.classList.toggle('hidden', noMatches);
    storePickerEmpty?.classList.toggle('hidden', !noMatches);

    if (noMatches) {
      if (storePickerEmptyText) {
        storePickerEmptyText.textContent = rawQuery
          ? `Toko "${rawQuery}" belum terdaftar.`
          : 'Belum ada toko terdata di cakupan MWC ini.';
      }
      if (btnEmptyCreateStoreLabel) {
        btnEmptyCreateStoreLabel.textContent = rawQuery
          ? `Tambah "${rawQuery}"`
          : 'Toko Baru';
      }
    }
  }

  storePickerSearchInput?.addEventListener('input', filterStorePicker);
  btnShowNewStoreForm?.addEventListener('click', () => openNewStoreForm(storePickerSearchInput?.value || ''));
  btnEmptyCreateStore?.addEventListener('click', () => openNewStoreForm(storePickerSearchInput?.value || ''));
  btnBackToStorePicker?.addEventListener('click', openStorePicker);

  pickStoreBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const storeId = Number(btn.getAttribute('data-id'));
      if (!storeId) return;
      const storeName = btn.getAttribute('data-name') || 'Toko UMKM';
      const storePhone = btn.getAttribute('data-phone') || '';
      const storeZone = btn.getAttribute('data-zone') || '';
      const storeRanting = btn.getAttribute('data-ranting') || undefined;

      showJemputAlert(`Toko "${storeName}" dipilih. Silakan masukkan produk untuk toko ini.`, false);
      goToStep2({
        id: storeId,
        name: storeName,
        phone: storePhone,
        zoneName: storeZone,
        ranting: storeRanting,
      });
    });
  });

  function goToStep1() {
    step1Container?.classList.remove('hidden');
    step2Container?.classList.add('hidden');
    openStorePicker();

    // Step 1 Active Indicator
    step1Indicator?.classList.remove('bg-emerald-50/60', 'border-emerald-200', 'bg-slate-50', 'border-slate-200');
    step1Indicator?.classList.add('bg-emerald-50', 'border-emerald-300', 'text-emerald-950', 'font-semibold');
    if (step1Badge) {
      step1Badge.textContent = '1';
      step1Badge.className = 'w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-[11px] shrink-0';
    }

    // Step 2 Inactive Indicator
    step2Indicator?.classList.remove('bg-emerald-50', 'border-emerald-300', 'text-emerald-950', 'font-semibold');
    step2Indicator?.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-600', 'font-medium');
    if (step2Badge) {
      step2Badge.className = 'w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-mono font-bold text-[11px] shrink-0';
    }
    if (step2Title) step2Title.className = 'truncate';
  }

  function goToStep2(store: { id: number; name: string; phone: string; zoneName: string; ranting?: string }) {
    currentStore = store;
    if (step2UmkmIdInput) step2UmkmIdInput.value = String(store.id);
    if (activeStoreName) activeStoreName.textContent = store.name;
    if (activeStoreZone) {
      activeStoreZone.textContent = store.ranting ? `${store.zoneName} · Desa ${store.ranting}` : store.zoneName;
    }
    if (activeStorePhone) activeStorePhone.textContent = store.phone;

    step1Container?.classList.add('hidden');
    step2Container?.classList.remove('hidden');

    // Step 1 Completed Indicator
    step1Indicator?.classList.remove('bg-emerald-50', 'border-emerald-300');
    step1Indicator?.classList.add('bg-emerald-50/60', 'border-emerald-200');
    if (step1Badge) {
      step1Badge.innerHTML = '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      step1Badge.className = 'w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-[11px] shrink-0';
    }

    // Step 2 Active Indicator
    step2Indicator?.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-600', 'font-medium');
    step2Indicator?.classList.add('bg-emerald-50', 'border-emerald-300', 'text-emerald-950', 'font-semibold');
    if (step2Badge) {
      step2Badge.className = 'w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-[11px] shrink-0';
    }
    if (step2Title) step2Title.className = 'truncate';

    step2Container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Step 1: Submit Form Daftarkan Toko Baru
  formStep1Store?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btnSubmitStep1) {
      btnSubmitStep1.disabled = true;
      btnSubmitStep1.textContent = 'Menyimpan Toko...';
    }

    try {
      const formData = new FormData(formStep1Store);
      const res = await fetch('/api/umkm/create', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success && data.store) {
        showJemputAlert(data.message || 'Toko berhasil disimpan! Lanjut daftarkan produk untuk toko ini.', false);
        goToStep2(data.store);
      } else {
        showJemputAlert(data.message || 'Gagal mendaftarkan toko.', true);
      }
    } catch (err: any) {
      showJemputAlert(err.message || 'Terjadi gangguan jaringan saat menyimpan toko.', true);
    } finally {
      if (btnSubmitStep1) {
        btnSubmitStep1.disabled = false;
        btnSubmitStep1.textContent = 'Lanjut';
      }
    }
  });

  // Return to Step 1 Button
  btnBackToStep1?.addEventListener('click', () => {
    goToStep1();
  });

  // Step 2: Multi-Photo Handling & Compression
  function syncPetugasPhotos() {
    if (petugasPhotos.length > 0) {
      if (base64Input) base64Input.value = petugasPhotos[0];
      if (galleryImagesInput) galleryImagesInput.value = JSON.stringify(petugasPhotos.slice(1));
    } else {
      if (base64Input) base64Input.value = '';
      if (galleryImagesInput) galleryImagesInput.value = '[]';
    }

    if (photoCounter) {
      photoCounter.textContent = `${petugasPhotos.length} dari 4 foto dipilih`;
    }

    if (uploadBoxes) {
      const isFull = petugasPhotos.length >= 4;
      uploadBoxes.classList.toggle('hidden', isFull);
      uploadBoxes.classList.toggle('grid', !isFull);
    }

    renderPetugasPhotosGrid();
  }

  function renderPetugasPhotosGrid() {
    if (!photosGrid) return;
    photosGrid.innerHTML = '';

    petugasPhotos.forEach((dataUrl, idx) => {
      const item = document.createElement('div');
      item.className = 'relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex items-center justify-center';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `Foto ${idx + 1}`;
      img.className = 'w-full h-full object-cover';
      item.appendChild(img);

      const badge = document.createElement('span');
      badge.className = `absolute bottom-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 rounded ${
        idx === 0 ? 'bg-emerald-700 text-white' : 'bg-slate-900/80 text-white backdrop-blur-xs'
      }`;
      badge.textContent = idx === 0 ? 'Foto Utama' : `Foto ${idx + 1}`;
      item.appendChild(badge);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Hapus foto ${idx + 1}`);
      removeBtn.className = 'absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center shadow-sm cursor-pointer transition';
      removeBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      removeBtn.onclick = (e) => {
        e.preventDefault();
        petugasPhotos.splice(idx, 1);
        syncPetugasPhotos();
      };
      item.appendChild(removeBtn);

      photosGrid.appendChild(item);
    });
  }

  function compressPetugasImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
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
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePetugasPhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remainingSlots = 4 - petugasPhotos.length;
    if (remainingSlots <= 0) {
      showJemputAlert('Maksimal 4 foto per produk telah tercapai.', true);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (compressInfo) {
      compressInfo.textContent = `Mengompres ${filesToProcess.length} foto otomatis...`;
      compressInfo.classList.remove('hidden');
    }

    for (const file of filesToProcess) {
      try {
        const dataUrl = await compressPetugasImage(file);
        if (petugasPhotos.length < 4) {
          petugasPhotos.push(dataUrl);
        }
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }

    if (compressInfo) compressInfo.classList.add('hidden');
    syncPetugasPhotos();
  }

  cameraInput?.addEventListener('change', () => {
    handlePetugasPhotoFiles(cameraInput.files);
    cameraInput.value = '';
  });

  galleryInput?.addEventListener('change', () => {
    handlePetugasPhotoFiles(galleryInput.files);
    galleryInput.value = '';
  });

  function resetStep2ProductForm() {
    if (formStep2Product) {
      const nameInput = document.getElementById('productName') as HTMLInputElement | null;
      const priceInput = document.getElementById('prodPrice') as HTMLInputElement | null;
      const origPriceInput = document.getElementById('prodOriginalPrice') as HTMLInputElement | null;
      const shopeeInput = document.getElementById('prodShopee') as HTMLInputElement | null;
      const capacityInput = document.getElementById('prodProductionCapacity') as HTMLInputElement | null;
      const descInput = document.getElementById('prodDesc') as HTMLTextAreaElement | null;

      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '';
      if (origPriceInput) origPriceInput.value = '';
      if (shopeeInput) shopeeInput.value = '';
      if (capacityInput) capacityInput.value = '';
      if (descInput) descInput.value = '';

      petugasPhotos = [];
      syncPetugasPhotos();
    }
  }

  btnSaveAndAddMore?.addEventListener('click', () => {
    isAddMoreMode = true;
    formStep2Product?.requestSubmit();
  });

  btnSubmitStep2?.addEventListener('click', () => {
    isAddMoreMode = false;
  });

  // Step 2: Submit Product for Active Store
  formStep2Product?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentStore || !step2UmkmIdInput?.value) {
      showJemputAlert('Toko aktif belum dipilih. Silakan kembali ke Step 1.', true);
      goToStep1();
      return;
    }

    const activeBtn = isAddMoreMode ? btnSaveAndAddMore : btnSubmitStep2;
    if (activeBtn) {
      activeBtn.setAttribute('disabled', 'true');
    }

    try {
      const formData = new FormData(formStep2Product);
      const res = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        sessionProductCount += 1;
        if (sessionProductCounter) {
          sessionProductCounter.textContent = `${sessionProductCount} produk tersimpan sesi ini`;
        }

        if (isAddMoreMode) {
          showJemputAlert(`Alhamdulillah! Produk berhasil ditambahkan untuk ${currentStore.name}. Silakan isi produk berikutnya untuk toko ini.`, false);
          resetStep2ProductForm();
          const nameInput = document.getElementById('productName') as HTMLInputElement | null;
          nameInput?.focus();
        } else {
          showJemputAlert(`Alhamdulillah! Produk berhasil diterbitkan ke katalog Mamasar.`, false);
          resetStep2ProductForm();
          setTimeout(async () => {
            const shouldView = await confirmAction({
              title: 'Produk Berhasil Diterbitkan',
              message: 'Ingin melihat halaman produk baru ini di tab baru?',
              confirmLabel: 'Buka Halaman Produk',
              cancelLabel: 'Tetap di Portal',
            });
            if (shouldView) {
              window.open(`/produk/${data.slug}`, '_blank');
            }
          }, 300);
        }
      } else {
        showJemputAlert(data.message || 'Gagal menerbitkan produk.', true);
      }
    } catch (err: any) {
      showJemputAlert(err.message || 'Terjadi gangguan jaringan.', true);
    } finally {
      if (activeBtn) {
        activeBtn.removeAttribute('disabled');
      }
    }
  });

  // Review Promotion Orders (Approve / Reject)
  document.querySelectorAll<HTMLButtonElement>('[data-action="review-promo"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = btn.getAttribute('data-order-id');
      const decision = btn.getAttribute('data-decision');
      if (!orderId || !decision) return;

      let reason: string | undefined = undefined;
      if (decision === 'reject') {
        const result = await openConfirmDialog({
          title: 'Tolak Pengajuan Promosi',
          message: 'Tuliskan alasan penolakan agar pemilik toko dapat memperbaikinya:',
          confirmLabel: 'Tolak Pengajuan',
          tone: 'danger',
          inputLabel: 'Alasan Penolakan',
          inputPlaceholder: 'Bukti transfer tidak sesuai atau tidak terbaca',
          defaultValue: 'Bukti transfer tidak sesuai atau tidak terbaca',
          requiredInput: true,
        });
        if (!result.confirmed) return;
        reason = result.value;
      } else {
        const confirmed = await confirmAction({
          title: 'Setujui Promosi Iklan',
          message: 'Setujui bukti pembayaran dan aktifkan promosi iklan ini sekarang?',
          confirmLabel: 'Ya, Aktifkan Promosi',
          tone: 'emerald',
        });
        if (!confirmed) {
          return;
        }
      }

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Memproses...';

      try {
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('action', decision);
        if (reason) formData.append('reason', reason);

        const res = await fetch('/api/promotions/review', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          notify(data.message || 'Berhasil memproses pesanan iklan.');
          setTimeout(() => window.location.reload(), 900);
        } else {
          notify(data.message || 'Gagal memproses pesanan.', true);
          btn.disabled = false;
          btn.textContent = originalText;
        }
      } catch (err: any) {
        notify('Kendala jaringan: ' + err.message, true);
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  initTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminClient);
} else {
  initAdminClient();
}
