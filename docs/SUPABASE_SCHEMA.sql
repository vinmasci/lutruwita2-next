-- Supabase Schema for Lutruwita Mobile App
-- This file contains the SQL schema for setting up the necessary tables in Supabase

-- Enable Row Level Security (RLS)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table extension (handled by Supabase Auth)
-- This is automatically created by Supabase

-- Create routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  thumbnail_url TEXT,
  distance FLOAT,
  elevation_gain FLOAT,
  estimated_time INTEGER,
  difficulty TEXT,
  tags TEXT[]
);

-- Create saved_routes table (for user's saved/favorited routes)
CREATE TABLE saved_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  custom_name TEXT,
  UNIQUE(user_id, route_id)
);

-- Create offline_maps table (for regional offline maps)
CREATE TABLE offline_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bounds JSONB NOT NULL,
  size INTEGER NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'complete'
);

-- Create route_offline_maps table (for route-specific offline maps)
CREATE TABLE route_offline_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  size INTEGER NOT NULL,
  tiles_count INTEGER NOT NULL DEFAULT 0,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'complete',
  UNIQUE(user_id, route_id)
);

-- Create user_profiles table (for additional user data)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create health_check table (for connection testing)
CREATE TABLE health_check (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('ok');

-- Create updated_at function for triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_routes_modtime
BEFORE UPDATE ON routes
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_profiles_modtime
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security Policies

-- Routes table policies
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Allow users to view public routes
CREATE POLICY routes_public_view ON routes
  FOR SELECT USING (is_public = TRUE);

-- Allow users to view their own routes
CREATE POLICY routes_private_view ON routes
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own routes
CREATE POLICY routes_insert ON routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own routes
CREATE POLICY routes_update ON routes
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own routes
CREATE POLICY routes_delete ON routes
  FOR DELETE USING (auth.uid() = user_id);

-- Saved routes table policies
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own saved routes
CREATE POLICY saved_routes_view ON saved_routes
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own saved routes
CREATE POLICY saved_routes_insert ON saved_routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own saved routes
CREATE POLICY saved_routes_update ON saved_routes
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own saved routes
CREATE POLICY saved_routes_delete ON saved_routes
  FOR DELETE USING (auth.uid() = user_id);

-- Offline maps table policies
ALTER TABLE offline_maps ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own offline maps
CREATE POLICY offline_maps_view ON offline_maps
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own offline maps
CREATE POLICY offline_maps_insert ON offline_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own offline maps
CREATE POLICY offline_maps_update ON offline_maps
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own offline maps
CREATE POLICY offline_maps_delete ON offline_maps
  FOR DELETE USING (auth.uid() = user_id);

-- Route offline maps table policies
ALTER TABLE route_offline_maps ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own route offline maps
CREATE POLICY route_offline_maps_view ON route_offline_maps
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own route offline maps
CREATE POLICY route_offline_maps_insert ON route_offline_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own route offline maps
CREATE POLICY route_offline_maps_update ON route_offline_maps
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own route offline maps
CREATE POLICY route_offline_maps_delete ON route_offline_maps
  FOR DELETE USING (auth.uid() = user_id);

-- User profiles table policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY user_profiles_view ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY user_profiles_insert ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Health check table policies
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view health check
CREATE POLICY health_check_view ON health_check
  FOR SELECT USING (TRUE);

-- Create indexes for performance
CREATE INDEX routes_user_id_idx ON routes(user_id);
CREATE INDEX routes_is_public_idx ON routes(is_public);
CREATE INDEX saved_routes_user_id_idx ON saved_routes(user_id);
CREATE INDEX saved_routes_route_id_idx ON saved_routes(route_id);
CREATE INDEX offline_maps_user_id_idx ON offline_maps(user_id);
CREATE INDEX route_offline_maps_user_id_idx ON route_offline_maps(user_id);
CREATE INDEX route_offline_maps_route_id_idx ON route_offline_maps(route_id);
