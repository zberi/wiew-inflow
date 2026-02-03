-- Allow anonymous users to read webhook logs (read-only)
CREATE POLICY "Anyone can view logs"
  ON public.webhook_logs FOR SELECT TO anon USING (true);

-- Allow anonymous users to read media items (read-only)
CREATE POLICY "Anyone can view media"
  ON public.media_items FOR SELECT TO anon USING (true);

-- Allow anonymous users to read groups (read-only)
CREATE POLICY "Anyone can view groups"
  ON public.whatsapp_groups FOR SELECT TO anon USING (true);

-- Allow anonymous users to read destinations (read-only)
CREATE POLICY "Anyone can view destinations"
  ON public.destinations FOR SELECT TO anon USING (true);

-- Allow anonymous users to read upload queue (read-only)
CREATE POLICY "Anyone can view queue"
  ON public.upload_queue FOR SELECT TO anon USING (true);