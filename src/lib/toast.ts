export type ToastTone = 'success' | 'error' | 'info';

let hideTimer: number | undefined;

export function showToast(message: string, tone: ToastTone = 'info', durationMs = 3600): void {
  let region = document.getElementById('mamasar-toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'mamasar-toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.className = 'fixed bottom-20 md:bottom-5 right-4 left-4 sm:left-auto z-[70] flex justify-end pointer-events-none';
    document.body.appendChild(region);
  }

  const toneClasses =
    tone === 'error'
      ? 'bg-rose-800 text-white border-rose-900'
      : tone === 'success'
        ? 'bg-emerald-800 text-white border-emerald-900'
        : 'bg-slate-900 text-white border-slate-800';

  region.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto max-w-sm w-full sm:w-auto px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center justify-between gap-3 transition duration-200 ${toneClasses}`;

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Tutup notifikasi');
  closeBtn.className = 'text-white/80 hover:text-white font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);
  region.appendChild(toast);

  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.remove();
  }, durationMs);
}
