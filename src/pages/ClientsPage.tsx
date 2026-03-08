import { useState, useEffect } from 'react';
import { Plus, Search, Users, Calendar, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { CreateClientWithEventDialog } from '@/components/clients/CreateClientWithEventDialog';
import { Skeleton } from '@/components/ui/skeleton';

export interface Client {
  id: string;
  entity_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  client_type: 'standard' | 'vip' | 'premium';
  created_at: string;
  updated_at: string;
  event_count?: number;
  total_spent?: number;
}

export default function ClientsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [stats, setStats] = useState({ total: 0, totalEvents: 0, totalRevenue: 0 });

  const fetchClients = async () => {
    if (!profile?.entity_id) return;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('entity_id', profile.entity_id)
      .order('name');

    if (error) {
      toast({ title: 'Erro ao carregar clientes', description: error.message, variant: 'destructive' });
      return;
    }

    // Fetch event counts and revenue per client
    const { data: events } = await supabase
      .from('events')
      .select('client_id, budget')
      .eq('entity_id', profile.entity_id)
      .not('client_id', 'is', null);

    const eventMap: Record<string, { count: number; total: number }> = {};
    (events || []).forEach((e: any) => {
      if (!e.client_id) return;
      if (!eventMap[e.client_id]) eventMap[e.client_id] = { count: 0, total: 0 };
      eventMap[e.client_id].count++;
      eventMap[e.client_id].total += e.budget || 0;
    });

    const enriched = (data || []).map((c: any) => ({
      ...c,
      event_count: eventMap[c.id]?.count || 0,
      total_spent: eventMap[c.id]?.total || 0,
    })) as Client[];

    setClients(enriched);
    setStats({
      total: enriched.length,
      totalEvents: enriched.reduce((sum, c) => sum + (c.event_count || 0), 0),
      totalRevenue: enriched.reduce((sum, c) => sum + (c.total_spent || 0), 0),
    });
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [profile?.entity_id]);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false)
    );
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cliente excluído' });
      fetchClients();
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingClient(null);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1">Gerencie os clientes da sua empresa</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Clientes</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eventos Realizados</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <ClientsTable
          clients={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Edit Dialog */}
        <ClientDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          client={editingClient}
          onSuccess={fetchClients}
        />

        {/* Create Dialog with Event */}
        <CreateClientWithEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onClientCreated={fetchClients}
          onEventCreated={() => {}}
        />
      </div>
    </DashboardLayout>
  );
}
