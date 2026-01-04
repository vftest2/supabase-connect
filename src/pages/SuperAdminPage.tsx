import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { StatsCards } from '@/components/super-admin/StatsCards';
import { EntitiesTable } from '@/components/super-admin/EntitiesTable';
import { EntityDialog } from '@/components/super-admin/EntityDialog';
import { useEntities } from '@/hooks/useEntities';
import { Entity } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdminPage() {
  const {
    entities,
    stats,
    isLoading,
    fetchEntities,
    fetchStats,
    createEntity,
    updateEntity,
    toggleEntityStatus,
  } = useEntities();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingEntity(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setDialogOpen(true);
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

  const handleRefresh = () => {
    fetchEntities();
    fetchStats();
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Painel Super Admin
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as entidades do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenCreate} className="bg-gradient-warm hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Entidade
            </Button>
          </div>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <StatsCards stats={stats} />
        )}

        {/* Entities Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold font-display">
              Entidades Cadastradas
            </h2>
            <p className="text-sm text-muted-foreground">
              {entities.length} entidade(s)
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <EntitiesTable
              entities={entities}
              onEdit={handleOpenEdit}
              onToggleStatus={toggleEntityStatus}
            />
          )}
        </div>
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entity={editingEntity}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </SuperAdminLayout>
  );
}
