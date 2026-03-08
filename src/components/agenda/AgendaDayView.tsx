import { useMemo } from 'react';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EVENT_STATUS_LABELS } from '@/types/database';
import type { AgendaEvent } from '@/pages/AgendaPage';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const statusBgColors: Record<string, string> = {
  planning: 'bg-muted-foreground/15 border-l-muted-foreground text-foreground',
  in_progress: 'bg-success/15 border-l-success text-foreground',
  assembly: 'bg-warning/15 border-l-warning text-foreground',
  completed: 'bg-muted/80 border-l-muted-foreground/50 text-muted-foreground',
  cancelled: 'bg-destructive/15 border-l-destructive text-foreground',
};

interface Props {
  events: AgendaEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function AgendaDayView({ events, selectedDate, onSelectDate }: Props) {
  const dayEvents = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return events.filter((e) => e.event_date === dateKey);
  }, [events, selectedDate]);

  const eventsByHour = useMemo(() => {
    const map: Record<number, AgendaEvent[]> = {};
    dayEvents.forEach((e) => {
      const hour = e.event_time ? parseInt(e.event_time.split(':')[0], 10) : 8;
      if (!map[hour]) map[hour] = [];
      map[hour].push(e);
    });
    return map;
  }, [dayEvents]);

  return (
    <Card className="shadow-card p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => onSelectDate(subDays(selectedDate, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-display font-semibold capitalize">
          {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => onSelectDate(addDays(selectedDate, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm text-muted-foreground">
        {dayEvents.length === 0
          ? 'Nenhum evento neste dia'
          : `${dayEvents.length} evento${dayEvents.length > 1 ? 's' : ''} neste dia`}
      </div>

      {/* Hour grid */}
      <div className="overflow-auto max-h-[600px] space-y-0">
        {HOURS.map((hour) => {
          const hourEvents = eventsByHour[hour] || [];
          return (
            <div
              key={hour}
              className={cn(
                'grid grid-cols-[60px_1fr] border-b border-border/30 min-h-[52px]',
                hourEvents.length > 0 && 'bg-muted/20',
              )}
            >
              <div className="text-xs text-muted-foreground p-2 text-right pr-3 pt-2 font-mono">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="p-1 space-y-1">
                {hourEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={cn(
                      'p-2 rounded border-l-3 flex items-start gap-3',
                      statusBgColors[ev.status] || 'bg-muted',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.name}</p>
                      {ev.client_name_display && (
                        <p className="text-xs text-muted-foreground">{ev.client_name_display}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ev.event_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ev.event_time.slice(0, 5)}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {EVENT_STATUS_LABELS[ev.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
