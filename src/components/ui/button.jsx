import { Slot } from 'radix-ui';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Sizes follow the app's touch targets: 48px default, 40px small (mobile-first).
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-semibold whitespace-nowrap no-underline transition-[color,background-color,border-color,box-shadow,transform] select-none outline-none active:translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        brand: 'bg-brand text-brand-foreground shadow-xs hover:bg-brand/90',
        destructive: 'border border-destructive bg-transparent text-destructive hover:bg-destructive-soft',
        outline: 'border border-border bg-card text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        google: 'border border-[#dadce0] bg-white text-[#1f1f1f] shadow-xs hover:bg-[#f8f9fa]',
      },
      size: {
        default: 'min-h-12 px-5',
        sm: 'min-h-10 gap-1.5 px-3 text-sm',
        lg: 'min-h-14 px-6 text-lg',
        icon: 'size-12',
        'icon-sm': 'size-10',
      },
    },
    defaultVariants: { variant: 'outline', size: 'default' },
  },
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
