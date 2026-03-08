import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { MonthlyRevenueChart } from '@/components/dashboard/MonthlyRevenueChart';
import { EventsByStatusChart } from '@/components/dashboard/EventsByStatusChart';
import { RecentEvents } from '@/components/dashboard/RecentEvents';
import { UpcomingCalendar } from '@/components/dashboard/UpcomingCalendar';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { profile } = useAuth();
  const {
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
    isLoading,
  } = useDashboardData();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[380px]" />
            <Skeleton className="h-[380px]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da sua empresa
          </p>
        </div>

        {/* Metric Cards */}
        <MetricCards
          totalEvents={totalEvents}
          confirmedEvents={confirmedEvents}
          monthlyRevenue={monthlyRevenue}
          pendingBudgets={pendingBudgets}
          weekEvents={weekEvents}
          stockUtilization={stockUtilization}
        />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <MonthlyRevenueChart data={monthlyRevenueData} />
          <EventsByStatusChart data={statusChartData} />
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <RecentEvents events={recentEvents} />
          <UpcomingCalendar eventDates={eventDates} />
          <QuickActions />
        </div>
      </div>
    </DashboardLayout>
  );
}
