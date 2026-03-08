import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ChecklistItem {
  id: string;
  event_id: string;
  entity_id: string;
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  checked_out: boolean;
  checked_in: boolean;
  return_condition: string;
  notes: string | null;
}

interface EventChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

const conditionLabels: Record<string, { label: string; color: string }> = {
  ok: { label: 'OK', color: 'bg-success/15 text-success' },
  damaged: { label: 'Danificado', color: 'bg-warning/15 text-warning' },
  lost: { label: 'Perdido', color: 'bg-destructive/15 text-destructive' },
};

export function EventChecklistDialog({ open, onOpenChange, eventId }: EventChecklistDialogProps) {
  const { entity } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  const fetchChecklist = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);

      // Fetch event title
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .maybeSingle();
      if (eventData) setEventTitle(eventData.title);

      // Fetch checklist items
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

      if (error) throw error;
      setItems((data || []) as ChecklistItem[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open) fetchChecklist();
  }, [open, fetchChecklist]);

  const generateFromEventItems = async () => {
    if (!entity) return;
    setIsGenerating(true);
    try {
      const { data: eventItems, error } = await supabase
        .from('event_items')
        .select('id, name, quantity, inventory_item_id')
        .eq('event_id', eventId);

      if (error) throw error;
      if (!eventItems || eventItems.length === 0) {
        toast({ title: 'Sem itens', description: 'Este evento não possui itens cadastrados.', variant: 'destructive' });
        return;
      }

      const newItems = eventItems.map((ei) => ({
        event_id: eventId,
        entity_id: entity.id,
        inventory_item_id: ei.inventory_item_id,
        name: ei.name,
        quantity: ei.quantity,
      }));

      const { error: insertError } = await supabase.from('checklist_items').insert(newItems);
      if (insertError) throw insertError;

      toast({ title: 'Checklist gerado!', description: `${newItems.length} itens adicionados.` });
      await fetchChecklist();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateItem = async (itemId: string, updates: Partial<ChecklistItem>) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update(updates)
        .eq('id', itemId);
      if (error) throw error;

      setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));

      // Log history if check-out or check-in
      if (updates.checked_out !== undefined || updates.checked_in !== undefined) {
        const item = items.find(i => i.id === itemId);
        if (item && entity) {
          await supabase.from('item_history').insert({
            entity_id: entity.id,
            inventory_item_id: item.inventory_item_id,
            event_id: eventId,
            action_type: updates.checked_out ? 'checked_out' : 'checked_in',
            quantity: item.quantity,
            notes: updates.checked_out
              ? `Saída: ${item.name} (${item.quantity}x)`
              : `Retorno: ${item.name} (${item.quantity}x) - ${conditionLabels[updates.return_condition || item.return_condition]?.label || 'OK'}`,
          });
        }
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const checkedOutCount = items.filter(i => i.checked_out).length;
  const checkedInCount = items.filter(i => i.checked_in).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Checklist — {eventTitle}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        {items.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Saída: {checkedOutCount}/{items.length}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Retorno: {checkedInCount}/{items.length}
            </Badge>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum item no checklist</p>
              <Button onClick={generateFromEventItems} disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar a partir dos itens do evento
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start gap-3">
                  {/* Check-out */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <Checkbox
                      checked={item.checked_out}
                      onCheckedChange={(checked) => updateItem(item.id, { checked_out: !!checked })}
                    />
                    <span className="text-[10px] text-muted-foreground">Saiu</span>
                  </div>

                  {/* Check-in */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <Checkbox
                      checked={item.checked_in}
                      onCheckedChange={(checked) => updateItem(item.id, { checked_in: !!checked })}
                      disabled={!item.checked_out}
                    />
                    <span className="text-[10px] text-muted-foreground">Voltou</span>
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.name}</p>
                      <Badge variant="secondary" className="text-xs">{item.quantity}x</Badge>
                    </div>

                    {item.checked_in && (
                      <div className="mt-2 flex items-center gap-2">
                        <Select
                          value={item.return_condition}
                          onValueChange={(val) => updateItem(item.id, { return_condition: val })}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ok">✅ OK</SelectItem>
                            <SelectItem value="damaged">⚠️ Danificado</SelectItem>
                            <SelectItem value="lost">❌ Perdido</SelectItem>
                          </SelectContent>
                        </Select>
                        {item.return_condition !== 'ok' && (
                          <Badge className={conditionLabels[item.return_condition]?.color}>
                            {conditionLabels[item.return_condition]?.label}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <Textarea
                      placeholder="Observações..."
                      value={item.notes || ''}
                      onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                      className="mt-2 text-xs h-8 min-h-[32px] resize-none"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
