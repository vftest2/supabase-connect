import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, MapPin, User, Phone, Mail, DollarSign,
  Package, MessageSquare, History, Plus, Pencil, Trash2, Users,
  FileText, CheckCircle, ExternalLink, Loader2, Send
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Event, EventItem, EventAssignedUser, DecorationItem, Comment, EventUpdate,
  Contract, Rental, EventStatus,
  EVENT_STATUS_LABELS, DECORATION_STATUS_LABELS, CONTRACT_STATUS_LABELS, RENTAL_STATUS_LABELS
} from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EventDialog } from '@/components/events/EventDialog';
import { DecorationDialog } from '@/components/decorations/DecorationDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const statusColors: Record<string, string> = {
  budget: 'bg-muted text-muted-foreground',
  confirmed: 'bg-success/15 text-success',
  in_assembly: 'bg-warning/15 text-warning',
  in_transit: 'bg-primary/15 text-primary',
  finished: 'bg-muted text-muted-foreground',
  planning: 'bg-primary/15 text-primary',
  in_progress: 'bg-warning/15 text-warning',
  assembly: 'bg-accent/15 text-accent',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

const contractStatusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  sent: 'bg-primary/15 text-primary',
  signed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

const NEW_STATUSES = ['budget', 'confirmed', 'in_assembly', 'in_transit', 'finished'];

interface ProfileInfo {
  id: string;
  full_name: string;
  position: string | null;
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [eventItems, setEventItems] = useState<EventItem[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<(EventAssignedUser & { profile?: ProfileInfo })[]>([]);
  const [decorations, setDecorations] = useState<DecorationItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [linkedRental, setLinkedRental] = useState<Rental | null>(null);
  const [clientInfo, setClientInfo] = useState<{ name: string; email: string | null; phone: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isDecorationDialogOpen, setIsDecorationDialogOpen] = useState(false);
  const [selectedDecoration, setSelectedDecoration] = useState<DecorationItem | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Add item dialog state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('0');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Add team dialog state
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [entityProfiles, setEntityProfiles] = useState<ProfileInfo[]>([]);
  const [selectedTeamUsers, setSelectedTeamUsers] = useState<string[]>([]);

  // Contract dialog state
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [contractName, setContractName] = useState('');
  const [isCreatingContract, setIsCreatingContract] = useState(false);

  // Status change
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const fetchEventData = useCallback(async () => {
    if (!id || !profile?.entity_id) return;

    try {
      // Fetch all data in parallel
      const [eventRes, itemsRes, assignedRes, decorRes, commentsRes, updatesRes, contractsRes, rentalRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).eq('entity_id', profile.entity_id).maybeSingle(),
        supabase.from('event_items').select('*').eq('event_id', id).order('created_at'),
        supabase.from('event_assigned_users').select('*').eq('event_id', id),
        supabase.from('decoration_items').select('*').eq('event_id', id).order('created_at', { ascending: false }),
        supabase.from('comments').select('*').eq('event_id', id).order('created_at', { ascending: false }),
        supabase.from('event_updates').select('*').eq('event_id', id).order('created_at', { ascending: false }),
        supabase.from('contracts').select('*').eq('event_id', id).order('created_at', { ascending: false }),
        supabase.from('rentals').select('*').eq('event_id', id).maybeSingle(),
      ]);

      if (!eventRes.data) { navigate('/events'); return; }
      setEvent(eventRes.data as Event);
      setEventItems((itemsRes.data || []) as EventItem[]);
      setDecorations((decorRes.data || []) as DecorationItem[]);
      setComments((commentsRes.data || []) as Comment[]);
      setUpdates((updatesRes.data || []) as EventUpdate[]);
      setContracts((contractsRes.data || []) as unknown as Contract[]);
      setLinkedRental(rentalRes.data as Rental | null);

      // Fetch client info if client_id exists
      if (eventRes.data.client_id) {
        const { data: clientData } = await supabase
          .from('clients').select('name, email, phone').eq('id', eventRes.data.client_id).maybeSingle();
        setClientInfo(clientData);
      } else {
        setClientInfo(null);
      }

      // Fetch assigned user profiles
      const assigned = (assignedRes.data || []) as EventAssignedUser[];
      if (assigned.length > 0) {
        const userIds = assigned.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name, position').in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        setAssignedUsers(assigned.map(a => ({ ...a, profile: profileMap.get(a.user_id) })));
      } else {
        setAssignedUsers([]);
      }
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados do evento' });
    } finally {
      setIsLoading(false);
    }
  }, [id, profile?.entity_id, navigate, toast]);

  useEffect(() => { fetchEventData(); }, [fetchEventData]);

  // --- Status Change ---
  const handleStatusChange = async (newStatus: string) => {
    if (!event || !profile?.entity_id) return;
    setIsChangingStatus(true);
    try {
      const { error } = await supabase.from('events').update({ status: newStatus } as any).eq('id', event.id);
      if (error) throw error;

      // Log update
      await supabase.from('event_updates').insert({
        entity_id: profile.entity_id,
        event_id: event.id,
        user_id: user?.id || null,
        action: 'Status alterado',
        description: `De "${EVENT_STATUS_LABELS[event.status]}" para "${EVENT_STATUS_LABELS[newStatus]}"`,
        old_value: { status: event.status },
        new_value: { status: newStatus },
      } as any);

      toast({ title: 'Status atualizado' });
      fetchEventData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsChangingStatus(false);
    }
  };

  // --- Add Event Item ---
  const handleAddItem = async () => {
    if (!event || !profile?.entity_id || !newItemName.trim()) return;
    setIsAddingItem(true);
    try {
      const { error } = await supabase.from('event_items').insert({
        entity_id: profile.entity_id,
        event_id: event.id,
        name: newItemName.trim(),
        quantity: parseInt(newItemQty) || 1,
        unit_price: parseFloat(newItemPrice) || 0,
      });
      if (error) throw error;
      toast({ title: 'Item adicionado' });
      setIsAddItemOpen(false);
      setNewItemName(''); setNewItemQty('1'); setNewItemPrice('0');
      fetchEventData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase.from('event_items').delete().eq('id', itemId);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else { toast({ title: 'Item removido' }); fetchEventData(); }
  };

  // --- Team Management ---
  const openTeamDialog = async () => {
    if (!profile?.entity_id) return;
    const { data } = await supabase.from('profiles').select('id, full_name, position')
      .eq('entity_id', profile.entity_id).eq('is_active', true).order('full_name');
    setEntityProfiles((data || []) as ProfileInfo[]);
    setSelectedTeamUsers(assignedUsers.map(a => a.user_id));
    setIsAddTeamOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!event || !profile?.entity_id) return;
    try {
      // Delete all existing assignments
      await supabase.from('event_assigned_users').delete().eq('event_id', event.id);
      // Insert new
      if (selectedTeamUsers.length > 0) {
        const rows = selectedTeamUsers.map(uid => ({
          event_id: event.id,
          user_id: uid,
          entity_id: profile.entity_id,
        }));
        const { error } = await supabase.from('event_assigned_users').insert(rows);
        if (error) throw error;
      }
      toast({ title: 'Equipe atualizada' });
      setIsAddTeamOpen(false);
      fetchEventData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  // --- Comments ---
  const handleAddComment = async () => {
    if (!newComment.trim() || !event || !profile?.entity_id) return;
    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from('comments').insert({
        entity_id: profile.entity_id, event_id: event.id,
        user_id: user?.id, content: newComment.trim(), is_internal: true,
      });
      if (error) throw error;
      setNewComment('');
      fetchEventData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o comentário' });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // --- Contract ---
  const handleCreateContract = async () => {
    if (!event || !profile?.entity_id || !contractName.trim()) return;
    setIsCreatingContract(true);
    try {
      const { error } = await supabase.from('contracts').insert({
        entity_id: profile.entity_id,
        event_id: event.id,
        client_id: event.client_id || null,
        document_name: contractName.trim(),
        status: 'pending',
      });
      if (error) throw error;
      toast({ title: 'Contrato criado' });
      setIsContractDialogOpen(false);
      setContractName('');
      fetchEventData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsCreatingContract(false);
    }
  };

  // --- Decoration ---
  const handleDeleteDecoration = async (decorationId: string) => {
    const { error } = await supabase.from('decoration_items').delete().eq('id', decorationId);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o item' });
    else { setDecorations(decorations.filter(d => d.id !== decorationId)); toast({ title: 'Item removido' }); }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) return null;

  const itemsTotal = eventItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const decoTotal = decorations.reduce((s, d) => s + (d.unit_price || 0) * d.quantity, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{event.title || event.name}</h1>
              {event.event_type && <p className="text-sm text-muted-foreground">{event.event_type}</p>}
              <Badge className={cn('mt-1 font-normal', statusColors[event.status])}>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Change */}
            <Select value={event.status} onValueChange={handleStatusChange} disabled={isChangingStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                {NEW_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{EVENT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsEventDialogOpen(true)} variant="outline">
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-medium text-sm">
                    {event.start_date
                      ? format(parseISO(event.start_date), "d MMM yyyy 'às' HH:mm", { locale: ptBR })
                      : format(parseISO(event.event_date), "d MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Término</p>
                  <p className="font-medium text-sm">
                    {event.end_date
                      ? format(parseISO(event.end_date), "d MMM yyyy 'às' HH:mm", { locale: ptBR })
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(event.address || event.location) && (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="font-medium text-sm truncate">{event.address || event.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(event.total_value || event.budget || itemsTotal || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Info */}
        {(clientInfo || event.client_name) && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-lg font-display">Cliente</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{clientInfo?.name || event.client_name}</span>
                </div>
                {(clientInfo?.phone || event.client_phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{clientInfo?.phone || event.client_phone}</span>
                  </div>
                )}
                {(clientInfo?.email || event.client_email) && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{clientInfo?.email || event.client_email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Rental */}
        {linkedRental && (
          <Card className="shadow-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">Locação Vinculada</CardTitle>
                <CardDescription>{linkedRental.title}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('font-normal', {
                  'bg-muted text-muted-foreground': linkedRental.status === 'draft',
                  'bg-warning/15 text-warning': linkedRental.status === 'pending',
                  'bg-primary/15 text-primary': linkedRental.status === 'in_progress',
                  'bg-success/15 text-success': linkedRental.status === 'completed',
                })}>
                  {RENTAL_STATUS_LABELS[linkedRental.status as keyof typeof RENTAL_STATUS_LABELS] || linkedRental.status}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/rentals/${linkedRental.id}`}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Ver Locação
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="items" className="gap-1.5">
              <Package className="w-4 h-4" /> Itens ({eventItems.length})
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="w-4 h-4" /> Equipe ({assignedUsers.length})
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5">
              <FileText className="w-4 h-4" /> Contratos ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="decorations" className="gap-1.5">
              <Package className="w-4 h-4" /> Decorações ({decorations.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> Comentários ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-4 h-4" /> Histórico ({updates.length})
            </TabsTrigger>
          </TabsList>

          {/* --- ITEMS TAB --- */}
          <TabsContent value="items">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Itens do Evento</CardTitle>
                  <CardDescription>Itens alocados para este evento</CardDescription>
                </div>
                <Button onClick={() => setIsAddItemOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                </Button>
              </CardHeader>
              <CardContent>
                {eventItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum item adicionado</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                        <span>Item</span><span className="text-center">Qtd</span>
                        <span className="text-right">Preço Un.</span><span className="text-right">Subtotal</span><span />
                      </div>
                      {eventItems.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 items-center py-2 border-b border-border/30">
                          <span className="text-sm font-medium truncate">{item.name}</span>
                          <span className="text-sm text-center">{item.quantity}</span>
                          <span className="text-sm text-right">{formatCurrency(item.unit_price)}</span>
                          <span className="text-sm text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-3">
                      <span className="text-sm font-semibold">Total: {formatCurrency(itemsTotal)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- TEAM TAB --- */}
          <TabsContent value="team">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Equipe Atribuída</CardTitle>
                  <CardDescription>Membros da equipe responsáveis pelo evento</CardDescription>
                </div>
                <Button onClick={openTeamDialog} size="sm">
                  <Users className="w-4 h-4 mr-1" /> Gerenciar Equipe
                </Button>
              </CardHeader>
              <CardContent>
                {assignedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum membro atribuído</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {assignedUsers.map(au => (
                      <div key={au.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {au.profile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{au.profile?.full_name || 'Usuário'}</p>
                          {au.profile?.position && (
                            <p className="text-xs text-muted-foreground">{au.profile.position}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- CONTRACTS TAB --- */}
          <TabsContent value="contracts">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Contratos</CardTitle>
                  <CardDescription>Contratos vinculados a este evento</CardDescription>
                </div>
                <Button onClick={() => {
                  setContractName(`Contrato - ${event.title || event.name}`);
                  setIsContractDialogOpen(true);
                }} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Gerar Contrato
                </Button>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum contrato gerado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contracts.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{c.document_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(c.created_at), "d MMM yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.whatsapp_sent && <Badge variant="secondary" className="text-xs">WhatsApp ✓</Badge>}
                          {c.signed_at && (
                            <span className="text-xs text-success">
                              Assinado {format(parseISO(c.signed_at), "d MMM", { locale: ptBR })}
                            </span>
                          )}
                          <Badge className={cn('font-normal', contractStatusColors[c.status])}>
                            {CONTRACT_STATUS_LABELS[c.status as keyof typeof CONTRACT_STATUS_LABELS] || c.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- DECORATIONS TAB --- */}
          <TabsContent value="decorations">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Itens de Decoração</CardTitle>
                  <CardDescription>Gerencie os itens de decoração deste evento</CardDescription>
                </div>
                <Button onClick={() => { setSelectedDecoration(null); setIsDecorationDialogOpen(true); }} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {decorations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum item de decoração</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {decorations.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Qtd: {item.quantity}</span>
                            {item.unit_price && <span>{formatCurrency(item.unit_price * item.quantity)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{DECORATION_STATUS_LABELS[item.status]}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedDecoration(item); setIsDecorationDialogOpen(true); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteDecoration(item.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- COMMENTS TAB --- */}
          <TabsContent value="comments">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Comentários Internos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Textarea placeholder="Adicione um comentário..." value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} />
                  <Button onClick={handleAddComment} disabled={!newComment.trim() || isSubmittingComment}>Enviar</Button>
                </div>
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum comentário</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">U</AvatarFallback></Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-3">
                          <p className="text-sm">{c.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(parseISO(c.created_at), "d MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- HISTORY TAB --- */}
          <TabsContent value="history">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Histórico de Alterações</CardTitle>
              </CardHeader>
              <CardContent>
                {updates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma atualização registrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {updates.map(u => (
                      <div key={u.id} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{u.action}</p>
                          {u.description && <p className="text-xs text-muted-foreground">{u.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(u.created_at), "d MMM 'às' HH:mm", { locale: ptBR })}
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

      {/* --- DIALOGS --- */}

      {/* Edit Event Dialog */}
      <EventDialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} event={event} onSuccess={fetchEventData} />

      {/* Decoration Dialog */}
      <DecorationDialog open={isDecorationDialogOpen} onOpenChange={setIsDecorationDialogOpen} decoration={selectedDecoration} eventId={event.id} onSuccess={fetchEventData} />

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
            <DialogDescription>Adicione um item ao evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome do Item *</Label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: Mesa redonda" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Quantidade</Label><Input type="number" min="1" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} /></div>
              <div><Label>Preço Unitário (R$)</Label><Input type="number" step="0.01" min="0" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={!newItemName.trim() || isAddingItem}>
              {isAddingItem ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Equipe</DialogTitle>
            <DialogDescription>Selecione os membros para este evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {entityProfiles.map(p => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  selectedTeamUsers.includes(p.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                )}
                onClick={() => setSelectedTeamUsers(prev =>
                  prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                )}
              >
                <Checkbox checked={selectedTeamUsers.includes(p.id)} className="pointer-events-none" />
                <div>
                  <p className="text-sm font-medium">{p.full_name}</p>
                  {p.position && <p className="text-xs text-muted-foreground">{p.position}</p>}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTeamOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTeam}>{selectedTeamUsers.length} selecionado(s) — Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Contrato</DialogTitle>
            <DialogDescription>Crie um contrato para este evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome do Documento *</Label><Input value={contractName} onChange={e => setContractName(e.target.value)} placeholder="Ex: Contrato de locação" /></div>
            {clientInfo && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Cliente signatário</p>
                <p className="text-sm font-medium">{clientInfo.name}</p>
                {clientInfo.email && <p className="text-xs text-muted-foreground">{clientInfo.email}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContractDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateContract} disabled={!contractName.trim() || isCreatingContract}>
              {isCreatingContract ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
