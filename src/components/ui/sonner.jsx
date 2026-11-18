import { Toaster as Sonner } from 'sonner';

/** App-wide toasts. Top-centre on phones keeps them clear of the bottom tab bar and action bars. */
function Toaster(props) {
  return (
    <Sonner position="top-center" offset={72} mobileOffset={{ top: 72 }}
      className="toaster group"
      style={{ '--normal-bg': 'var(--foreground)', '--normal-text': 'var(--background)', '--normal-border': 'var(--foreground)', '--border-radius': '12px' }}
      toastOptions={{ classNames: { toast: 'font-semibold text-sm shadow-card' } }}
      {...props} />
  );
}

export { Toaster };
