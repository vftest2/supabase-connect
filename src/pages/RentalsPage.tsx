import { useState, useEffect } from 'react';
import { Plus, Search, Package, Calendar, DollarSign, MoreHorizontal, Eye, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Rental, RENTAL_STATUS_LABELS } from '@/types/database';
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

export default function RentalsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRentals = async () => {
    if (!profile?.entity_id) return;
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('entity_id', profile.entity_id)
      .order('created_at', { ascending: false });
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else setRentals((data || []) as unknown as Rental[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchRentals(); }, [profile?.entity_id]);

  const filtered = rentals.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.title.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('rentals').delete().eq('id', id);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else { toast({ title: 'Locação excluída' }); fetchRentals(); }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const stats = {
    total: rentals.length,
    active: rentals.filter(r => r.status === 'in_progress' || r.status === 'pending').length,
    revenue: rentals.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (r.total_value || 0), 0),
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-96" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Locações</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas locações de itens</p>
          </div>
          <Button onClick={() => navigate('/events')} className="bg-gradient-warm hover:opacity-90 gap-2">
            <Plus className="w-4 h-4" /> Nova Locação
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ativas</CardTitle>
              <Clock className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
              <DollarSign className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div></CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar locação..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(RENTAL_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="shadow-card"><CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">Nenhuma locação encontrada</h3>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(rental => (
              <Card key={rental.id} className="shadow-card hover:shadow-soft transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-display truncate">{rental.title}</CardTitle>
                      {rental.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rental.description}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/rentals/${rental.id}`}><Eye className="w-4 h-4 mr-2" /> Detalhes</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(rental.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rental.departure_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(parseISO(rental.departure_date), "d MMM yyyy", { locale: ptBR })}</span>
                      {rental.return_date && <span>→ {format(parseISO(rental.return_date), "d MMM", { locale: ptBR })}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Badge className={cn('font-normal', statusColors[rental.status])}>{RENTAL_STATUS_LABELS[rental.status as keyof typeof RENTAL_STATUS_LABELS] || rental.status}</Badge>
                    <span className="text-sm font-medium">{formatCurrency(rental.total_value || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
