
-- Create is_entity_admin function
CREATE OR REPLACE FUNCTION public.is_entity_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('entity_admin', 'super_admin')
  ) OR public.is_super_admin(_user_id)
$$;

-- Create entity-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('entity-logos', 'entity-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can view entity logos (public bucket)
CREATE POLICY "Anyone can view entity logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'entity-logos');

-- Storage policy: entity admins can upload logos
CREATE POLICY "Entity admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'entity-logos'
  AND auth.role() = 'authenticated'
);

-- Storage policy: entity admins can update logos
CREATE POLICY "Entity admins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'entity-logos'
  AND auth.role() = 'authenticated'
);

-- Storage policy: entity admins can delete logos
CREATE POLICY "Entity admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'entity-logos'
  AND auth.role() = 'authenticated'
);
