import { useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Clock, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
  onRefresh: () => void;
}

export function AgendaSidebar({ events, selectedDate, onSelectDate, onRefresh }: Props) {
  const navigate = useNavigate();

  const eventDates = useMemo(
    () => events.map((e) => parseISO(e.event_date)),
    [events],
  );

  const dayEvents = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return events
      .filter((e) => e.event_date === dateKey)
      .sort((a, b) => (a.event_time || '08:00').localeCompare(b.event_time || '08:00'));
  }, [events, selectedDate]);

  return (
    <div className="w-[280px] flex-shrink-0 space-y-4">
      {/* Mini calendar */}
      <Card className="shadow-card">
        <CardContent className="p-2">
          <Calendar
            locale={ptBR}
            selected={selectedDate}
            onDayClick={onSelectDate}
            modifiers={{ event: eventDates }}
            modifiersClassNames={{
              event: 'bg-primary/20 text-primary font-bold',
            }}
          />
        </CardContent>
      </Card>

      {/* Day events */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dayEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhum evento neste dia</p>
          ) : (
            dayEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/events/${ev.id}`)}
              >
                <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', statusDotColors[ev.status])} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{ev.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    {ev.event_time && (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>{ev.event_time.slice(0, 5)}</span>
                        <span>·</span>
                      </>
                    )}
                    <span className="truncate">{ev.client_name_display || 'Sem cliente'}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 mt-2"
            onClick={() => navigate('/events')}
          >
            <Plus className="w-3 h-3" />
            Adicionar Evento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
