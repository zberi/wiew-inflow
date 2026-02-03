
# Fix: Make WhatsApp Inbound Messages Visible in UI

## Problem Summary

After thorough investigation, I identified **two critical issues** preventing inbound WhatsApp messages from appearing in the UI:

### Issue 1: RLS Policies Block Anonymous Access
The database tables have Row Level Security (RLS) policies that only allow **authenticated users** to read data:

```sql
CREATE POLICY "Authenticated users can view logs"
  ON public.webhook_logs FOR SELECT TO authenticated USING (true);
```

However, **the app has no login system** - users are accessing as anonymous. The frontend queries correctly hit the database, but return **empty arrays** because the `anon` role has no SELECT permissions.

**Evidence from network requests:**
- `GET /webhook_logs` → Status 200, Response Body: `[]`
- `GET /media_items` → Status 200, Response Body: `[]`

Meanwhile, my service-role query returns **42 webhook logs** and **0 media items** (only diagnostic text messages exist, no real media yet).

### Issue 2: No Real Media Messages Received
The edge function logs show **only diagnostic test pings** from `TEST_PHONE_ID`:
```
Processing text message from 1234567890, id: TEST_MSG_1770143898431
```

All 42 webhook logs are synthetic diagnostics - no actual image/video messages have arrived from WhatsApp. This may indicate:
- WhatsApp Cloud API webhook URL is not correctly registered in Meta dashboard
- Meta is not forwarding real inbound media to the webhook
- Or real messages ARE arriving but failing silently (no errors found in logs)

---

## Solution

Per your preference to **make read-only data public**, I'll add RLS policies that allow anonymous users to SELECT (but not INSERT/UPDATE/DELETE) from the relevant tables.

### Database Changes

Add new RLS policies for anonymous read access:

```sql
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
```

### No Code Changes Required

The frontend code is already correct:
- `useWhatsAppEvents.ts` queries `webhook_logs` properly
- `useMediaItems.ts` queries `media_items` properly
- `MediaThumbnail.tsx` fetches from `whatsapp-media-public` bucket (which is public)

### Expected Outcome

After this fix:
1. **WhatsApp Events page** will display the 42 existing diagnostic text messages
2. **Media Library** will remain empty until a real image/video is sent from WhatsApp
3. **Dashboard stats** will show correct webhook counts

---

## What About Media Messages?

Since you confirmed you're in **production mode**, real inbound media should work. After we fix the RLS visibility issue, please:

1. Send a photo/video from a real phone to your WhatsApp Business number
2. Check the **WhatsApp Events** page - you should see the new `image` or `video` event
3. Check the **Media Library** - the media should appear if download succeeded

If media still doesn't appear after sending a real message, we'll need to:
- Verify the webhook URL is correctly registered in Meta Business Suite
- Check edge function logs for download errors (e.g., expired access token)

---

## Technical Details

### Current RLS Policy Structure
| Table | `authenticated` | `service_role` | `anon` |
|-------|-----------------|----------------|--------|
| webhook_logs | SELECT | INSERT/ALL | ❌ None |
| media_items | SELECT/ALL | ALL | ❌ None |
| whatsapp_groups | SELECT/ALL | - | ❌ None |
| destinations | SELECT/ALL | - | ❌ None |
| upload_queue | SELECT/ALL | ALL | ❌ None |

### After Fix
| Table | `authenticated` | `service_role` | `anon` |
|-------|-----------------|----------------|--------|
| webhook_logs | SELECT | INSERT/ALL | ✅ SELECT |
| media_items | SELECT/ALL | ALL | ✅ SELECT |
| whatsapp_groups | SELECT/ALL | - | ✅ SELECT |
| destinations | SELECT/ALL | - | ✅ SELECT |
| upload_queue | SELECT/ALL | ALL | ✅ SELECT |

### Security Note
This makes **read-only** data publicly accessible. Anyone with the app URL can view:
- Sender phone numbers
- Message content/previews
- Media files

If this becomes a concern later, we can add authentication. For now, this matches your stated preference and enables immediate debugging.
