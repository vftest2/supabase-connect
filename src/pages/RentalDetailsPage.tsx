import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RentalItem, Rental, RENTAL_STATUS_LABELS } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/15 text-warning',
  in_progress: 'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

export default function RentalDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [rental, setRental] = useState<Rental | null>(null);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!id || !profile?.entity_id) return;
    const { data: rentalData } = await supabase
      .from('rentals').select('*').eq('id', id).eq('entity_id', profile.entity_id).maybeSingle();
    if (!rentalData) { navigate('/rentals'); return; }
    setRental(rentalData as unknown as Rental);

    const { data: itemsData } = await supabase
      .from('rental_items').select('*').eq('rental_id', id).order('created_at');
    setItems((itemsData || []) as unknown as RentalItem[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [id, profile?.entity_id]);

  const toggleCheckedOut = async (item: RentalItem) => {
    const newVal = !item.checked_out;
    await supabase.from('rental_items').update({ checked_out: newVal } as any).eq('id', item.id);
    setItems(items.map(i => i.id === item.id ? { ...i, checked_out: newVal } : i));
  };

  const toggleCheckedIn = async (item: RentalItem) => {
    const newVal = !item.checked_in;
    const update: any = { checked_in: newVal };
    if (newVal) update.returned_quantity = item.quantity;
    else update.returned_quantity = 0;
    await supabase.from('rental_items').update(update).eq('id', item.id);
    setItems(items.map(i => i.id === item.id ? { ...i, checked_in: newVal, returned_quantity: newVal ? item.quantity : 0 } : i));
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoading) {
    return <DashboardLayout><div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div></DashboardLayout>;
  }

  if (!rental) return null;

  const allOut = items.length > 0 && items.every(i => i.checked_out);
  const allIn = items.length > 0 && items.every(i => i.checked_in);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rentals')}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-display font-bold">{rental.title}</h1>
            <Badge className={cn('mt-1', statusColors[rental.status])}>{RENTAL_STATUS_LABELS[rental.status as keyof typeof RENTAL_STATUS_LABELS]}</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Saída</p>
                  <p className="font-medium">{rental.departure_date ? format(parseISO(rental.departure_date), "d MMM yyyy", { locale: ptBR }) : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Retorno</p>
                  <p className="font-medium">{rental.return_date ? format(parseISO(rental.return_date), "d MMM yyyy", { locale: ptBR }) : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Package className="w-5 h-5 text-warning" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(rental.total_value || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Itens da Locação</CardTitle>
            <CardDescription>Controle de saída e retorno dos itens</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum item nesta locação</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_100px_80px_80px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <span>Item</span><span className="text-center">Qtd</span><span className="text-center">Preço Un.</span>
                  <span className="text-center">Saiu</span><span className="text-center">Voltou</span>
                </div>
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_100px_80px_80px] gap-2 items-center py-2 border-b border-border/30">
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <span className="text-sm text-center">{item.quantity}</span>
                    <span className="text-sm text-center">{formatCurrency(item.unit_price)}</span>
                    <div className="flex justify-center">
                      <Checkbox checked={item.checked_out} onCheckedChange={() => toggleCheckedOut(item)} />
                    </div>
                    <div className="flex justify-center">
                      <Checkbox checked={item.checked_in} onCheckedChange={() => toggleCheckedIn(item)} disabled={!item.checked_out} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
