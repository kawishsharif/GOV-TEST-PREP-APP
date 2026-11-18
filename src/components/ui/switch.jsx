import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

// The button itself is a 48px touch target; the visible track is drawn inside it.
function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root data-slot="switch"
      className={cn('group peer -my-2.5 inline-grid h-12 w-14 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}>
      <span aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 h-7 w-12 rounded-full shadow-xs transition-colors group-focus-visible:ring-[3px] group-focus-visible:ring-ring/40 group-data-[state=checked]:bg-brand group-data-[state=unchecked]:bg-input" />
      <SwitchPrimitive.Thumb data-slot="switch-thumb"
        className="pointer-events-none col-start-1 row-start-1 block size-6 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-2.5 data-[state=unchecked]:-translate-x-2.5" />
    </SwitchPrimitive.Root>
  );
}

/** A full-width row: text on the left, switch on the right; the whole row is the tap target. */
function SwitchRow({ label, checked, onCheckedChange, id }) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
      <span className="min-w-0">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={typeof label === 'string' ? label : undefined} />
    </label>
  );
}

export { Switch, SwitchRow };
