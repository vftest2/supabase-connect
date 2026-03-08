
-- 1. Update event_status enum: drop old values and add new ones
-- We need to recreate the enum since ALTER TYPE doesn't support renaming values easily
-- First add new values
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'budget';
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'in_assembly';
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'in_transit';
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'finished';

-- 2. Add new columns to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0;

-- Migrate existing data: copy name to title, event_date to start_date/end_date
UPDATE public.events SET title = name WHERE title IS NULL;
UPDATE public.events SET start_date = (event_date::text || ' ' || COALESCE(event_time::text, '08:00:00'))::timestamp with time zone WHERE start_date IS NULL;
UPDATE public.events SET end_date = start_date + interval '4 hours' WHERE end_date IS NULL AND start_date IS NOT NULL;

-- Make title NOT NULL after migration
ALTER TABLE public.events ALTER COLUMN title SET NOT NULL;

-- 3. Create event_items table
CREATE TABLE IF NOT EXISTS public.event_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event items from their entity"
  ON public.event_items FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage event items in their entity"
  ON public.event_items FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

-- 4. Create event_assigned_users table
CREATE TABLE IF NOT EXISTS public.event_assigned_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_assigned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event assignments from their entity"
  ON public.event_assigned_users FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage event assignments in their entity"
  ON public.event_assigned_users FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

-- 5. Create rentals table
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  departure_date TIMESTAMP WITH TIME ZONE,
  return_date TIMESTAMP WITH TIME ZONE,
  actual_departure_date TIMESTAMP WITH TIME ZONE,
  actual_return_date TIMESTAMP WITH TIME ZONE,
  total_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rentals from their entity"
  ON public.rentals FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage rentals in their entity"
  ON public.rentals FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

CREATE TRIGGER update_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create rental_items table
CREATE TABLE IF NOT EXISTS public.rental_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  checked_out BOOLEAN DEFAULT false,
  checked_in BOOLEAN DEFAULT false,
  returned_quantity INTEGER DEFAULT 0,
  damaged_quantity INTEGER DEFAULT 0,
  lost_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rental items from their entity"
  ON public.rental_items FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage rental items in their entity"
  ON public.rental_items FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

-- 7. Create item_damages table
CREATE TABLE IF NOT EXISTS public.item_damages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  rental_item_id UUID REFERENCES public.rental_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  quantity INTEGER DEFAULT 1,
  photos TEXT[],
  repair_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  registered_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.item_damages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view damages from their entity"
  ON public.item_damages FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage damages in their entity"
  ON public.item_damages FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

CREATE TRIGGER update_item_damages_updated_at
  BEFORE UPDATE ON public.item_damages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create item_history table
CREATE TABLE IF NOT EXISTS public.item_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history from their entity"
  ON public.item_history FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage history in their entity"
  ON public.item_history FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

-- 9. Create contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  clicksign_document_key TEXT,
  clicksign_signer_key TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts from their entity"
  ON public.contracts FOR SELECT TO authenticated
  USING (entity_id = get_user_entity_id());

CREATE POLICY "Users can manage contracts in their entity"
  ON public.contracts FOR ALL TO authenticated
  USING (entity_id = get_user_entity_id())
  WITH CHECK (entity_id = get_user_entity_id());

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Create trigger for automatic rental creation on event confirmation
CREATE OR REPLACE FUNCTION public.create_rental_on_event_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Check if rental already exists for this event
    IF NOT EXISTS (SELECT 1 FROM public.rentals WHERE event_id = NEW.id) THEN
      -- Create rental
      INSERT INTO public.rentals (entity_id, event_id, client_id, title, description, departure_date, return_date, total_value, status)
      VALUES (
        NEW.entity_id,
        NEW.id,
        NEW.client_id,
        'Locação - ' || NEW.title,
        'Locação automática criada para o evento: ' || NEW.title,
        NEW.start_date,
        NEW.end_date,
        NEW.total_value,
        'pending'
      );

      -- Copy event_items to rental_items
      INSERT INTO public.rental_items (rental_id, entity_id, inventory_item_id, name, quantity, unit_price)
      SELECT 
        (SELECT id FROM public.rentals WHERE event_id = NEW.id LIMIT 1),
        NEW.entity_id,
        ei.inventory_item_id,
        ei.name,
        ei.quantity,
        ei.unit_price
      FROM public.event_items ei WHERE ei.event_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_rental_on_confirmation
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION create_rental_on_event_confirmation();

-- 11. Create storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false) ON CONFLICT DO NOTHING;

-- 12. Create storage bucket for damage photos
INSERT INTO storage.buckets (id, name, public) VALUES ('damage-photos', 'damage-photos', false) ON CONFLICT DO NOTHING;

-- Storage policies for contracts
CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Users can view their entity contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

-- Storage policies for damage photos  
CREATE POLICY "Authenticated users can upload damage photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'damage-photos');

CREATE POLICY "Users can view damage photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'damage-photos');
