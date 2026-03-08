
-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  inventory_item_id uuid,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  checked_out boolean NOT NULL DEFAULT false,
  checked_in boolean NOT NULL DEFAULT false,
  return_condition text DEFAULT 'ok',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist_items
CREATE POLICY "Users can manage entity checklist"
ON public.checklist_items FOR ALL
TO authenticated
USING (entity_id = public.get_user_entity_id())
WITH CHECK (entity_id = public.get_user_entity_id());

CREATE POLICY "Users can view entity checklist"
ON public.checklist_items FOR SELECT
TO authenticated
USING (entity_id = public.get_user_entity_id() OR public.is_super_admin(auth.uid()));

-- Make damage-photos bucket public
UPDATE storage.buckets SET public = true WHERE id = 'damage-photos';
