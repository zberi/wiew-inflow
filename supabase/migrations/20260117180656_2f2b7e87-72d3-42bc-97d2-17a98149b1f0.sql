-- WhatsApp Media Ingestion & Publishing System Schema

-- Enum for media types
CREATE TYPE public.media_type AS ENUM ('photo', 'video');

-- Enum for upload status
CREATE TYPE public.upload_status AS ENUM ('pending', 'approved', 'rejected', 'uploading', 'completed', 'failed');

-- Enum for destination types
CREATE TYPE public.destination_type AS ENUM ('youtube', 'instagram', 'facebook', 'webhook', 's3', 'ftp', 'cms', 'api');

-- WhatsApp groups being monitored
CREATE TABLE public.whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT UNIQUE NOT NULL,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ingested media items
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_name TEXT,
  media_type media_type NOT NULL,
  caption TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  thumbnail_path TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Upload destinations (configurable endpoints)
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  destination_type destination_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Upload queue with approval workflow
CREATE TABLE public.upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE NOT NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE NOT NULL,
  status upload_status DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  upload_started_at TIMESTAMPTZ,
  upload_completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_id, destination_id)
);

-- Webhook logs for debugging
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (admin access)
CREATE POLICY "Authenticated users can view groups"
  ON public.whatsapp_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage groups"
  ON public.whatsapp_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view media"
  ON public.media_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage media"
  ON public.media_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view destinations"
  ON public.destinations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage destinations"
  ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view queue"
  ON public.upload_queue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage queue"
  ON public.upload_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view logs"
  ON public.webhook_logs FOR SELECT TO authenticated USING (true);

-- Service role access for edge functions (webhook logs)
CREATE POLICY "Service role can insert logs"
  ON public.webhook_logs FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can manage media"
  ON public.media_items FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage queue"
  ON public.upload_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_whatsapp_groups_updated_at
  BEFORE UPDATE ON public.whatsapp_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_upload_queue_updated_at
  BEFORE UPDATE ON public.upload_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_media_items_group_id ON public.media_items(group_id);
CREATE INDEX idx_media_items_received_at ON public.media_items(received_at DESC);
CREATE INDEX idx_upload_queue_status ON public.upload_queue(status);
CREATE INDEX idx_upload_queue_media_id ON public.upload_queue(media_id);

-- Enable realtime for queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_items;