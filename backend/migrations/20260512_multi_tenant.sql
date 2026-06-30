-- Migration: Multi-Tenancy Support
-- Created: 2026-05-12
-- Target: organizations, users, recipes

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add role and organization_id to users table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_role') THEN
    CREATE TYPE "enum_users_role" AS ENUM ('user', 'admin', 'super_admin');
  END IF;
END $$;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role "enum_users_role" NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Update existing recipes table to include organization_id
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 4. Create an index for faster organization filtering
CREATE INDEX IF NOT EXISTS idx_recipes_organization_id ON recipes(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
