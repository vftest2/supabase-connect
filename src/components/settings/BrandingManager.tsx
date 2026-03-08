import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Palette, Check, Paintbrush } from 'lucide-react';
import { themePresets, type ThemePreset } from '@/lib/theme-presets';
import { cn } from '@/lib/utils';

export function BrandingManager() {
  const { entity, isEntityAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const canEdit = isEntityAdmin || isSuperAdmin;

  const [primaryColor, setPrimaryColor] = useState('#E85A4F');
  const [secondaryColor, setSecondaryColor] = useState('#F5F0EB');
  const [accentColor, setAccentColor] = useState('#E8A83C');
  const [sidebarColor, setSidebarColor] = useState('#1a1a2e');
  const [theme, setTheme] = useState('dark');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    if (entity) {
      setPrimaryColor(entity.primary_color || '#E85A4F');
      setSecondaryColor(entity.secondary_color || '#F5F0EB');
      setAccentColor(entity.accent_color || '#E8A83C');
      setSidebarColor(entity.sidebar_color || '#1a1a2e');
      setTheme(entity.theme || 'dark');
      setLogoUrl(entity.logo_url);

      // Detect current preset
      const match = themePresets.find(p =>
        p.colors.primary_color === (entity.primary_color || '#E85A4F') &&
        p.colors.secondary_color === (entity.secondary_color || '#F5F0EB') &&
        p.colors.accent_color === (entity.accent_color || '#E8A83C') &&
        p.colors.sidebar_color === (entity.sidebar_color || '#1a1a2e')
      );
      setSelectedPreset(match?.id || null);
    }
  }, [entity]);

  const applyPreset = (preset: ThemePreset) => {
    if (!canEdit) return;
    setPrimaryColor(preset.colors.primary_color);
    setSecondaryColor(preset.colors.secondary_color);
    setAccentColor(preset.colors.accent_color);
    setSidebarColor(preset.colors.sidebar_color);
    setSelectedPreset(preset.id);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entity) return;
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${entity.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('entity-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('entity-logos')
        .getPublicUrl(path);
      setLogoUrl(publicUrl);
      await supabase.from('entities').update({ logo_url: publicUrl }).eq('id', entity.id);
      toast({ title: 'Logo atualizado!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!entity) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('entities')
        .update({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          sidebar_color: sidebarColor,
          theme,
        })
        .eq('id', entity.id);
      if (error) throw error;
      toast({ title: 'Identidade visual atualizada!', description: 'As cores serão aplicadas após recarregar.' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!entity) return null;

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Upload className="h-5 w-5" /> Logo
          </CardTitle>
          <CardDescription>Logo da sua empresa exibido na sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain border" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
                <Palette className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {canEdit && (
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {isUploading ? 'Enviando...' : 'Alterar Logo'}
                    </span>
                  </Button>
                </Label>
                <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Paintbrush className="h-5 w-5" /> Templates de Cores
          </CardTitle>
          <CardDescription>Escolha um template pronto ou personalize as cores abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {themePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={!canEdit}
                className={cn(
                  'relative group rounded-xl border-2 p-3 text-left transition-all hover:shadow-md disabled:opacity-60',
                  selectedPreset === preset.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {selectedPreset === preset.id && (
                  <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {/* Color preview bar */}
                <div className="flex gap-1 mb-2.5">
                  <div className="h-8 flex-1 rounded-l-lg" style={{ backgroundColor: preset.preview.primary }} />
                  <div className="h-8 flex-1" style={{ backgroundColor: preset.preview.accent }} />
                  <div className="h-8 flex-1" style={{ backgroundColor: preset.preview.secondary }} />
                  <div className="h-8 flex-1 rounded-r-lg" style={{ backgroundColor: preset.preview.sidebar }} />
                </div>
                <p className="text-xs font-semibold truncate">{preset.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{preset.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Palette className="h-5 w-5" /> Cores Personalizadas
          </CardTitle>
          <CardDescription>Ajuste manualmente cada cor da interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorPicker label="Cor Principal" description="Botões, links e destaques" value={primaryColor} onChange={(v) => { setPrimaryColor(v); setSelectedPreset(null); }} disabled={!canEdit} />
            <ColorPicker label="Cor Secundária" description="Fundos e cards" value={secondaryColor} onChange={(v) => { setSecondaryColor(v); setSelectedPreset(null); }} disabled={!canEdit} />
            <ColorPicker label="Cor de Acento" description="Badges e alertas" value={accentColor} onChange={(v) => { setAccentColor(v); setSelectedPreset(null); }} disabled={!canEdit} />
            <ColorPicker label="Cor da Sidebar" description="Fundo do menu lateral" value={sidebarColor} onChange={(v) => { setSidebarColor(v); setSelectedPreset(null); }} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>

      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Tema</CardTitle>
          <CardDescription>Escolha o modo visual da interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { value: 'light', label: 'Claro', icon: '☀️' },
              { value: 'dark', label: 'Escuro', icon: '🌙' },
              { value: 'auto', label: 'Automático', icon: '💻' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => canEdit && setTheme(opt.value)}
                disabled={!canEdit}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all disabled:opacity-60',
                  theme === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview & Save */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              {/* Mini sidebar preview */}
              <div className="flex h-32">
                <div className="w-16 flex flex-col items-center gap-2 py-3" style={{ backgroundColor: sidebarColor }}>
                  <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: primaryColor }} />
                  <div className="h-1 w-6 rounded-full opacity-30" style={{ backgroundColor: secondaryColor }} />
                  <div className="h-1 w-6 rounded-full opacity-30" style={{ backgroundColor: secondaryColor }} />
                  <div className="h-1 w-6 rounded-full opacity-30" style={{ backgroundColor: secondaryColor }} />
                </div>
                {/* Mini content area */}
                <div className="flex-1 p-3 space-y-2" style={{ backgroundColor: secondaryColor }}>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 rounded-lg text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>Botão</div>
                    <div className="h-8 w-16 rounded-lg border text-[10px] font-bold flex items-center justify-center" style={{ borderColor: primaryColor, color: primaryColor }}>Outline</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 w-14 rounded-full text-[9px] font-semibold flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>Badge</div>
                    <div className="h-5 w-14 rounded-full text-[9px] font-semibold flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>Tag</div>
                  </div>
                  <div className="h-10 rounded-lg border p-2 flex items-center gap-2" style={{ backgroundColor: '#ffffff', borderColor: `${primaryColor}33` }}>
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: `${primaryColor}20` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: primaryColor }} title="Principal" />
                <div className="h-7 w-7 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: secondaryColor }} title="Secundária" />
                <div className="h-7 w-7 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: accentColor }} title="Acento" />
                <div className="h-7 w-7 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: sidebarColor }} title="Sidebar" />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-warm hover:opacity-90">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ColorPicker({ label, description, value, onChange, disabled }: {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            disabled={disabled}
          />
          <div className="h-10 w-10 rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: value }} />
        </div>
        <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="flex-1 font-mono text-sm" />
      </div>
    </div>
  );
}
