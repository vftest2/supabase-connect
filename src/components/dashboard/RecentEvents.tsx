import { useNavigate } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Event, EVENT_STATUS_LABELS } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  planning: 'bg-primary/10 text-primary',
  in_progress: 'bg-warning/10 text-warning',
  assembly: 'bg-accent/10 text-accent',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

interface RecentEventsProps {
  events: Event[];
}

export function RecentEvents({ events }: RecentEventsProps) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Eventos Recentes</CardTitle>
        <CardDescription>Últimos eventos criados</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum evento encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {format(parseISO(event.event_date), 'MMM', { locale: ptBR })}
                  </span>
                  <span className="text-sm font-bold text-primary leading-none">
                    {format(parseISO(event.event_date), 'd')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">{event.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {event.client_name || 'Sem cliente'}
                  </p>
                </div>
                <Badge className={cn('font-normal text-[10px]', statusColors[event.status])}>
                  {EVENT_STATUS_LABELS[event.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
