import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Label({ className, ...props }) {
  return <LabelPrimitive.Root data-slot="label" className={cn('flex items-center gap-2 text-sm leading-none font-semibold text-muted-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50', className)} {...props} />;
}

/** Label + control stacked with the standard gap (space-y-2). Wraps the control so clicks focus it. */
function Field({ label, hint, className, children }) {
  return (
    <label className={cn('mb-4 block space-y-2', className)}>
      <span className="block text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export { Label, Field };
