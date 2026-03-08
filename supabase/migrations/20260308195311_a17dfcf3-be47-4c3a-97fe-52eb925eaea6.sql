
-- Add new roles to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'decorator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Add branding columns to entities
ALTER TABLE public.entities 
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#E91E63',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20) DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#E91E63',
  ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(20) DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'dark';
