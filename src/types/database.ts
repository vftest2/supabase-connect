export type AppRole = 'super_admin' | 'entity_admin' | 'manager' | 'user' | 'decorator' | 'employee' | 'driver';
export type EventStatus = 'budget' | 'confirmed' | 'in_assembly' | 'in_transit' | 'finished' | 'planning' | 'in_progress' | 'assembly' | 'completed' | 'cancelled';
export type DecorationStatus = 'pending' | 'in_transit' | 'delivered' | 'installed' | 'returned';
export type RentalStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ContractStatus = 'pending' | 'sent' | 'signed' | 'cancelled';
export type DamageSeverity = 'minor' | 'moderate' | 'severe';
export type DamageStatus = 'pending' | 'repairing' | 'resolved' | 'written_off';

export interface Entity {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  settings: Record<string, unknown>;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  sidebar_color: string | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  entity_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  entity_id: string;
  role: AppRole;
  created_at: string;
}

export interface Event {
  id: string;
  entity_id: string;
  client_id: string | null;
  name: string;
  title: string;
  description: string | null;
  event_type: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  event_date: string;
  event_time: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  address: string | null;
  theme: string | null;
  status: EventStatus;
  budget: number | null;
  total_value: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  id: string;
  event_id: string;
  entity_id: string;
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface EventAssignedUser {
  id: string;
  event_id: string;
  entity_id: string;
  user_id: string;
  created_at: string;
}

export interface DecorationItem {
  id: string;
  entity_id: string;
  event_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  status: DecorationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  entity_id: string;
  event_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  departure_date: string | null;
  return_date: string | null;
  actual_departure_date: string | null;
  actual_return_date: string | null;
  total_value: number;
  status: RentalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalItem {
  id: string;
  rental_id: string;
  entity_id: string;
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  checked_out: boolean;
  checked_in: boolean;
  returned_quantity: number;
  damaged_quantity: number;
  lost_quantity: number;
  notes: string | null;
  created_at: string;
}

export interface ItemDamage {
  id: string;
  entity_id: string;
  inventory_item_id: string | null;
  rental_id: string | null;
  rental_item_id: string | null;
  description: string;
  severity: DamageSeverity;
  quantity: number;
  photos: string[] | null;
  repair_cost: number | null;
  status: DamageStatus;
  notes: string | null;
  registered_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemHistory {
  id: string;
  entity_id: string;
  inventory_item_id: string | null;
  rental_id: string | null;
  event_id: string | null;
  action_type: string;
  quantity: number | null;
  notes: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  entity_id: string;
  event_id: string;
  client_id: string | null;
  document_name: string;
  document_url: string | null;
  status: ContractStatus;
  clicksign_document_key: string | null;
  clicksign_signer_key: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventUpdate {
  id: string;
  entity_id: string;
  event_id: string;
  user_id: string | null;
  action: string;
  description: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface Comment {
  id: string;
  entity_id: string;
  event_id: string;
  user_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: UserRole[];
  entity: Entity | null;
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  budget: 'Orçamento',
  confirmed: 'Confirmado',
  in_assembly: 'Em Montagem',
  in_transit: 'Em Trânsito',
  finished: 'Finalizado',
  // Legacy
  planning: 'Planejamento',
  in_progress: 'Em Andamento',
  assembly: 'Montagem',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const DECORATION_STATUS_LABELS: Record<DecorationStatus, string> = {
  pending: 'Pendente',
  in_transit: 'Em Trânsito',
  delivered: 'Entregue',
  installed: 'Instalado',
  returned: 'Devolvido',
};

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  signed: 'Assinado',
  cancelled: 'Cancelado',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  entity_admin: 'Administrador',
  manager: 'Gerente',
  user: 'Usuário',
  decorator: 'Decorador',
  employee: 'Funcionário',
  driver: 'Motorista',
};

export const EVENT_TYPES = [
  'Casamento',
  'Aniversário Infantil',
  'Aniversário Adulto',
  'Festa de 15 Anos',
  'Formatura',
  'Evento Corporativo',
  'Chá de Bebê',
  'Batizado',
  'Outro',
];
