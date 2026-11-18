import { cn } from '@/lib/utils';

function Card({ className, as: Tag = 'section', ...props }) {
  return <Tag data-slot="card" className={cn('mb-4 flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-card sm:p-5', className)} {...props} />;
}
function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={cn('flex min-w-0 flex-col gap-1', className)} {...props} />;
}
function CardTitle({ className, as: Tag = 'h2', ...props }) {
  return <Tag data-slot="card-title" className={cn('m-0 flex min-w-0 items-center gap-2 text-lg leading-snug font-semibold tracking-tight [&>svg]:text-primary', className)} {...props} />;
}
function CardDescription({ className, ...props }) {
  return <p data-slot="card-description" className={cn('m-0 text-sm text-muted-foreground', className)} {...props} />;
}
function CardAction({ className, ...props }) {
  return <div data-slot="card-action" className={cn('ml-auto shrink-0', className)} {...props} />;
}
function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn('min-w-0', className)} {...props} />;
}
function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={cn('flex flex-wrap items-center gap-2', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
