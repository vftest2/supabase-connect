import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Plus, X, CalendarDays, Users, Settings2, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EVENT_TYPES } from '@/types/database';
import { cn } from '@/lib/utils';

// --- Schemas ---
const clientSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').max(255).or(z.literal('')).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(1000).optional(),
  client_type: z.enum(['standard', 'vip', 'premium']),
});

type ClientFormData = z.infer<typeof clientSchema>;
type Modality = 'event' | 'event_rental' | 'rental_only';

interface EventFormData {
  title: string;
  event_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_value: string;
  address: string;
  description: string;
}

interface EntityUser {
  id: string;
  full_name: string;
  position: string | null;
  is_available: boolean;
  conflict_event?: string;
}

interface CreateClientWithEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
  onEventCreated?: () => void;
}

const defaultEventData: EventFormData = {
  title: '',
  event_type: '',
  status: 'budget',
  start_date: '',
  end_date: '',
  total_value: '',
  address: '',
  description: '',
};

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  const end = new Date(now);
  end.setHours(18, 0, 0, 0);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { start: fmt(start), end: fmt(end) };
}

export function CreateClientWithEventDialog({
  open,
  onOpenChange,
  onClientCreated,
  onEventCreated,
}: CreateClientWithEventDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [showEventPanel, setShowEventPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [modality, setModality] = useState<Modality>('event');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [entityUsers, setEntityUsers] = useState<EntityUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [clientData, setClientData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    client_type: 'standard',
  });

  const [eventData, setEventData] = useState<EventFormData>(() => {
    const { start, end } = getDefaultDates();
    return { ...defaultEventData, start_date: start, end_date: end };
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setShowEventPanel(false);
      setActiveTab('info');
      setModality('event');
      setSelectedUsers([]);
      setFormErrors({});
      setClientData({ name: '', email: '', phone: '', address: '', notes: '', client_type: 'standard' });
      const { start, end } = getDefaultDates();
      setEventData({ ...defaultEventData, start_date: start, end_date: end });
    }
  }, [open]);

  // Fetch entity users with availability check
  const fetchEntityUsers = useCallback(async () => {
    if (!profile?.entity_id || !eventData.start_date || !eventData.end_date) {
      setEntityUsers([]);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, position')
      .eq('entity_id', profile.entity_id)
      .eq('is_active', true)
      .order('full_name');

    if (!profiles) return;

    // Check conflicts
    const { data: assignments } = await supabase
      .from('event_assigned_users')
      .select('user_id, event_id, events!inner(title, start_date, end_date)')
      .eq('entity_id', profile.entity_id);

    const newStart = new Date(eventData.start_date);
    const newEnd = new Date(eventData.end_date);

    const users: EntityUser[] = (profiles || []).map((p: any) => {
      const conflict = (assignments || []).find((a: any) => {
        if (a.user_id !== p.id) return false;
        const ev = a.events as any;
        if (!ev?.start_date || !ev?.end_date) return false;
        const eStart = new Date(ev.start_date);
        const eEnd = new Date(ev.end_date);
        return newStart < eEnd && newEnd > eStart;
      });

      return {
        id: p.id,
        full_name: p.full_name,
        position: p.position,
        is_available: !conflict,
        conflict_event: conflict ? (conflict as any).events?.title : undefined,
      };
    });

    setEntityUsers(users);
  }, [profile?.entity_id, eventData.start_date, eventData.end_date]);

  useEffect(() => {
    if (showEventPanel && activeTab === 'team') {
      fetchEntityUsers();
    }
  }, [showEventPanel, activeTab, fetchEntityUsers]);

  // Force status when modality changes
  useEffect(() => {
    if (modality === 'event_rental' || modality === 'rental_only') {
      setEventData(prev => ({ ...prev, status: 'confirmed' }));
    }
  }, [modality]);

  const updateClient = (field: keyof ClientFormData, value: string) => {
    setClientData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const updateEvent = (field: keyof EventFormData, value: string) => {
    setEventData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => { const n = { ...prev }; delete n[`event_${field}`]; return n; });
  };

  const toggleUser = (userId: string) => {
    const user = entityUsers.find(u => u.id === userId);
    if (!user?.is_available) return;
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!profile?.entity_id) return;

    // Validate client
    const clientResult = clientSchema.safeParse(clientData);
    const errors: Record<string, string> = {};

    if (!clientResult.success) {
      clientResult.error.errors.forEach(e => {
        errors[e.path[0] as string] = e.message;
      });
    }

    // Validate event if panel is open
    if (showEventPanel) {
      if (!eventData.title.trim()) errors.event_title = 'Título é obrigatório';
      if (!eventData.start_date) errors.event_start_date = 'Data início é obrigatória';
      if (!eventData.end_date) errors.event_end_date = 'Data término é obrigatória';
      if (eventData.start_date && eventData.end_date && new Date(eventData.end_date) <= new Date(eventData.start_date)) {
        errors.event_end_date = 'Data término deve ser após a data de início';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: 'Erro de validação', description: 'Verifique os campos destacados.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Create client
      const clientPayload = {
        name: clientData.name.trim(),
        email: clientData.email?.trim() || null,
        phone: clientData.phone?.trim() || null,
        address: clientData.address?.trim() || null,
        notes: clientData.notes?.trim() || null,
        client_type: clientData.client_type as 'standard' | 'vip' | 'premium',
        entity_id: profile.entity_id,
      };

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(clientPayload)
        .select('id')
        .single();

      if (clientError) throw clientError;

      let successMsg = 'Cliente criado com sucesso!';

      // 2. Create event/rental if panel is open
      if (showEventPanel && newClient) {
        const totalValue = eventData.total_value ? parseFloat(eventData.total_value) : 0;

        if (modality === 'rental_only') {
          // Create rental only
          const { error: rentalError } = await supabase.from('rentals').insert({
            entity_id: profile.entity_id,
            title: eventData.title.trim(),
            description: eventData.description.trim() || null,
            departure_date: eventData.start_date,
            return_date: eventData.end_date,
            client_id: newClient.id,
            total_value: totalValue,
            status: 'pending',
          });
          if (rentalError) throw rentalError;
          successMsg = 'Cliente e locação criados com sucesso!';
        } else {
          // Create event
          const eventStatus = modality === 'event_rental' ? 'confirmed' : eventData.status;
          const eventDate = eventData.start_date.split('T')[0];

          const { data: newEvent, error: eventError } = await supabase
            .from('events')
            .insert({
              entity_id: profile.entity_id,
              title: eventData.title.trim(),
              name: eventData.title.trim(),
              description: eventData.description.trim() || null,
              event_type: eventData.event_type || null,
              start_date: eventData.start_date,
              end_date: eventData.end_date,
              event_date: eventDate,
              address: eventData.address.trim() || null,
              client_id: newClient.id,
              total_value: totalValue,
              status: eventStatus as any,
            })
            .select('id')
            .single();

          if (eventError) throw eventError;

          // Assign team
          if (newEvent && selectedUsers.length > 0) {
            const assignments = selectedUsers.map(userId => ({
              event_id: newEvent.id,
              user_id: userId,
              entity_id: profile.entity_id,
            }));
            await supabase.from('event_assigned_users').insert(assignments);
          }

          successMsg = modality === 'event_rental'
            ? 'Cliente e evento com locação criados com sucesso!'
            : 'Cliente e evento criados com sucesso!';
        }

        onEventCreated?.();
      }

      toast({ title: 'Sucesso', description: successMsg });
      onClientCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isExpanded = showEventPanel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0 transition-all duration-300',
          isExpanded
            ? 'sm:max-w-6xl max-w-[95vw] h-[90vh]'
            : 'sm:max-w-md max-h-[90vh]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold font-display">Novo Cliente</h2>
            {!showEventPanel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setShowEventPanel(true)}
              >
                <Plus className="w-3 h-3" />
                evento
              </Button>
            )}
          </div>
          {showEventPanel && (
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold font-display text-primary">
                {modality === 'rental_only' ? 'Nova Locação' : 'Novo Evento'}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowEventPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={cn(
            'grid h-full',
            isExpanded ? 'lg:grid-cols-2' : 'grid-cols-1'
          )}>
            {/* Client Form */}
            <div className="p-6 space-y-4">
              <div>
                <Label className={cn(formErrors.name && 'text-destructive')}>Nome *</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={clientData.name}
                  onChange={e => updateClient('name', e.target.value)}
                  className={cn(formErrors.name && 'border-destructive')}
                  maxLength={100}
                />
                {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <Label>Tipo de Cliente</Label>
                <Select value={clientData.client_type} onValueChange={v => updateClient('client_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Padrão</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={cn(formErrors.email && 'text-destructive')}>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={clientData.email || ''}
                    onChange={e => updateClient('email', e.target.value)}
                    className={cn(formErrors.email && 'border-destructive')}
                    maxLength={255}
                  />
                  {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={clientData.phone || ''}
                    onChange={e => updateClient('phone', e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>

              <div>
                <Label>Endereço</Label>
                <Input
                  placeholder="Endereço completo"
                  value={clientData.address || ''}
                  onChange={e => updateClient('address', e.target.value)}
                  maxLength={255}
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre o cliente..."
                  value={clientData.notes || ''}
                  onChange={e => updateClient('notes', e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </div>
            </div>

            {/* Event Panel */}
            {isExpanded && (
              <div className="border-t lg:border-t-0 lg:border-l border-border p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="info" className="gap-1 text-xs">
                      <Info className="w-3 h-3" /> Informações
                    </TabsTrigger>
                    <TabsTrigger value="modality" className="gap-1 text-xs">
                      <Settings2 className="w-3 h-3" /> Modalidade
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-1 text-xs">
                      <Users className="w-3 h-3" /> Equipe
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab: Info */}
                  <TabsContent value="info" className="space-y-4 mt-0">
                    <div>
                      <Label className={cn(formErrors.event_title && 'text-destructive')}>Título do Evento *</Label>
                      <Input
                        placeholder="Ex: Casamento João e Maria"
                        value={eventData.title}
                        onChange={e => updateEvent('title', e.target.value)}
                        className={cn(formErrors.event_title && 'border-destructive')}
                      />
                      {formErrors.event_title && <p className="text-xs text-destructive mt-1">{formErrors.event_title}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Evento</Label>
                        <Select value={eventData.event_type} onValueChange={v => updateEvent('event_type', v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {EVENT_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={eventData.status}
                          onValueChange={v => updateEvent('status', v)}
                          disabled={modality === 'event_rental' || modality === 'rental_only'}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="budget">Orçamento</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="in_assembly">Em Montagem</SelectItem>
                            <SelectItem value="in_transit">Em Trânsito</SelectItem>
                            <SelectItem value="finished">Finalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className={cn(formErrors.event_start_date && 'text-destructive')}>Data/Hora Início *</Label>
                        <Input
                          type="datetime-local"
                          value={eventData.start_date}
                          onChange={e => updateEvent('start_date', e.target.value)}
                          className={cn(formErrors.event_start_date && 'border-destructive')}
                        />
                        {formErrors.event_start_date && <p className="text-xs text-destructive mt-1">{formErrors.event_start_date}</p>}
                      </div>
                      <div>
                        <Label className={cn(formErrors.event_end_date && 'text-destructive')}>Data/Hora Término *</Label>
                        <Input
                          type="datetime-local"
                          value={eventData.end_date}
                          onChange={e => updateEvent('end_date', e.target.value)}
                          className={cn(formErrors.event_end_date && 'border-destructive')}
                        />
                        {formErrors.event_end_date && <p className="text-xs text-destructive mt-1">{formErrors.event_end_date}</p>}
                      </div>
                    </div>

                    <div>
                      <Label>Cliente</Label>
                      <Input
                        value={clientData.name || '(nome do cliente)'}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label>Valor Total R$</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={eventData.total_value}
                        onChange={e => updateEvent('total_value', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Endereço do Evento</Label>
                      <Input
                        placeholder="Local do evento"
                        value={eventData.address}
                        onChange={e => updateEvent('address', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Detalhes do evento..."
                        value={eventData.description}
                        onChange={e => updateEvent('description', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Modality */}
                  <TabsContent value="modality" className="space-y-3 mt-0">
                    {([
                      {
                        value: 'event' as Modality,
                        title: 'Evento Normal',
                        desc: 'Apenas registro do evento. Status editável livremente.',
                        icon: CalendarDays,
                      },
                      {
                        value: 'event_rental' as Modality,
                        title: 'Evento + Locação',
                        desc: 'Locação criada automaticamente ao confirmar. Status forçado para "Confirmado".',
                        icon: CalendarDays,
                      },
                      {
                        value: 'rental_only' as Modality,
                        title: 'Apenas Locação',
                        desc: 'Sem evento associado. Cria diretamente uma locação com status "Pendente".',
                        icon: Settings2,
                      },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setModality(opt.value)}
                        className={cn(
                          'w-full text-left p-4 rounded-lg border-2 transition-all',
                          modality === opt.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <opt.icon className={cn(
                            'w-5 h-5 mt-0.5 flex-shrink-0',
                            modality === opt.value ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <div>
                            <p className="font-medium text-sm">{opt.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </TabsContent>

                  {/* Tab: Team */}
                  <TabsContent value="team" className="mt-0">
                    {!eventData.start_date || !eventData.end_date ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Defina as datas primeiro na aba "Informações"
                      </div>
                    ) : entityUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum usuário encontrado na entidade
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {entityUsers.map(user => (
                          <div
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                              !user.is_available && 'opacity-50 cursor-not-allowed',
                              selectedUsers.includes(user.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-muted-foreground/30'
                            )}
                          >
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              disabled={!user.is_available}
                              className="pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{user.full_name}</p>
                              {user.position && (
                                <p className="text-xs text-muted-foreground">{user.position}</p>
                              )}
                            </div>
                            {!user.is_available && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Ocupado
                              </Badge>
                            )}
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground pt-2">
                          {selectedUsers.length} selecionado(s)
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
