import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Search, Users, Pencil, Power, PowerOff, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EntityDialog } from '@/components/super-admin/EntityDialog';
import { useEntities } from '@/hooks/useEntities';
import { Entity } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminEntitiesPage() {
  const {
    entities,
    isLoading,
    fetchEntities,
    createEntity,
    updateEntity,
    toggleEntityStatus,
  } = useEntities();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    entity: Entity | null;
    action: 'activate' | 'deactivate';
  }>({ open: false, entity: null, action: 'deactivate' });

  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingEntity(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (entity: Entity, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntity(entity);
    setDialogOpen(true);
  };

  const handleToggleClick = (entity: Entity, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      open: true,
      entity,
      action: entity.is_active ? 'deactivate' : 'activate',
    });
  };

  const handleConfirm = () => {
    if (confirmDialog.entity) {
      toggleEntityStatus(
        confirmDialog.entity.id,
        confirmDialog.action === 'activate'
      );
    }
    setConfirmDialog({ open: false, entity: null, action: 'deactivate' });
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, data);
      } else {
        await createEntity(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Entidades
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as empresas cadastradas no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchEntities}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenCreate} className="bg-gradient-warm hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Entidade
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">
          {filteredEntities.length} de {entities.length} entidade(s)
        </p>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma entidade cadastrada.</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Nova Entidade" para começar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntities.map((entity) => (
              <Card
                key={entity.id}
                className="shadow-card hover:shadow-soft transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/admin/entities/${entity.id}/users`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold font-display text-foreground group-hover:text-primary transition-colors">
                          {entity.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{entity.slug}</p>
                      </div>
                    </div>
                    <Badge
                      variant={entity.is_active ? 'default' : 'secondary'}
                      className={
                        entity.is_active
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      }
                    >
                      {entity.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Criado em {format(new Date(entity.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </p>

                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/entities/${entity.id}/users`);
                      }}
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      Usuários
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => handleOpenEdit(entity, e)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => handleToggleClick(entity, e)}
                    >
                      {entity.is_active ? (
                        <PowerOff className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Power className="h-3.5 w-3.5 text-success" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entity={editingEntity}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'activate' ? 'Ativar Entidade' : 'Desativar Entidade'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'activate'
                ? `Tem certeza que deseja ativar "${confirmDialog.entity?.name}"?`
                : `Tem certeza que deseja desativar "${confirmDialog.entity?.name}"? Os usuários desta entidade não poderão mais acessar o sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmDialog.action === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog.action === 'activate' ? 'Ativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
