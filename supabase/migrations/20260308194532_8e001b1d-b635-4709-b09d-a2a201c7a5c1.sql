
CREATE OR REPLACE FUNCTION public.create_super_admin(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entity_id UUID;
BEGIN
    SELECT id INTO v_entity_id 
    FROM public.entities 
    WHERE is_super_admin = true 
    LIMIT 1;
    
    IF v_entity_id IS NULL THEN
        RAISE EXCEPTION 'Entidade Super Admin não encontrada.';
    END IF;
    
    INSERT INTO public.profiles (id, entity_id, full_name, position, is_active)
    VALUES (_user_id, v_entity_id, 'Super Administrador', 'Administrador do Sistema', true)
    ON CONFLICT (id) DO UPDATE SET
        entity_id = v_entity_id,
        full_name = 'Super Administrador',
        position = 'Administrador do Sistema';
    
    INSERT INTO public.user_roles (user_id, entity_id, role)
    VALUES (_user_id, v_entity_id, 'super_admin')
    ON CONFLICT (user_id, entity_id, role) DO NOTHING;
END;
$$;
