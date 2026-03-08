import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Filter, DollarSign, Camera, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DamageRecord {
  id: string;
  description: string;
  severity: string;
  quantity: number;
  repair_cost: number | null;
  status: string;
  photos: string[] | null;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
  rental_id: string | null;
}

const severityLabels: Record<string, { label: string; color: string }> = {
  minor: { label: 'Leve', color: 'bg-muted text-muted-foreground' },
  moderate: { label: 'Moderado', color: 'bg-warning/15 text-warning' },
  severe: { label: 'Grave', color: 'bg-destructive/15 text-destructive' },
  total_loss: { label: 'Perda Total', color: 'bg-destructive text-destructive-foreground' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-warning/15 text-warning' },
  repairing: { label: 'Em Reparo', color: 'bg-primary/15 text-primary' },
  resolved: { label: 'Resolvido', color: 'bg-success/15 text-success' },
  written_off: { label: 'Baixado', color: 'bg-muted text-muted-foreground' },
};

export default function DamagesPage() {
  const { entity } = useAuth();
  const { toast } = useToast();

  const [damages, setDamages] = useState<DamageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchDamages = useCallback(async () => {
    if (!entity) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('item_damages')
        .select('*')
        .eq('entity_id', entity.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDamages((data || []) as DamageRecord[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [entity]);

  useEffect(() => { fetchDamages(); }, [fetchDamages]);

  const filteredDamages = filterStatus === 'all'
    ? damages
    : damages.filter(d => d.status === filterStatus);

  const updateDamageStatus = async (damageId: string, newStatus: string) => {
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'written_off') {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('item_damages').update(updates).eq('id', damageId);
      if (error) throw error;
      toast({ title: 'Status atualizado!' });
      await fetchDamages();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const totalCost = damages
    .filter(d => d.status !== 'resolved')
    .reduce((sum, d) => sum + (d.repair_cost || 0), 0);

  const pendingCount = damages.filter(d => d.status === 'pending').length;
  const repairingCount = damages.filter(d => d.status === 'repairing').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">Avarias</h1>
            <p className="text-muted-foreground mt-1">Registro consolidado de danos e perdas</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{repairingCount}</p>
                <p className="text-sm text-muted-foreground">Em Reparo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Custo Pendente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="repairing">Em Reparo</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="written_off">Baixados</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filteredDamages.length} registro(s)</p>
        </div>

        {/* Damages List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : filteredDamages.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma avaria registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDamages.map((damage) => {
              const sev = severityLabels[damage.severity] || severityLabels.minor;
              const stat = statusLabels[damage.status] || statusLabels.pending;

              return (
                <Card key={damage.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={sev.color}>{sev.label}</Badge>
                          <Badge className={stat.color}>{stat.label}</Badge>
                          {damage.quantity > 1 && (
                            <Badge variant="outline">{damage.quantity}x</Badge>
                          )}
                        </div>
                        <p className="text-sm">{damage.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{format(parseISO(damage.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          {damage.repair_cost && (
                            <span className="font-medium text-destructive">R$ {Number(damage.repair_cost).toFixed(2)}</span>
                          )}
                        </div>
                        {damage.notes && (
                          <p className="text-xs text-muted-foreground italic">{damage.notes}</p>
                        )}

                        {/* Photos */}
                        {damage.photos && damage.photos.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {damage.photos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-md object-cover border hover:opacity-80 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={damage.status}
                          onValueChange={(val) => updateDamageStatus(damage.id, val)}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="repairing">Em Reparo</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="written_off">Baixado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
