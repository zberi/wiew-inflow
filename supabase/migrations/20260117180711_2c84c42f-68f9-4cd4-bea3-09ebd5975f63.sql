-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('whatsapp-media-public', 'whatsapp-media-public', false, 104857600);

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can view media files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media-public');

-- Service role can upload media
CREATE POLICY "Service role can upload media"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (bucket_id = 'whatsapp-media-public');

CREATE POLICY "Service role can manage media"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'whatsapp-media-public');
