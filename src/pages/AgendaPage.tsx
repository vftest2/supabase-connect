import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EVENT_STATUS_LABELS } from '@/types/database';
import { AgendaMonthView } from '@/components/agenda/AgendaMonthView';
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView';
import { AgendaDayView } from '@/components/agenda/AgendaDayView';
import { AgendaSidebar } from '@/components/agenda/AgendaSidebar';
import { Loader2 } from 'lucide-react';

export type ViewMode = 'month' | 'week' | 'day';

export interface AgendaEvent extends Event {
  client_name_display?: string;
}

export default function AgendaPage() {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!profile?.entity_id) return;
    setIsLoading(true);

    const { data } = await supabase
      .from('events')
      .select('*, clients(name)')
      .eq('entity_id', profile.entity_id)
      .order('event_date', { ascending: true });

    const mapped = (data || []).map((e: any) => ({
      ...e,
      client_name_display: e.clients?.name || e.client_name || null,
    })) as AgendaEvent[];

    setEvents(mapped);
    setIsLoading(false);
  }, [profile?.entity_id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus eventos e compromissos</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="text-xs"
              >
                {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Calendar area */}
            <div className="flex-1 min-w-0">
              {viewMode === 'month' && (
                <AgendaMonthView
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onDayDoubleClick={handleDayClick}
                />
              )}
              {viewMode === 'week' && (
                <AgendaWeekView
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onDayDoubleClick={handleDayClick}
                />
              )}
              {viewMode === 'day' && (
                <AgendaDayView
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}
            </div>

            {/* Sidebar */}
            <AgendaSidebar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
              }}
              onRefresh={fetchEvents}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
