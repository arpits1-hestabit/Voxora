export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  voice_provider: 'elevenlabs' | 'openai' | 'coqui';
  voice_id: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    speed?: number;
    pitch?: number;
  };
  model: string;
  temperature?: number;
  max_tokens?: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBase {
  id: string;
  agent_id: string;
  name: string;
  type: 'pdf' | 'txt' | 'docx' | 'url';
  content: string;
  file_url?: string;
  url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  agent_id: string;
  user_id: string;
  duration: number;
  status: 'completed' | 'failed' | 'in_progress';
  transcript?: ConversationTurn[];
  recording_url?: string;
  metadata?: {
    start_time: string;
    end_time: string;
    call_quality?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ConversationTurn {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: number;
  duration?: number;
}

export interface CallAnalytics {
  id: string;
  call_id: string;
  overall_score: number;
  sentiment_score: number;
  response_accuracy: number;
  avg_response_time: number;
  goal_completion: boolean;
  topics: string[];
  key_moments?: {
    timestamp: number;
    description: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  suggestions?: string[];
  created_at: string;
}

export interface CallMetrics {
  total_calls: number;
  total_duration: number;
  avg_duration: number;
  success_rate: number;
  calls_by_date: {
    date: string;
    count: number;
  }[];
  avg_sentiment: number;
  avg_quality_score: number;
}
