import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, CheckCircle, Send } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Contract, CONTRACT_STATUS_LABELS } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractDialog } from '@/components/contracts/ContractDialog';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  sent: 'bg-primary/15 text-primary',
  signed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  sent: Send,
  signed: CheckCircle,
  cancelled: Clock,
};

export default function ContractsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchContracts = async () => {
    if (!profile?.entity_id) return;
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('entity_id', profile.entity_id)
      .order('created_at', { ascending: false });
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else setContracts((data || []) as unknown as Contract[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchContracts(); }, [profile?.entity_id]);

  const filtered = contracts.filter(c => c.document_name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return <DashboardLayout><div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground mt-1">Gerencie contratos e assinaturas</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-warm hover:opacity-90 gap-2">
            <Plus className="w-4 h-4" /> Novo Contrato
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {(['pending', 'sent', 'signed', 'cancelled'] as const).map(status => {
            const count = contracts.filter(c => c.status === status).length;
            const Icon = statusIcons[status];
            return (
              <Card key={status} className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{CONTRACT_STATUS_LABELS[status]}</CardTitle>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
              </Card>
            );
          })}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar contrato..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card className="shadow-card"><CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(contract => (
              <Card key={contract.id} className="shadow-card hover:shadow-soft transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contract.document_name}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(contract.created_at), "d MMM yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <Badge className={cn('font-normal', statusColors[contract.status])}>{CONTRACT_STATUS_LABELS[contract.status as keyof typeof CONTRACT_STATUS_LABELS]}</Badge>
                  </div>
                  {contract.signed_at && (
                    <p className="text-xs text-success">Assinado em {format(parseISO(contract.signed_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  )}
                  {contract.whatsapp_sent && (
                    <p className="text-xs text-muted-foreground">WhatsApp enviado ✓</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ContractDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchContracts} />
    </DashboardLayout>
  );
}
