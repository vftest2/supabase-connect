import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Truck, CheckCircle2, MapPin, Package, Users, ChevronRight, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EVENT_STATUS_LABELS } from '@/types/database';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { EventChecklistDialog } from '@/components/logistics/EventChecklistDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LogisticsEvent {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  client_name: string | null;
  client: { id: string; name: string } | null;
  event_items: { id: string; quantity: number }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  in_assembly: { label: 'Em Montagem', color: 'bg-warning/15 text-warning', icon: Clock },
  in_transit: { label: 'Em Trânsito', color: 'bg-primary/15 text-primary', icon: Truck },
  finished: { label: 'Finalizado', color: 'bg-success/15 text-success', icon: CheckCircle2 },
};

export default function LogisticsPage() {
  const { entity } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [events, setEvents] = useState<LogisticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checklistEventId, setChecklistEventId] = useState<string | null>(null);
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    eventId: string;
    eventTitle: string;
    newStatus: string;
    label: string;
  }>({ open: false, eventId: '', eventTitle: '', newStatus: '', label: '' });
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!entity) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, status, start_date, end_date, address, client_name, client:clients(id, name), event_items(id, quantity)')
        .eq('entity_id', entity.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as unknown as LogisticsEvent[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [entity]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const activeEvents = events.filter(e => e.status === 'in_assembly' || e.status === 'in_transit');
  const inAssemblyCount = events.filter(e => e.status === 'in_assembly').length;
  const inTransitCount = events.filter(e => e.status === 'in_transit').length;
  const finishedTodayCount = events.filter(e => e.status === 'finished' && e.end_date && isToday(parseISO(e.end_date))).length;

  const statusCounts = {
    budget: events.filter(e => e.status === 'budget').length,
    confirmed: events.filter(e => e.status === 'confirmed').length,
    in_assembly: inAssemblyCount,
    in_transit: inTransitCount,
    finished: events.filter(e => e.status === 'finished').length,
  };

  const handleTransition = async () => {
    setIsTransitioning(true);
    try {
      const updates: Record<string, any> = { status: transitionDialog.newStatus };
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', transitionDialog.eventId);

      if (error) throw error;

      // Log update
      await supabase.from('event_updates').insert({
        event_id: transitionDialog.eventId,
        entity_id: entity!.id,
        action: 'status_change',
        description: `Status alterado para ${EVENT_STATUS_LABELS[transitionDialog.newStatus] || transitionDialog.newStatus}`,
        old_value: null,
        new_value: { status: transitionDialog.newStatus },
      });

      toast({ title: 'Status atualizado!' });
      setTransitionDialog({ open: false, eventId: '', eventTitle: '', newStatus: '', label: '' });
      await fetchEvents();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsTransitioning(false);
    }
  };

  const openTransition = (eventId: string, eventTitle: string, newStatus: string, label: string) => {
    setTransitionDialog({ open: true, eventId, eventTitle, newStatus, label });
  };

  const summaryCards = [
    { label: 'Em Montagem', count: inAssemblyCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Em Trânsito', count: inTransitCount, icon: Truck, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Finalizados Hoje', count: finishedTodayCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Logística</h1>
          <p className="text-muted-foreground mt-1">Controle de saída, transporte e retorno de itens</p>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <Card key={card.label} className="shadow-card">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.count}</p>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Active Events */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Eventos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : activeEvents.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum evento em montagem ou trânsito</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEvents.map((event) => {
                  const config = statusConfig[event.status];
                  const totalItems = event.event_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const clientName = event.client?.name || event.client_name || 'Sem cliente';

                  return (
                    <div key={event.id} className="p-4 rounded-xl border bg-card hover:shadow-soft transition-all">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{event.title}</h3>
                            {config && (
                              <Badge className={config.color}>{config.label}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {event.start_date && (
                              <span>{format(parseISO(event.start_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                            )}
                            {event.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {event.address}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              {totalItems} ite{totalItems === 1 ? 'm' : 'ns'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {clientName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setChecklistEventId(event.id)}>
                            Ver Checklist
                          </Button>
                          {event.status === 'in_assembly' && (
                            <Button size="sm" className="bg-primary" onClick={() => openTransition(event.id, event.title, 'in_transit', 'Iniciar Saída')}>
                              <Truck className="mr-1.5 h-4 w-4" />
                              Iniciar Saída
                            </Button>
                          )}
                          {event.status === 'in_transit' && (
                            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => openTransition(event.id, event.title, 'finished', 'Registrar Retorno')}>
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Registrar Retorno
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/events/${event.id}`)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display">Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{EVENT_STATUS_LABELS[status] || status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Dialog */}
      {checklistEventId && (
        <EventChecklistDialog
          open={!!checklistEventId}
          onOpenChange={(open) => { if (!open) setChecklistEventId(null); }}
          eventId={checklistEventId}
        />
      )}

      {/* Transition Confirmation */}
      <AlertDialog open={transitionDialog.open} onOpenChange={(open) => setTransitionDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{transitionDialog.label}</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja alterar o status do evento "{transitionDialog.eventTitle}" para {EVENT_STATUS_LABELS[transitionDialog.newStatus] || transitionDialog.newStatus}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransitioning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransition} disabled={isTransitioning}>
              {isTransitioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
