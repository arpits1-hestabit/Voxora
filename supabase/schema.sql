-- Voice Agent Platform Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  voice_provider TEXT NOT NULL DEFAULT 'elevenlabs',
  voice_id TEXT NOT NULL,
  voice_settings JSONB DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create agent_templates table
CREATE TABLE IF NOT EXISTS public.agent_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    voice_provider TEXT NOT NULL DEFAULT 'elevenlabs',
    voice_id TEXT NOT NULL,
    voice_settings JSONB DEFAULT '{}',
    model TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create template_knowledge table
CREATE TABLE IF NOT EXISTS public.template_knowledge (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES public.agent_templates(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'txt', 'docx', 'url')),
    content TEXT NOT NULL,
    file_url TEXT,
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'txt', 'docx', 'url')),
  content TEXT NOT NULL,
  file_url TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create calls table
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_name TEXT,
  duration INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  transcript JSONB DEFAULT '[]',
  recording_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create call_analytics table
CREATE TABLE IF NOT EXISTS public.call_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  topics TEXT[] DEFAULT '{}',
  summary TEXT,
  key_points TEXT[] DEFAULT '{}',
  quality_score DECIMAL(3,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_templates_owner_id ON public.agent_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_public ON public.agent_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_system ON public.agent_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_agent_id ON public.knowledge_base(agent_id);
CREATE INDEX IF NOT EXISTS idx_template_knowledge_template_id ON public.template_knowledge(template_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON public.calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_analytics_call_id ON public.call_analytics(call_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON public.agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_knowledge_updated_at BEFORE UPDATE ON public.template_knowledge
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON public.calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for agents
CREATE POLICY "Users can view own agents" ON public.agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents" ON public.agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON public.agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON public.agents
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for agent_templates
CREATE POLICY "Users can view accessible templates" ON public.agent_templates
    FOR SELECT USING (
        is_system = true
        OR is_public = true
        OR auth.uid() = owner_id
    );

CREATE POLICY "Users can create own templates" ON public.agent_templates
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own templates" ON public.agent_templates
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own templates" ON public.agent_templates
    FOR DELETE USING (auth.uid() = owner_id);

-- Create RLS policies for knowledge_base
CREATE POLICY "Users can view knowledge for own agents" ON public.knowledge_base
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = knowledge_base.agent_id
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create knowledge for own agents" ON public.knowledge_base
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = knowledge_base.agent_id
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update knowledge for own agents" ON public.knowledge_base
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = knowledge_base.agent_id
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete knowledge for own agents" ON public.knowledge_base
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.agents
            WHERE agents.id = knowledge_base.agent_id
            AND agents.user_id = auth.uid()
        )
    );

-- Create RLS policies for template_knowledge
CREATE POLICY "Users can view accessible template knowledge" ON public.template_knowledge
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agent_templates t
            WHERE t.id = template_knowledge.template_id
            AND (t.is_system = true OR t.is_public = true OR t.owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can create knowledge for own templates" ON public.template_knowledge
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agent_templates t
            WHERE t.id = template_knowledge.template_id
            AND t.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update knowledge for own templates" ON public.template_knowledge
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.agent_templates t
            WHERE t.id = template_knowledge.template_id
            AND t.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete knowledge for own templates" ON public.template_knowledge
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.agent_templates t
            WHERE t.id = template_knowledge.template_id
            AND t.owner_id = auth.uid()
        )
    );

-- Create RLS policies for calls
CREATE POLICY "Users can view own calls" ON public.calls
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calls" ON public.calls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calls" ON public.calls
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for call_analytics
CREATE POLICY "Users can view analytics for own calls" ON public.call_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.calls
            WHERE calls.id = call_analytics.call_id
            AND calls.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create analytics for own calls" ON public.call_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.calls
            WHERE calls.id = call_analytics.call_id
            AND calls.user_id = auth.uid()
        )
    );
