
-- Create client_type enum
CREATE TYPE public.client_type AS ENUM ('standard', 'vip', 'premium');

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  notes TEXT,
  client_type client_type NOT NULL DEFAULT 'standard',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view clients from their entity"
  ON public.clients FOR SELECT
  TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can create clients in their entity"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can update clients in their entity"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Entity admins can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (
    entity_id = get_user_entity_id() 
    AND (has_role(auth.uid(), 'entity_admin') OR has_role(auth.uid(), 'manager'))
  );

-- Updated_at trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add client_id to events table (optional link)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
