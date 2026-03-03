-- Agent Templates Library
-- Adds templates and template knowledge tables with policies and seed data

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_templates_owner_id ON public.agent_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_public ON public.agent_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_system ON public.agent_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_template_knowledge_template_id ON public.template_knowledge(template_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_knowledge ENABLE ROW LEVEL SECURITY;

-- Apply updated_at triggers
CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON public.agent_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_knowledge_updated_at BEFORE UPDATE ON public.template_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for agent_templates
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

-- RLS policies for template_knowledge
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

-- Seed system templates
INSERT INTO public.agent_templates (
  name,
  description,
  system_prompt,
  voice_provider,
  voice_id,
  model,
  temperature,
  is_public,
  is_system,
  tags
) VALUES
  (
    'Customer Support Agent',
    'Handles customer inquiries, troubleshooting, and account questions.',
    'You are a customer support agent. Be empathetic, professional, and concise. Ask clarifying questions, confirm resolutions, and summarize next steps.',
    'elevenlabs',
    'ThT5KcBeYPX3keUQqHPh',
    'llama-3.1-8b-instant',
    0.4,
    true,
    true,
    ARRAY['support', 'customer', 'service']
  ),
  (
    'Sales Assistant',
    'Qualifies leads, answers product questions, and schedules demos.',
    'You are a sales assistant. Be helpful and confident. Ask discovery questions, highlight benefits, handle objections, and suggest next steps like scheduling a demo.',
    'elevenlabs',
    'pNInz6obpgDQGcFmaJgB',
    'llama-3.1-8b-instant',
    0.6,
    true,
    true,
    ARRAY['sales', 'lead', 'demo']
  ),
  (
    'FAQ/Information Agent',
    'Answers common questions using a knowledge base.',
    'You are an FAQ assistant. Provide short, accurate answers grounded in the knowledge base. If the answer is missing, say so and offer to escalate.',
    'elevenlabs',
    'EXAVITQu4vr4xnSDxMaL',
    'llama-3.1-8b-instant',
    0.3,
    true,
    true,
    ARRAY['faq', 'information', 'knowledge']
  ),
  (
    'Appointment Scheduler',
    'Books and reschedules appointments, confirms details, and sends reminders.',
    'You are an appointment scheduler. Collect required details, confirm availability, and summarize the appointment. Keep responses short and structured.',
    'elevenlabs',
    'TxGEqnHWrfWFTfGW9XjX',
    'mixtral-8x7b-32768',
    0.4,
    true,
    true,
    ARRAY['appointments', 'calendar', 'scheduling']
  ),
  (
    'Lead Qualification Agent',
    'Qualifies leads based on budget, timeline, and needs.',
    'You are a lead qualification agent. Ask focused questions to assess fit (budget, timeline, pain points). Summarize qualification status clearly.',
    'elevenlabs',
    'onwK4e9ZLuTAKqWW03F9',
    'llama-3.1-8b-instant',
    0.5,
    true,
    true,
    ARRAY['lead', 'qualification', 'sales']
  ),
  (
    'Technical Support Agent',
    'Helps users troubleshoot technical issues and guides them through fixes.',
    'You are a technical support agent. Ask for environment details, provide step-by-step troubleshooting, and confirm outcomes. Escalate if needed.',
    'elevenlabs',
    'VR6AewLTigWG4xSOukaG',
    'llama-3.1-8b-instant',
    0.4,
    true,
    true,
    ARRAY['technical', 'support', 'troubleshooting']
  );

-- Seed sample knowledge sources for templates
INSERT INTO public.template_knowledge (template_id, name, type, content, url)
SELECT id, 'FAQ Documentation', 'url', 'Content from https://example.com/faq - replace with your docs', 'https://example.com/faq'
FROM public.agent_templates
WHERE name = 'FAQ/Information Agent';

INSERT INTO public.template_knowledge (template_id, name, type, content, url)
SELECT id, 'Support Docs', 'url', 'Content from https://example.com/support - replace with your docs', 'https://example.com/support'
FROM public.agent_templates
WHERE name = 'Technical Support Agent';
