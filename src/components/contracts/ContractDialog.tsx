import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const contractSchema = z.object({
  document_name: z.string().trim().min(1, 'Nome é obrigatório').max(255),
  event_id: z.string().min(1, 'Selecione um evento'),
  client_id: z.string().optional(),
});

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ContractDialog({ open, onOpenChange, onSuccess }: ContractDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<{ id: string; title: string; name: string; client_id: string | null }[]>([]);

  const form = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: { document_name: '', event_id: '', client_id: '' },
  });

  useEffect(() => {
    if (!profile?.entity_id || !open) return;
    supabase.from('events').select('id, title, name, client_id').eq('entity_id', profile.entity_id).order('start_date', { ascending: false })
      .then(({ data }) => setEvents((data || []) as any));
    form.reset({ document_name: '', event_id: '', client_id: '' });
  }, [profile?.entity_id, open]);

  const onSubmit = async (values: z.infer<typeof contractSchema>) => {
    if (!profile?.entity_id) return;
    const event = events.find(e => e.id === values.event_id);
    const { error } = await supabase.from('contracts').insert({
      entity_id: profile.entity_id,
      event_id: values.event_id,
      client_id: event?.client_id || null,
      document_name: values.document_name,
      status: 'pending',
    } as any);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contrato criado' });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Novo Contrato</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="document_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Documento *</FormLabel>
                <FormControl><Input placeholder="Contrato de locação..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="event_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Evento *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title || e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Criando...' : 'Criar Contrato'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
