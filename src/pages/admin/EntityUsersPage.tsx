import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Search, ArrowLeft, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { Entity, Profile, UserRole, AppRole, ROLE_LABELS } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Power, PowerOff, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface EntityUserData {
  id: string;
  profile: Profile;
  roles: UserRole[];
}

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.enum(['entity_admin', 'decorator', 'employee', 'driver'] as const),
  phone: z.string().optional(),
  position: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const availableRoles: { value: AppRole; label: string }[] = [
  { value: 'entity_admin', label: ROLE_LABELS.entity_admin },
  { value: 'decorator', label: ROLE_LABELS.decorator },
  { value: 'employee', label: ROLE_LABELS.employee },
  { value: 'driver', label: ROLE_LABELS.driver },
];

export default function AdminEntityUsersPage() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [entity, setEntity] = useState<Entity | null>(null);
  const [users, setUsers] = useState<EntityUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
      phone: '',
      position: '',
    },
  });

  const fetchEntity = useCallback(async () => {
    if (!entityId) return;
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .maybeSingle();
    if (error) {
      console.error(error);
      return;
    }
    setEntity(data as Entity);
  }, [entityId]);

  const fetchUsers = useCallback(async () => {
    if (!entityId) return;
    try {
      setIsLoading(true);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('entity_id', entityId);

      if (rolesError) throw rolesError;

      const combined: EntityUserData[] = (profilesData || []).map((p: any) => ({
        id: p.id,
        profile: p as Profile,
        roles: (rolesData || []).filter((r: any) => r.user_id === p.id) as UserRole[],
      }));

      setUsers(combined);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os usuários.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [entityId, toast]);

  useEffect(() => {
    fetchEntity();
    fetchUsers();
  }, [fetchEntity, fetchUsers]);

  const filteredUsers = users.filter((u) =>
    u.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRole = (u: EntityUserData): string => {
    const role = u.roles[0]?.role;
    return role ? ROLE_LABELS[role] || role : 'Sem papel';
  };

  const handleCreateUser = async (data: UserFormData) => {
    if (!entityId) return;
    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            entity_id: entityId,
            phone: data.phone,
            position: data.position,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // The trigger creates profile + default 'user' role.
      // We need to update the role to the selected one.
      // Delete the default role and insert the correct one
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', authData.user.id)
        .eq('entity_id', entityId);

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          entity_id: entityId,
          role: data.role,
        });

      if (roleError) console.error('Role error:', roleError);

      toast({ title: 'Sucesso', description: 'Usuário criado com sucesso!' });
      setDialogOpen(false);
      form.reset();
      await fetchUsers();
    } catch (error: any) {
      let message = 'Não foi possível criar o usuário.';
      if (error.message?.includes('already registered')) {
        message = 'Este email já está cadastrado.';
      }
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: `Usuário ${isActive ? 'ativado' : 'desativado'}!` });
      await fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const changeUserRole = async (userId: string, newRole: AppRole) => {
    if (!entityId) return;
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('entity_id', entityId);
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        entity_id: entityId,
        role: newRole,
      });
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Papel atualizado!' });
      await fetchUsers();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/entities')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              {entity?.name || 'Carregando...'}
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Gerenciar usuários desta entidade
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                form.reset();
                setDialogOpen(true);
              }}
              className="bg-gradient-warm hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} usuário(s)
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum usuário cadastrado nesta entidade.</p>
            <p className="text-sm text-muted-foreground">Clique em "Novo Usuário" para começar.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.profile.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.profile.phone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{user.profile.position || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {getUserRole(user)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.profile.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }
                      >
                        {user.profile.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.profile.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {availableRoles.map((r) => (
                            <DropdownMenuItem
                              key={r.value}
                              onClick={() => changeUserRole(user.id, r.value)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Definir como {r.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleUserStatus(user.id, !user.profile.is_active)}
                          >
                            {user.profile.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              Novo Usuário — {entity?.name}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do usuário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Decorador" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Usuário
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
