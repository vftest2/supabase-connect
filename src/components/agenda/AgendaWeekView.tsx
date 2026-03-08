import { useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgendaEvent } from '@/pages/AgendaPage';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const statusBgColors: Record<string, string> = {
  planning: 'bg-muted-foreground/15 border-l-muted-foreground',
  in_progress: 'bg-success/15 border-l-success',
  assembly: 'bg-warning/15 border-l-warning',
  completed: 'bg-muted/50 border-l-muted-foreground/50',
  cancelled: 'bg-destructive/15 border-l-destructive',
};

interface Props {
  events: AgendaEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
}

export function AgendaWeekView({ events, selectedDate, onSelectDate, onDayDoubleClick }: Props) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    events.forEach((e) => {
      const key = e.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  return (
    <Card className="shadow-card p-4 overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => onSelectDate(subWeeks(selectedDate, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-display font-semibold">
          {format(weekStart, "d MMM", { locale: ptBR })} — {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => onSelectDate(addWeeks(selectedDate, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="overflow-auto max-h-[600px]">
        {/* Header */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] sticky top-0 z-10 bg-card border-b border-border">
          <div className="text-xs text-muted-foreground p-2" />
          {days.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'text-center py-2 cursor-pointer hover:bg-muted/50',
                  today && 'bg-primary/5',
                )}
                onDoubleClick={() => onDayDoubleClick(day)}
              >
                <div className="text-[10px] text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={cn(
                  'text-sm font-medium mt-0.5',
                  today && 'text-primary font-bold',
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-border/30 min-h-[48px]">
            <div className="text-[10px] text-muted-foreground p-1 text-right pr-2 pt-1">
              {String(hour).padStart(2, '0')}:00
            </div>
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = (eventsByDate[dateKey] || []).filter((e) => {
                if (!e.event_time) return hour === 8; // default to 8am
                const eventHour = parseInt(e.event_time.split(':')[0], 10);
                return eventHour === hour;
              });

              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className="border-l border-border/30 p-0.5 relative"
                  onDoubleClick={() => onDayDoubleClick(day)}
                >
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate',
                        statusBgColors[ev.status] || 'bg-muted',
                      )}
                    >
                      {ev.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
