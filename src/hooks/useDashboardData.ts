import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Event, EVENT_STATUS_LABELS } from '@/types/database';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  totalEvents: number;
  confirmedEvents: number;
  monthlyRevenue: number;
  pendingBudgets: number;
  weekEvents: number;
  stockUtilization: number;
  recentEvents: Event[];
  eventDates: Date[];
  monthlyRevenueData: { month: string; revenue: number }[];
  statusChartData: { name: string; value: number; color: string }[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  planning: '#f59e0b',
  in_progress: '#3b82f6',
  assembly: '#a855f7',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export function useDashboardData(): DashboardData {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalEvents: 0,
    confirmedEvents: 0,
    monthlyRevenue: 0,
    pendingBudgets: 0,
    weekEvents: 0,
    stockUtilization: 0,
    recentEvents: [],
    eventDates: [],
    monthlyRevenueData: [],
    statusChartData: [],
    isLoading: true,
  });

  useEffect(() => {
    if (!profile?.entity_id) return;

    const fetchAll = async () => {
      const entityId = profile.entity_id;
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch all events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      const allEvents = (events || []) as Event[];

      // Metrics
      const totalEvents = allEvents.length;
      const confirmedEvents = allEvents.filter(e => e.status === 'confirmed' || e.status === 'in_assembly' || e.status === 'in_transit' || e.status === 'in_progress' || e.status === 'assembly').length;
      const pendingBudgets = allEvents.filter(e => e.status === 'budget' || e.status === 'planning').length;

      // Monthly revenue (budget sum for current month events)
      const monthlyRevenue = allEvents
        .filter(e => {
          const d = parseISO(e.event_date);
          return d >= monthStart && d <= monthEnd && e.status !== 'cancelled';
        })
        .reduce((sum, e) => sum + (e.budget || 0), 0);

      // Week events
      const weekEvents = allEvents.filter(e => {
        const d = parseISO(e.event_date);
        return d >= weekStart && d <= weekEnd;
      }).length;

      // Stock utilization
      const { count: totalItems } = await supabase
        .from('decoration_items')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', entityId);

      const { count: inUseItems } = await supabase
        .from('decoration_items')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', entityId)
        .in('status', ['in_transit', 'delivered', 'installed']);

      const stockUtilization = totalItems ? Math.round(((inUseItems || 0) / totalItems) * 100) : 0;

      // Recent events (last 5 created)
      const recentEvents = allEvents.slice(0, 5);

      // Event dates for calendar
      const eventDates = allEvents.map(e => parseISO(e.event_date));

      // Monthly revenue chart (last 12 months)
      const monthlyRevenueData: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const m = addMonths(now, -i);
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const rev = allEvents
          .filter(e => {
            const d = parseISO(e.event_date);
            return d >= mStart && d <= mEnd && e.status !== 'cancelled';
          })
          .reduce((sum, e) => sum + (e.budget || 0), 0);
        monthlyRevenueData.push({
          month: format(m, 'MMM/yy', { locale: ptBR }),
          revenue: rev,
        });
      }

      // Status chart
      const statusCounts: Record<string, number> = {};
      allEvents.forEach(e => {
        statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
      });
      const statusChartData = Object.entries(statusCounts).map(([status, value]) => ({
        name: EVENT_STATUS_LABELS[status as keyof typeof EVENT_STATUS_LABELS] || status,
        value,
        color: STATUS_COLORS[status] || '#888',
      }));

      setData({
        totalEvents,
        confirmedEvents,
        monthlyRevenue,
        pendingBudgets,
        weekEvents,
        stockUtilization,
        recentEvents,
        eventDates,
        monthlyRevenueData,
        statusChartData,
        isLoading: false,
      });
    };

    fetchAll();
  }, [profile?.entity_id]);

  return data;
}
