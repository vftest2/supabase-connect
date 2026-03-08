import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, User, Filter, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EVENT_STATUS_LABELS } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EventDialog } from '@/components/events/EventDialog';

const statusColors: Record<string, string> = {
  budget: 'bg-muted text-muted-foreground',
  confirmed: 'bg-success/15 text-success',
  in_assembly: 'bg-warning/15 text-warning',
  in_transit: 'bg-primary/15 text-primary',
  finished: 'bg-muted text-muted-foreground',
  planning: 'bg-primary/15 text-primary',
  in_progress: 'bg-warning/15 text-warning',
  assembly: 'bg-accent/15 text-accent',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

const NEW_STATUSES = ['budget', 'confirmed', 'in_assembly', 'in_transit', 'finished'];

export default function EventsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchEvents = async () => {
    if (!profile?.entity_id) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('entity_id', profile.entity_id)
        .order('start_date', { ascending: true });
      if (error) throw error;
      setEvents((data || []) as unknown as Event[]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os eventos' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [profile?.entity_id]);

  useEffect(() => {
    let filtered = events;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        (e.title || e.name).toLowerCase().includes(term) ||
        e.client_name?.toLowerCase().includes(term) ||
        e.location?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } else {
      setEvents(events.filter(e => e.id !== id));
      toast({ title: 'Evento excluído' });
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Eventos</h1>
            <p className="text-muted-foreground mt-1">Gerencie todos os seus eventos</p>
          </div>
          <Button onClick={() => { setSelectedEvent(null); setIsDialogOpen(true); }} className="bg-gradient-warm hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por título, cliente ou local..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {NEW_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{EVENT_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <Card key={i} className="shadow-card animate-pulse">
                <CardContent className="pt-6"><div className="h-4 bg-muted rounded w-3/4 mb-3" /><div className="h-3 bg-muted rounded w-1/2" /></CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
              <p className="text-muted-foreground mb-4">{searchTerm || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Comece criando seu primeiro evento'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="shadow-card hover:shadow-soft transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-display truncate">{event.title || event.name}</CardTitle>
                      {event.event_type && <p className="text-xs text-muted-foreground mt-0.5">{event.event_type}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/events/${event.id}`}><Eye className="w-4 h-4 mr-2" /> Ver detalhes</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedEvent(event); setIsDialogOpen(true); }}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(event.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {event.start_date
                        ? format(parseISO(event.start_date), "d MMM yyyy 'às' HH:mm", { locale: ptBR })
                        : format(parseISO(event.event_date), "d MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" /><span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.client_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" /><span className="truncate">{event.client_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Badge className={cn('font-normal', statusColors[event.status])}>{EVENT_STATUS_LABELS[event.status]}</Badge>
                    {(event.total_value || event.budget) && (
                      <span className="text-sm font-medium">{formatCurrency(event.total_value || event.budget || 0)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EventDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} event={selectedEvent} onSuccess={fetchEvents} />
    </DashboardLayout>
  );
}
