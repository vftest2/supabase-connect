import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pencil, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  client_type: 'standard' | 'vip' | 'premium';
  event_count?: number;
  total_spent?: number;
}

const typeStyles: Record<string, string> = {
  standard: 'bg-secondary text-secondary-foreground',
  vip: 'bg-warning/15 text-warning',
  premium: 'bg-primary/15 text-primary',
};

const typeLabels: Record<string, string> = {
  standard: 'Standard',
  vip: 'VIP',
  premium: 'Premium',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientsTable({ clients, onEdit, onDelete }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>Nenhum cliente encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-center">Eventos</TableHead>
            <TableHead className="text-right">Total Gasto</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {client.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{client.name}</p>
                    <Badge className={cn('text-[10px] mt-0.5', typeStyles[client.client_type])}>
                      {typeLabels[client.client_type]}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="text-foreground">{client.email || '—'}</p>
                  <p className="text-muted-foreground text-xs">{client.phone || '—'}</p>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{client.event_count || 0}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(client.total_spent || 0)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(client)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir {client.name}? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(client.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
