export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'emerald' | 'danger' | 'amber';
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultValue?: string;
  requiredInput?: boolean;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  value: string;
}

/**
 * Buka elemen <dialog> standar HTML secara aman dengan membersihkan returnValue lebih dulu.
 */
export function openNativeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  dialog.returnValue = '';
  if (!dialog.open) {
    dialog.showModal();
  }
  const preferredFocus = dialog.querySelector<HTMLElement>('[autofocus]');
  preferredFocus?.focus();
}

export function closeNativeDialog(dialog: HTMLDialogElement | null, returnValue = 'cancel'): void {
  if (!dialog) return;
  if (dialog.open) {
    dialog.close(returnValue);
  }
}

/**
 * Dialog konfirmasi / input terpadu berbasis <dialog id="mamasar-confirm-dialog">
 * untuk menggantikan window.confirm() dan window.prompt().
 */
export function openConfirmDialog(options: ConfirmDialogOptions): Promise<ConfirmDialogResult> {
  const dialog = document.getElementById('mamasar-confirm-dialog') as HTMLDialogElement | null;
  if (!dialog) {
    return Promise.resolve({ confirmed: false, value: '' });
  }

  const titleEl = document.getElementById('confirm-dialog-title');
  const messageEl = document.getElementById('confirm-dialog-message');
  const cancelBtn = document.getElementById('confirm-dialog-cancel') as HTMLButtonElement | null;
  const confirmBtn = document.getElementById('confirm-dialog-submit') as HTMLButtonElement | null;
  const inputWrap = document.getElementById('confirm-dialog-input-wrap');
  const inputLabelEl = document.getElementById('confirm-dialog-input-label');
  const inputEl = document.getElementById('confirm-dialog-input') as HTMLInputElement | null;

  if (titleEl) titleEl.textContent = options.title;
  if (messageEl) messageEl.textContent = options.message;
  if (cancelBtn) cancelBtn.textContent = options.cancelLabel || 'Batal';
  if (confirmBtn) {
    confirmBtn.textContent = options.confirmLabel || 'Lanjutkan';
    confirmBtn.className =
      options.tone === 'danger'
        ? 'min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition cursor-pointer'
        : options.tone === 'amber'
          ? 'min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 transition cursor-pointer'
          : 'min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer';
  }

  const hasInput = Boolean(options.inputLabel);
  if (inputWrap && inputEl && inputLabelEl) {
    if (hasInput) {
      inputWrap.classList.remove('hidden');
      inputLabelEl.textContent = options.inputLabel || '';
      inputEl.placeholder = options.inputPlaceholder || '';
      inputEl.value = options.defaultValue ?? '';
      inputEl.required = Boolean(options.requiredInput);
    } else {
      inputWrap.classList.add('hidden');
      inputEl.value = '';
      inputEl.required = false;
    }
  }

  return new Promise<ConfirmDialogResult>((resolve) => {
    const cleanup = () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
    };

    const handleClose = () => {
      cleanup();
      const confirmed = dialog.returnValue === 'confirm';
      resolve({
        confirmed,
        value: inputEl ? inputEl.value.trim() : '',
      });
    };

    const handleCancel = (e: Event) => {
      e.preventDefault();
      dialog.close('cancel');
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        dialog.close('cancel');
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleBackdropClick);
    openNativeDialog(dialog);
  });
}

export async function confirmAction(
  options: Omit<ConfirmDialogOptions, 'inputLabel' | 'inputPlaceholder' | 'defaultValue' | 'requiredInput'>
): Promise<boolean> {
  const result = await openConfirmDialog(options);
  return result.confirmed;
}
