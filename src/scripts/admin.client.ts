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
    if (['agents', 'stores', 'entry', 'events', 'promotions', 'zones'].includes(currentHash)) {
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

  // --- JEMPUT BOLA ENTRY (2-STEP FLOW) ---
  const step1Indicator = document.getElementById('step1-indicator');
  const step1Badge = document.getElementById('step1-badge');
  const step2Indicator = document.getElementById('step2-indicator');
  const step2Badge = document.getElementById('step2-badge');
  const step2Title = document.getElementById('step2-title');
  const step2Desc = document.getElementById('step2-desc');

  const step1Container = document.getElementById('jemput-step-1');
  const step2Container = document.getElementById('jemput-step-2');
  const jemputAlertBox = document.getElementById('jemput-alert-box');

  const btnModeNewStore = document.getElementById('btn-mode-new-store');
  const btnModeExistingStore = document.getElementById('btn-mode-existing-store');
  const formStep1Store = document.getElementById('form-petugas-step1-store') as HTMLFormElement | null;
  const sectionChooseExistingStore = document.getElementById('section-choose-existing-store');
  const selectExistingStore = document.getElementById('select-existing-store') as HTMLSelectElement | null;
  const btnUseExistingStore = document.getElementById('btn-use-existing-store');
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
      jemputAlertBox.classList.add('bg-rose-50', 'text-rose-900', 'border', 'border-rose-200');
    } else {
      jemputAlertBox.classList.add('bg-emerald-50', 'text-emerald-950', 'border', 'border-emerald-200');
    }
    jemputAlertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function goToStep1() {
    step1Container?.classList.remove('hidden');
    step2Container?.classList.add('hidden');

    // Step 1 Active Indicator
    step1Indicator?.classList.remove('bg-emerald-50', 'border-emerald-200', 'shadow-none');
    step1Indicator?.classList.add('bg-emerald-50', 'border-2', 'border-emerald-500', 'shadow-2xs');
    if (step1Badge) {
      step1Badge.textContent = '1';
      step1Badge.className = 'w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-xs shrink-0';
    }

    // Step 2 Inactive Indicator
    step2Indicator?.classList.remove('bg-emerald-50', 'border-2', 'border-emerald-500', 'shadow-2xs');
    step2Indicator?.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-400');
    if (step2Badge) {
      step2Badge.className = 'w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-xs shrink-0';
    }
    if (step2Title) step2Title.className = 'text-xs font-bold leading-tight text-slate-600';
    if (step2Desc) step2Desc.className = 'text-[11px] text-slate-400 font-medium truncate mt-0.5';
  }

  function goToStep2(store: { id: number; name: string; phone: string; zoneName: string; ranting?: string }) {
    currentStore = store;
    if (step2UmkmIdInput) step2UmkmIdInput.value = String(store.id);
    if (activeStoreName) activeStoreName.textContent = store.name;
    if (activeStoreZone) {
      activeStoreZone.textContent = store.ranting ? `${store.zoneName} • Ranting ${store.ranting}` : store.zoneName;
    }
    if (activeStorePhone) activeStorePhone.textContent = store.phone;

    step1Container?.classList.add('hidden');
    step2Container?.classList.remove('hidden');

    // Step 1 Completed Indicator
    step1Indicator?.classList.remove('border-2', 'border-emerald-500', 'shadow-2xs');
    step1Indicator?.classList.add('bg-emerald-50/60', 'border', 'border-emerald-200');
    if (step1Badge) {
      step1Badge.textContent = '✓';
      step1Badge.className = 'w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0';
    }

    // Step 2 Active Indicator
    step2Indicator?.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-400');
    step2Indicator?.classList.add('bg-emerald-50', 'border-2', 'border-emerald-500', 'shadow-2xs');
    if (step2Badge) {
      step2Badge.className = 'w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-xs shrink-0';
    }
    if (step2Title) step2Title.className = 'text-xs font-black leading-tight text-emerald-950';
    if (step2Desc) step2Desc.className = 'text-[11px] text-emerald-700 font-medium truncate mt-0.5';

    step2Container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Toggle Step 1 Mode: Daftarkan Baru vs Pilih Terdaftar
  btnModeNewStore?.addEventListener('click', () => {
    btnModeNewStore.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
    btnModeNewStore.classList.remove('text-slate-600');
    btnModeExistingStore?.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
    btnModeExistingStore?.classList.add('text-slate-600');

    formStep1Store?.classList.remove('hidden');
    sectionChooseExistingStore?.classList.add('hidden');
  });

  btnModeExistingStore?.addEventListener('click', () => {
    btnModeExistingStore.classList.add('bg-white', 'text-slate-900', 'shadow-2xs');
    btnModeExistingStore.classList.remove('text-slate-600');
    btnModeNewStore?.classList.remove('bg-white', 'text-slate-900', 'shadow-2xs');
    btnModeNewStore?.classList.add('text-slate-600');

    formStep1Store?.classList.add('hidden');
    sectionChooseExistingStore?.classList.remove('hidden');
  });

  // Step 1: Submit Form Daftarkan Toko Baru
  formStep1Store?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btnSubmitStep1) {
      btnSubmitStep1.disabled = true;
      btnSubmitStep1.innerHTML = '<span>Menyimpan Toko...</span>';
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
        btnSubmitStep1.innerHTML = '<span>Lanjut ke Step 2: Daftarkan Produk</span><span>➔</span>';
      }
    }
  });

  // Step 1: Choose Existing Store
  btnUseExistingStore?.addEventListener('click', () => {
    if (!selectExistingStore || !selectExistingStore.value) {
      showJemputAlert('Silakan pilih salah satu toko UMKM terlebih dahulu.', true);
      return;
    }

    const selectedOpt = selectExistingStore.options[selectExistingStore.selectedIndex];
    const storeId = Number(selectExistingStore.value);
    const storeName = selectedOpt.getAttribute('data-name') || 'Toko UMKM';
    const storePhone = selectedOpt.getAttribute('data-phone') || '';
    const storeZone = selectedOpt.getAttribute('data-zone') || '';

    showJemputAlert(`Toko "${storeName}" dipilih. Silakan masukkan produk untuk toko ini.`, false);
    goToStep2({
      id: storeId,
      name: storeName,
      phone: storePhone,
      zoneName: storeZone,
    });
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
      if (petugasPhotos.length >= 4) {
        uploadBoxes.classList.add('hidden');
      } else {
        uploadBoxes.classList.remove('hidden');
      }
    }

    renderPetugasPhotosGrid();
  }

  function renderPetugasPhotosGrid() {
    if (!photosGrid) return;
    photosGrid.innerHTML = '';

    petugasPhotos.forEach((dataUrl, idx) => {
      const item = document.createElement('div');
      item.className = 'relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex items-center justify-center';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `Foto ${idx + 1}`;
      img.className = 'w-full h-full object-cover';
      item.appendChild(img);

      const badge = document.createElement('span');
      badge.className = `absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs ${
        idx === 0 ? 'bg-emerald-700 text-white' : 'bg-slate-900/80 text-white backdrop-blur-xs'
      }`;
      badge.textContent = idx === 0 ? 'Foto Utama' : `Foto ${idx + 1}`;
      item.appendChild(badge);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center shadow-sm cursor-pointer transition';
      removeBtn.textContent = '✕';
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
          setTimeout(() => {
            if (confirm('Produk berhasil diterbitkan! Ingin melihat halaman produk di tab baru?')) {
              window.open(`/p/${data.slug}`, '_blank');
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
        const inputReason = prompt('Masukkan alasan penolakan pesanan promosi iklan:', 'Bukti transfer tidak sesuai atau tidak terbaca');
        if (inputReason === null) return;
        reason = inputReason.trim();
      } else {
        if (!confirm('Setujui bukti pembayaran dan aktifkan promosi iklan ini sekarang?')) {
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
