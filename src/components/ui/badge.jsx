import { Slot } from 'radix-ui';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-bold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-muted-foreground',
        outline: 'border-border text-foreground',
        success: 'bg-success-soft text-success',
        destructive: 'bg-destructive-soft text-destructive',
        warning: 'bg-warning-soft text-warning',
        brand: 'bg-brand-soft text-brand',
        ai: 'bg-ai-soft text-ai',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : 'span';
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
