import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserManager } from '@/components/settings/UserManager';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function TeamPage() {
  const { isEntityAdmin, isSuperAdmin } = useAuth();

  if (!isEntityAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da sua entidade</p>
        </div>
        <UserManager />
      </div>
    </DashboardLayout>
  );
}
