import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { BrandingManager } from '@/components/settings/BrandingManager';
import { UserManager } from '@/components/settings/UserManager';

export default function SettingsPage() {
  const { isEntityAdmin, isSuperAdmin } = useAuth();
  const canManage = isEntityAdmin || isSuperAdmin;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua entidade</p>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList>
            <TabsTrigger value="branding">Identidade Visual</TabsTrigger>
            {canManage && <TabsTrigger value="users">Usuários</TabsTrigger>}
          </TabsList>

          <TabsContent value="branding">
            <BrandingManager />
          </TabsContent>

          {canManage && (
            <TabsContent value="users">
              <UserManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
