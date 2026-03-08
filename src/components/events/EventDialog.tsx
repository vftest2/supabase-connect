import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EVENT_STATUS_LABELS, EVENT_TYPES } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NEW_STATUSES = ['budget', 'confirmed', 'in_assembly', 'in_transit', 'finished'];

const eventSchema = z.object({
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres').max(255),
  description: z.string().max(1000).optional(),
  event_type: z.string().optional(),
  client_id: z.string().optional(),
  client_name: z.string().max(255).optional(),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de término é obrigatória'),
  location: z.string().max(500).optional(),
  address: z.string().max(1000).optional(),
  theme: z.string().max(255).optional(),
  status: z.string(),
  total_value: z.string().optional(),
  notes: z.string().max(2000).optional(),
  modality: z.enum(['normal', 'event_rental', 'rental_only']),
});

type EventForm = z.infer<typeof eventSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onSuccess: () => void;
}

export function EventDialog({ open, onOpenChange, event, onSuccess }: EventDialogProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { status: 'budget', modality: 'normal' },
  });

  useEffect(() => {
    if (!profile?.entity_id) return;
    supabase.from('clients').select('id, name').eq('entity_id', profile.entity_id).order('name')
      .then(({ data }) => setClients(data || []));
  }, [profile?.entity_id, open]);

  useEffect(() => {
    if (event) {
      reset({
        title: event.title || event.name,
        description: event.description || '',
        event_type: event.event_type || '',
        client_id: event.client_id || '',
        client_name: event.client_name || '',
        client_phone: event.client_phone || '',
        client_email: event.client_email || '',
        start_date: event.start_date ? event.start_date.slice(0, 16) : event.event_date + 'T08:00',
        end_date: event.end_date ? event.end_date.slice(0, 16) : event.event_date + 'T12:00',
        location: event.location || '',
        address: event.address || '',
        theme: event.theme || '',
        status: event.status,
        total_value: event.total_value?.toString() || event.budget?.toString() || '',
        notes: event.notes || '',
        modality: 'normal',
      });
    } else {
      reset({
        title: '', description: '', event_type: '', client_id: '', client_name: '',
        client_phone: '', client_email: '', start_date: '', end_date: '',
        location: '', address: '', theme: '', status: 'budget', total_value: '', notes: '',
        modality: 'normal',
      });
    }
  }, [event, open, reset]);

  const modality = watch('modality');

  const onSubmit = async (data: EventForm) => {
    if (!profile?.entity_id) return;

    try {
      if (data.modality === 'rental_only') {
        // Create rental directly, no event
        const { error } = await supabase.from('rentals').insert({
          entity_id: profile.entity_id,
          client_id: data.client_id || null,
          title: data.title,
          description: data.description || null,
          departure_date: data.start_date,
          return_date: data.end_date,
          total_value: data.total_value ? parseFloat(data.total_value) : 0,
          status: 'pending',
          notes: data.notes || null,
        } as any);
        if (error) throw error;
        toast({ title: 'Locação criada com sucesso' });
      } else {
        const startDate = new Date(data.start_date);
        const eventData: any = {
          entity_id: profile.entity_id,
          title: data.title,
          name: data.title,
          description: data.description || null,
          event_type: data.event_type || null,
          client_id: data.client_id || null,
          client_name: data.client_name || null,
          client_phone: data.client_phone || null,
          client_email: data.client_email || null,
          event_date: startDate.toISOString().split('T')[0],
          event_time: startDate.toTimeString().slice(0, 8),
          start_date: data.start_date,
          end_date: data.end_date,
          location: data.location || null,
          address: data.address || null,
          theme: data.theme || null,
          status: data.modality === 'event_rental' ? 'confirmed' : data.status,
          budget: data.total_value ? parseFloat(data.total_value) : null,
          total_value: data.total_value ? parseFloat(data.total_value) : 0,
          notes: data.notes || null,
          created_by: user?.id || null,
        };

        if (event) {
          const { error } = await supabase.from('events').update(eventData).eq('id', event.id);
          if (error) throw error;
          toast({ title: 'Evento atualizado' });
        } else {
          const { error } = await supabase.from('events').insert(eventData);
          if (error) throw error;
          toast({ title: data.modality === 'event_rental' ? 'Evento + Locação criados' : 'Evento criado' });
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível salvar' });
    }
  };

  const selectedClientId = watch('client_id');

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) setValue('client_name', client.name);
    }
  }, [selectedClientId, clients, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
          <DialogDescription>
            {event ? 'Atualize as informações do evento' : 'Preencha as informações para criar um novo evento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Modality selector (only for new events) */}
          {!event && (
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <div className="flex gap-2">
                {[
                  { value: 'normal', label: 'Evento Normal' },
                  { value: 'event_rental', label: 'Evento + Locação' },
                  { value: 'rental_only', label: 'Apenas Locação' },
                ].map((m) => (
                  <Button
                    key={m.value}
                    type="button"
                    variant={modality === m.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValue('modality', m.value as any)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
              {modality === 'event_rental' && (
                <p className="text-xs text-muted-foreground">O evento será criado com status "Confirmado" e uma locação será gerada automaticamente.</p>
              )}
              {modality === 'rental_only' && (
                <p className="text-xs text-muted-foreground">Nenhum evento será criado. Apenas uma locação direta.</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Ex: Casamento João e Maria" {...register('title')} className={errors.title ? 'border-destructive' : ''} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select value={watch('event_type') || ''} onValueChange={(v) => setValue('event_type', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Input placeholder="Tema da decoração" {...register('theme')} />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Detalhes sobre o evento..." rows={2} {...register('description')} />
            </div>

            <div className="space-y-2">
              <Label>Data/Hora Início *</Label>
              <Input type="datetime-local" {...register('start_date')} className={errors.start_date ? 'border-destructive' : ''} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Data/Hora Término *</Label>
              <Input type="datetime-local" {...register('end_date')} className={errors.end_date ? 'border-destructive' : ''} />
              {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Local</Label>
              <Input placeholder="Nome do local" {...register('location')} />
            </div>

            {modality !== 'rental_only' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEW_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{EVENT_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="sm:col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input placeholder="Rua, número, bairro, cidade..." {...register('address')} />
            </div>

            {/* Client selection */}
            <div className="sm:col-span-2">
              <Label>Cliente</Label>
              <Select value={watch('client_id') || ''} onValueChange={(v) => setValue('client_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Total (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register('total_value')} />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas adicionais..." rows={2} {...register('notes')} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-warm hover:opacity-90" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : event ? 'Salvar' : modality === 'rental_only' ? 'Criar Locação' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
