import { useNavigate } from 'react-router-dom';
import { CalendarPlus, FileText, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'Agendar Evento', icon: CalendarPlus, href: '/events', variant: 'default' as const },
    { label: 'Gerar Orçamento', icon: FileText, href: '/events', variant: 'outline' as const },
    { label: 'Conferir Logística', icon: Truck, href: '/events', variant: 'outline' as const },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className="w-full justify-start gap-3"
              onClick={() => navigate(action.href)}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
