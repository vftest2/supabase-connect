import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100),
});

const signupSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('login');
  const { signIn, signUp, isSuperAdmin, user, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (user && isSuperAdmin) {
      navigate('/admin/dashboard');
    }
  }, [user, isSuperAdmin, navigate]);

  // After login, check if user is super_admin. If not, sign out and show error.
  useEffect(() => {
    if (user && !isSuperAdmin && roles.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado',
        description: 'Você não tem permissão de administrador.',
      });
      // Sign out non-admin users
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase.auth.signOut();
      });
    }
  }, [user, isSuperAdmin, roles, toast]);

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        let message = 'Erro ao fazer login';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Por favor, confirme seu email antes de fazer login';
        }
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: message,
        });
        return;
      }

      toast({
        title: 'Verificando permissões...',
        description: 'Aguarde enquanto validamos seu acesso',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      // First we need to get/create the super admin entity
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get the super admin entity
      const { data: superEntity, error: entityError } = await supabase
        .from('entities')
        .select('id')
        .eq('is_super_admin', true)
        .maybeSingle();

      if (entityError || !superEntity) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Entidade Super Admin não encontrada. Configure o banco de dados primeiro.',
        });
        return;
      }

      const { error } = await signUp(data.email, data.password, {
        full_name: data.full_name,
        entity_id: superEntity.id,
      });

      if (error) {
        let message = 'Erro ao criar conta';
        if (error.message.includes('already registered')) {
          message = 'Este email já está cadastrado';
        }
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: message,
        });
        return;
      }

      // The trigger creates profile + 'user' role. We need to update to 'super_admin'.
      // This will be done after the user confirms email and logs in for the first time.
      // For now, we use the create_super_admin function via SQL.
      toast({
        title: 'Conta criada!',
        description: 'Verifique seu email para confirmar o cadastro. Após confirmar, um Super Admin existente precisa aprovar seu acesso.',
      });
      setActiveTab('login');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-foreground p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent shadow-lg mb-4">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-background">
            Acesso <span className="text-accent">Restrito</span>
          </h1>
          <p className="text-background/60 mt-2">
            Painel de Administração do Sistema
          </p>
        </div>

        <Card className="bg-card/10 backdrop-blur-sm border-background/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-display text-background">Super Admin</CardTitle>
            <CardDescription className="text-background/60">
              Este acesso é exclusivo para administradores do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-background/10">
                <TabsTrigger value="login" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-background/70">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-background/70">
                  Cadastro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-background">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="admin@sistema.com"
                      {...loginForm.register('email')}
                      className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 ${
                        loginForm.formState.errors.email ? 'border-destructive' : ''
                      }`}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-background">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...loginForm.register('password')}
                        className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 pr-10 ${
                          loginForm.formState.errors.password ? 'border-destructive' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-background/60 hover:text-background transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verificando...' : 'Acessar Painel'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-background">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      {...signupForm.register('full_name')}
                      className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 ${
                        signupForm.formState.errors.full_name ? 'border-destructive' : ''
                      }`}
                    />
                    {signupForm.formState.errors.full_name && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-background">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="admin@sistema.com"
                      {...signupForm.register('email')}
                      className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 ${
                        signupForm.formState.errors.email ? 'border-destructive' : ''
                      }`}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-background">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        {...signupForm.register('password')}
                        className={`bg-background/10 border-background/20 text-background placeholder:text-background/40 pr-10 ${
                          signupForm.formState.errors.password ? 'border-destructive' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-background/60 hover:text-background transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar Conta Admin'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-background/60 hover:text-background hover:bg-background/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login normal
          </Button>
        </div>
      </div>
    </div>
  );
}
