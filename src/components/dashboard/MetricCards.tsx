import { Calendar, CheckCircle, DollarSign, Clock, Package, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardsProps {
  totalEvents: number;
  confirmedEvents: number;
  monthlyRevenue: number;
  pendingBudgets: number;
  weekEvents: number;
  stockUtilization: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function MetricCards({
  totalEvents,
  confirmedEvents,
  monthlyRevenue,
  pendingBudgets,
  weekEvents,
  stockUtilization,
}: MetricCardsProps) {
  const metrics = [
    {
      title: 'Total de Eventos',
      value: totalEvents.toString(),
      icon: Calendar,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Eventos Confirmados',
      value: confirmedEvents.toString(),
      icon: CheckCircle,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Receita Mensal',
      value: formatCurrency(monthlyRevenue),
      icon: DollarSign,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Orçamentos Pendentes',
      value: pendingBudgets.toString(),
      icon: Clock,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'Eventos da Semana',
      value: weekEvents.toString(),
      icon: TrendingUp,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      title: 'Utilização do Estoque',
      value: `${stockUtilization}%`,
      icon: Package,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className="shadow-card hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${metric.iconBg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${metric.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
