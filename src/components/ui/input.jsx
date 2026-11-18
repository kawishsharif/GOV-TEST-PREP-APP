import { cn } from '@/lib/utils';

function Input({ className, type, ...props }) {
  return (
    <input type={type} data-slot="input"
      className={cn('flex min-h-12 w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive', className)}
      {...props} />
  );
}

export { Input };
