import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Palette } from 'lucide-react';

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

  useEffect(() => {
    if (entity) {
      setPrimaryColor(entity.primary_color || '#E85A4F');
      setSecondaryColor(entity.secondary_color || '#F5F0EB');
      setAccentColor(entity.accent_color || '#E8A83C');
      setSidebarColor(entity.sidebar_color || '#1a1a2e');
      setTheme(entity.theme || 'dark');
      setLogoUrl(entity.logo_url);
    }
  }, [entity]);

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

      // Force reload to apply branding
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
          <CardTitle className="text-lg font-display">Logo</CardTitle>
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
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Cores</CardTitle>
          <CardDescription>Personalize as cores da interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cor Principal</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" disabled={!canEdit} />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} disabled={!canEdit} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" disabled={!canEdit} />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} disabled={!canEdit} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Acento</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" disabled={!canEdit} />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} disabled={!canEdit} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor da Sidebar</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" disabled={!canEdit} />
                <Input value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} disabled={!canEdit} className="flex-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Tema</CardTitle>
          <CardDescription>Escolha o tema visual da interface</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={theme} onValueChange={setTheme} disabled={!canEdit}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="auto">Automático</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Preview & Save */}
      {canEdit && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: primaryColor }} />
            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: secondaryColor }} />
            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: accentColor }} />
            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: sidebarColor }} />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-warm hover:opacity-90">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      )}
    </div>
  );
}
