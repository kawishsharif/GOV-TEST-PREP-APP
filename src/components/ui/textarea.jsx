import { cn } from '@/lib/utils';

function Textarea({ className, ...props }) {
  return (
    <textarea data-slot="textarea"
      className={cn('flex min-h-36 w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2 font-mono text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props} />
  );
}

export { Textarea };
