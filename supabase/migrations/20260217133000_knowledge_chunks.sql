-- Knowledge chunks with lightweight embeddings for retrieval during calls

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  knowledge_base_id UUID REFERENCES public.knowledge_base(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_agent_id ON public.knowledge_chunks(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_kb_id ON public.knowledge_chunks(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_chunk_index ON public.knowledge_chunks(agent_id, chunk_index);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_knowledge_chunks_updated_at ON public.knowledge_chunks;
CREATE TRIGGER update_knowledge_chunks_updated_at BEFORE UPDATE ON public.knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP POLICY IF EXISTS "Users can view chunks for own agents" ON public.knowledge_chunks;
CREATE POLICY "Users can view chunks for own agents" ON public.knowledge_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create chunks for own agents" ON public.knowledge_chunks;
CREATE POLICY "Users can create chunks for own agents" ON public.knowledge_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update chunks for own agents" ON public.knowledge_chunks;
CREATE POLICY "Users can update chunks for own agents" ON public.knowledge_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete chunks for own agents" ON public.knowledge_chunks;
CREATE POLICY "Users can delete chunks for own agents" ON public.knowledge_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );
