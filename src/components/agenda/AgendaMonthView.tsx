import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgendaEvent } from '@/pages/AgendaPage';

const statusDotColors: Record<string, string> = {
  planning: 'bg-muted-foreground',
  in_progress: 'bg-success',
  assembly: 'bg-warning',
  completed: 'bg-muted-foreground/50',
  cancelled: 'bg-destructive',
};

interface Props {
  events: AgendaEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
}

export function AgendaMonthView({ events, selectedDate, onSelectDate, onDayDoubleClick }: Props) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    events.forEach((e) => {
      const key = e.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="shadow-card p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => onSelectDate(subMonths(selectedDate, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-display font-semibold capitalize">
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => onSelectDate(addMonths(selectedDate, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[key] || [];
          const inMonth = isSameMonth(day, selectedDate);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[80px] border border-border/50 p-1 cursor-pointer transition-colors hover:bg-muted/50',
                !inMonth && 'opacity-40',
                selected && 'bg-primary/5 ring-1 ring-primary/30',
              )}
              onClick={() => onSelectDate(day)}
              onDoubleClick={() => onDayDoubleClick(day)}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                  today && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-1 text-[10px] truncate px-1 py-0.5 rounded bg-muted/80"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDotColors[ev.status])} />
                    <span className="truncate">{ev.name}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
