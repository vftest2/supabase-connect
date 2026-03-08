import { useState } from 'react';
import { Loader2, Upload, X, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RegisterDamageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalItem: {
    id: string;
    inventory_item_id: string | null;
    name: string;
    quantity: number;
  };
  rental: {
    id: string;
    title: string;
  };
  onSuccess: () => void;
}

export function RegisterDamageDialog({ open, onOpenChange, rentalItem, rental, onSuccess }: RegisterDamageDialogProps) {
  const { entity, user } = useAuth();
  const { toast } = useToast();

  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [quantity, setQuantity] = useState(1);
  const [repairCost, setRepairCost] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !entity) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${entity.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('damage-photos')
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('damage-photos')
          .getPublicUrl(path);

        uploadedUrls.push(publicUrl);
      }
      setPhotos(prev => [...prev, ...uploadedUrls]);
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ title: 'Erro', description: 'Descrição do dano é obrigatória.', variant: 'destructive' });
      return;
    }
    if (!entity) return;

    setIsSaving(true);
    try {
      // 1. Insert damage
      const { error: damageError } = await supabase.from('item_damages').insert({
        entity_id: entity.id,
        rental_item_id: rentalItem.id,
        inventory_item_id: rentalItem.inventory_item_id,
        rental_id: rental.id,
        description: description.trim(),
        severity,
        quantity,
        repair_cost: repairCost ? parseFloat(repairCost) : null,
        photos: photos.length > 0 ? photos : null,
        notes: notes.trim() || null,
        status: 'pending',
        registered_by: user?.id || null,
      });
      if (damageError) throw damageError;

      // 2. Update rental item
      const { error: updateError } = await supabase
        .from('rental_items')
        .update({
          checked_in: true,
          returned_quantity: rentalItem.quantity - quantity,
          damaged_quantity: quantity,
        })
        .eq('id', rentalItem.id);
      if (updateError) throw updateError;

      // 3. Insert history
      await supabase.from('item_history').insert({
        entity_id: entity.id,
        inventory_item_id: rentalItem.inventory_item_id,
        rental_id: rental.id,
        action_type: 'damaged',
        quantity,
        notes: `Avaria registrada: ${description.trim()}`,
      });

      toast({ title: 'Avaria registrada!', description: `Dano em "${rentalItem.name}" registrado com sucesso.` });
      onSuccess();
      onOpenChange(false);

      // Reset
      setDescription('');
      setSeverity('minor');
      setQuantity(1);
      setRepairCost('');
      setNotes('');
      setPhotos([]);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            Registrar Avaria — {rentalItem.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição do Dano *</Label>
            <Textarea
              placeholder="Descreva o dano detalhadamente..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Severity + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gravidade</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="severe">Grave</SelectItem>
                  <SelectItem value="total_loss">Perda Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade Afetada</Label>
              <Input
                type="number"
                min={1}
                max={rentalItem.quantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label>Custo Estimado de Reparo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={repairCost}
              onChange={(e) => setRepairCost(e.target.value)}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Fotos do Dano</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-md object-cover border" />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(i)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Label htmlFor="damage-photo-upload" className="cursor-pointer">
                <div className="h-20 w-20 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </Label>
              <Input
                id="damage-photo-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea
              placeholder="Observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Registrando...' : 'Registrar Avaria'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
