import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, Clock,
  DollarSign, Calendar, ExternalLink, Plus, Loader2, Camera
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RentalItem, Rental, ItemDamage, ItemHistory, RENTAL_STATUS_LABELS } from '@/types/database';
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

const RENTAL_STATUSES = ['draft', 'pending', 'in_progress', 'completed', 'cancelled'];

const severityLabels: Record<string, string> = {
  minor: 'Leve',
  moderate: 'Moderado',
  severe: 'Grave',
};

const damageStatusLabels: Record<string, string> = {
  pending: 'Pendente',
  repairing: 'Em Reparo',
  resolved: 'Resolvido',
  written_off: 'Baixado',
};

const damageStatusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  repairing: 'bg-primary/15 text-primary',
  resolved: 'bg-success/15 text-success',
  written_off: 'bg-muted text-muted-foreground',
};

export default function RentalDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [rental, setRental] = useState<Rental | null>(null);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [damages, setDamages] = useState<ItemDamage[]>([]);
  const [history, setHistory] = useState<ItemHistory[]>([]);
  const [linkedEventTitle, setLinkedEventTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Damage dialog state
  const [isDamageDialogOpen, setIsDamageDialogOpen] = useState(false);
  const [damageItemId, setDamageItemId] = useState<string | null>(null);
  const [damageItemName, setDamageItemName] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageSeverity, setDamageSeverity] = useState('minor');
  const [damageQuantity, setDamageQuantity] = useState('1');
  const [damageRepairCost, setDamageRepairCost] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [isSubmittingDamage, setIsSubmittingDamage] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !profile?.entity_id) return;

    const [rentalRes, itemsRes, damagesRes, historyRes] = await Promise.all([
      supabase.from('rentals').select('*').eq('id', id).eq('entity_id', profile.entity_id).maybeSingle(),
      supabase.from('rental_items').select('*').eq('rental_id', id).order('created_at'),
      supabase.from('item_damages').select('*').eq('rental_id', id).order('created_at', { ascending: false }),
      supabase.from('item_history').select('*').eq('rental_id', id).order('created_at', { ascending: false }),
    ]);

    if (!rentalRes.data) { navigate('/rentals'); return; }
    setRental(rentalRes.data as unknown as Rental);
    setItems((itemsRes.data || []) as unknown as RentalItem[]);
    setDamages((damagesRes.data || []) as unknown as ItemDamage[]);
    setHistory((historyRes.data || []) as unknown as ItemHistory[]);

    // Fetch linked event title
    if (rentalRes.data.event_id) {
      const { data: eventData } = await supabase
        .from('events').select('title').eq('id', rentalRes.data.event_id).maybeSingle();
      setLinkedEventTitle(eventData?.title || null);
    }

    setIsLoading(false);
  }, [id, profile?.entity_id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const logHistory = async (actionType: string, quantity?: number, notes?: string, inventoryItemId?: string | null) => {
    if (!rental || !profile?.entity_id) return;
    await supabase.from('item_history').insert({
      entity_id: profile.entity_id,
      rental_id: rental.id,
      event_id: rental.event_id || null,
      inventory_item_id: inventoryItemId || null,
      action_type: actionType,
      quantity: quantity || null,
      notes: notes || null,
    });
  };

  const toggleCheckedOut = async (item: RentalItem) => {
    const newVal = !item.checked_out;
    await supabase.from('rental_items').update({ checked_out: newVal } as any).eq('id', item.id);
    setItems(items.map(i => i.id === item.id ? { ...i, checked_out: newVal } : i));
    await logHistory(newVal ? 'checked_out' : 'checkout_reverted', item.quantity, `Item: ${item.name}`, item.inventory_item_id);
  };

  const toggleCheckedIn = async (item: RentalItem) => {
    const newVal = !item.checked_in;
    const update: any = { checked_in: newVal };
    if (newVal) update.returned_quantity = item.quantity;
    else update.returned_quantity = 0;
    await supabase.from('rental_items').update(update).eq('id', item.id);
    setItems(items.map(i => i.id === item.id ? { ...i, checked_in: newVal, returned_quantity: newVal ? item.quantity : 0 } : i));
    await logHistory(newVal ? 'checked_in' : 'checkin_reverted', item.quantity, `Item: ${item.name}`, item.inventory_item_id);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!rental || !profile?.entity_id) return;
    setIsChangingStatus(true);
    try {
      const update: any = { status: newStatus };
      if (newStatus === 'in_progress' && !rental.actual_departure_date) {
        update.actual_departure_date = new Date().toISOString();
      }
      if (newStatus === 'completed' && !rental.actual_return_date) {
        update.actual_return_date = new Date().toISOString();
      }
      const { error } = await supabase.from('rentals').update(update).eq('id', rental.id);
      if (error) throw error;
      await logHistory('status_changed', null, `Status: ${RENTAL_STATUS_LABELS[rental.status as keyof typeof RENTAL_STATUS_LABELS]} → ${RENTAL_STATUS_LABELS[newStatus as keyof typeof RENTAL_STATUS_LABELS]}`);
      toast({ title: 'Status atualizado' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const openDamageDialog = (item: RentalItem) => {
    setDamageItemId(item.id);
    setDamageItemName(item.name);
    setDamageDescription('');
    setDamageSeverity('minor');
    setDamageQuantity('1');
    setDamageRepairCost('');
    setDamageNotes('');
    setIsDamageDialogOpen(true);
  };

  const handleRegisterDamage = async () => {
    if (!rental || !profile?.entity_id || !damageDescription.trim()) return;
    setIsSubmittingDamage(true);
    try {
      const rentalItem = items.find(i => i.id === damageItemId);
      const qty = parseInt(damageQuantity) || 1;

      const { error } = await supabase.from('item_damages').insert({
        entity_id: profile.entity_id,
        rental_id: rental.id,
        rental_item_id: damageItemId,
        inventory_item_id: rentalItem?.inventory_item_id || null,
        description: damageDescription.trim(),
        severity: damageSeverity,
        quantity: qty,
        repair_cost: damageRepairCost ? parseFloat(damageRepairCost) : null,
        notes: damageNotes.trim() || null,
        registered_by: user?.id || null,
        status: 'pending',
      });
      if (error) throw error;

      // Update rental_item damaged_quantity
      if (rentalItem) {
        await supabase.from('rental_items').update({
          damaged_quantity: (rentalItem.damaged_quantity || 0) + qty,
        } as any).eq('id', rentalItem.id);
      }

      await logHistory('damaged', qty, `${damageItemName}: ${damageDescription}`, rentalItem?.inventory_item_id);

      toast({ title: 'Dano registrado' });
      setIsDamageDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmittingDamage(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const historyActionLabels: Record<string, string> = {
    rental_created: 'Locação criada',
    checked_out: 'Saída registrada',
    checked_in: 'Retorno registrado',
    checkout_reverted: 'Saída revertida',
    checkin_reverted: 'Retorno revertido',
    damaged: 'Dano registrado',
    lost: 'Perda registrada',
    status_changed: 'Status alterado',
  };

  if (isLoading) {
    return <DashboardLayout><div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div></DashboardLayout>;
  }

  if (!rental) return null;

  const allOut = items.length > 0 && items.every(i => i.checked_out);
  const allIn = items.length > 0 && items.every(i => i.checked_in);
  const totalDamaged = items.reduce((s, i) => s + (i.damaged_quantity || 0), 0);
  const totalLost = items.reduce((s, i) => s + (i.lost_quantity || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rentals')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">{rental.title}</h1>
              {rental.description && <p className="text-sm text-muted-foreground">{rental.description}</p>}
              <Badge className={cn('mt-1', statusColors[rental.status])}>
                {RENTAL_STATUS_LABELS[rental.status as keyof typeof RENTAL_STATUS_LABELS]}
              </Badge>
            </div>
          </div>
          <Select value={rental.status} onValueChange={handleStatusChange} disabled={isChangingStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Alterar status" />
            </SelectTrigger>
            <SelectContent>
              {RENTAL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{RENTAL_STATUS_LABELS[s as keyof typeof RENTAL_STATUS_LABELS]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Linked Event */}
        {rental.event_id && (
          <Card className="shadow-card border-primary/20">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Evento vinculado</p>
                  <p className="font-medium">{linkedEventTitle || 'Evento'}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/events/${rental.event_id}`}><ExternalLink className="w-3 h-3 mr-1" /> Ver Evento</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Saída Prevista</p>
                  <p className="font-medium text-sm">{rental.departure_date ? format(parseISO(rental.departure_date), "d MMM yyyy", { locale: ptBR }) : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Retorno Previsto</p>
                  <p className="font-medium text-sm">{rental.return_date ? format(parseISO(rental.return_date), "d MMM yyyy", { locale: ptBR }) : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-warning" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(rental.total_value || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Danos / Perdas</p>
                  <p className="font-medium">{totalDamaged} / {totalLost}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="checklist" className="space-y-4">
          <TabsList>
            <TabsTrigger value="checklist" className="gap-1.5">
              <Package className="w-4 h-4" /> Checklist ({items.length})
            </TabsTrigger>
            <TabsTrigger value="damages" className="gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Danos ({damages.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="w-4 h-4" /> Histórico ({history.length})
            </TabsTrigger>
          </TabsList>

          {/* Checklist Tab */}
          <TabsContent value="checklist">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Itens da Locação</CardTitle>
                <CardDescription>
                  Controle de saída e retorno dos itens
                  {allOut && !allIn && <Badge className="ml-2 bg-primary/15 text-primary font-normal">Todos saíram</Badge>}
                  {allIn && <Badge className="ml-2 bg-success/15 text-success font-normal">Todos retornaram</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum item nesta locação</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_60px_80px_60px_60px_80px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                      <span>Item</span><span className="text-center">Qtd</span><span className="text-right">Preço</span>
                      <span className="text-center">Saiu</span><span className="text-center">Voltou</span><span className="text-center">Ações</span>
                    </div>
                    {items.map(item => (
                      <div key={item.id} className="grid grid-cols-[1fr_60px_80px_60px_60px_80px] gap-2 items-center py-2 border-b border-border/30">
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{item.name}</span>
                          {(item.damaged_quantity > 0 || item.lost_quantity > 0) && (
                            <span className="text-xs text-destructive">
                              {item.damaged_quantity > 0 && `${item.damaged_quantity} danif.`}
                              {item.damaged_quantity > 0 && item.lost_quantity > 0 && ' / '}
                              {item.lost_quantity > 0 && `${item.lost_quantity} perd.`}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-center">{item.quantity}</span>
                        <span className="text-sm text-right">{formatCurrency(item.unit_price)}</span>
                        <div className="flex justify-center">
                          <Checkbox checked={item.checked_out} onCheckedChange={() => toggleCheckedOut(item)} />
                        </div>
                        <div className="flex justify-center">
                          <Checkbox checked={item.checked_in} onCheckedChange={() => toggleCheckedIn(item)} disabled={!item.checked_out} />
                        </div>
                        <div className="flex justify-center">
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => openDamageDialog(item)}>
                            <AlertTriangle className="w-3 h-3 mr-1" /> Dano
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Damages Tab */}
          <TabsContent value="damages">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Registro de Danos</CardTitle>
                <CardDescription>Danos e perdas registrados nesta locação</CardDescription>
              </CardHeader>
              <CardContent>
                {damages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum dano registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {damages.map(d => (
                      <div key={d.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{d.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{severityLabels[d.severity] || d.severity}</Badge>
                            <Badge className={cn('font-normal text-xs', damageStatusColors[d.status])}>
                              {damageStatusLabels[d.status] || d.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Qtd: {d.quantity}</span>
                          {d.repair_cost && <span>Custo reparo: {formatCurrency(d.repair_cost)}</span>}
                          <span>{format(parseISO(d.created_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                        {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Histórico de Movimentação</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum registro de movimentação</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map(h => (
                      <div key={h.id} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{historyActionLabels[h.action_type] || h.action_type}</p>
                          {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                          {h.quantity && <p className="text-xs text-muted-foreground">Quantidade: {h.quantity}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(h.created_at), "d MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Register Damage Dialog */}
      <Dialog open={isDamageDialogOpen} onOpenChange={setIsDamageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Dano</DialogTitle>
            <DialogDescription>Item: {damageItemName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição do Dano *</Label>
              <Textarea value={damageDescription} onChange={e => setDamageDescription(e.target.value)} placeholder="Descreva o dano observado..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Severidade</Label>
                <Select value={damageSeverity} onValueChange={setDamageSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Leve</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="severe">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min="1" value={damageQuantity} onChange={e => setDamageQuantity(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Custo de Reparo (R$)</Label>
              <Input type="number" step="0.01" min="0" value={damageRepairCost} onChange={e => setDamageRepairCost(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={damageNotes} onChange={e => setDamageNotes(e.target.value)} placeholder="Observações adicionais..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDamageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegisterDamage} disabled={!damageDescription.trim() || isSubmittingDamage}>
              {isSubmittingDamage ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Registrar Dano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
