// App icons: lucide-react, addressed by a short name so call sites stay stable.
// Size: 20px by default (`.ico`), 16px inside <Button> (button styles), or pass a `size-*` class.
import {
  House, LayoutDashboard, SquareCheckBig, Timer, BookOpenText, Ellipsis, ChevronLeft, ChevronRight, Settings, Flag,
  LayoutGrid, ArrowRight, ArrowLeft, Zap, BookOpen, Layers, X, TriangleAlert, Calendar, ChartLine, Sparkles, Calculator,
  Upload, Download, Printer, Flame, Target, Plus, Repeat, Waves, Users, LogOut, RefreshCw, Search, Check, LoaderCircle,
  Cloud, Lightbulb, NotebookPen, Trophy, Clock, ListChecks, KeyRound, Shuffle, CircleCheck, CircleX, RotateCcw, Bot, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  home: House, dash: LayoutDashboard, practice: SquareCheckBig, mock: Timer, notes: BookOpenText, more: Ellipsis,
  back: ChevronLeft, chev: ChevronRight, settings: Settings, flag: Flag, grid: LayoutGrid, next: ArrowRight, prev: ArrowLeft,
  bolt: Zap, book: BookOpen, cards: Layers, x: X, alert: TriangleAlert, calendar: Calendar, chart: ChartLine, sparkle: Sparkles,
  calc: Calculator, upload: Upload, download: Download, printer: Printer, fire: Flame, target: Target, plus: Plus, repeat: Repeat,
  wave: Waves, users: Users, logout: LogOut, refresh: RefreshCw, search: Search, check: Check, loader: LoaderCircle, cloud: Cloud,
  tip: Lightbulb, pen: NotebookPen, trophy: Trophy, clock: Clock, list: ListChecks, key: KeyRound, shuffle: Shuffle,
  ok: CircleCheck, wrong: CircleX, reset: RotateCcw, bot: Bot, shield: ShieldCheck,
};

export function Icon({ name, className, label }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return (
    <Cmp className={cn('ico shrink-0', name === 'loader' && 'animate-spin', className)} strokeWidth={2}
      aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} />
  );
}
