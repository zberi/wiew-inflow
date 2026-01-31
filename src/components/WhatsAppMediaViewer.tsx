import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
//const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;//replaced with VITE_SUPABASE_PUBLISHABLE_KEY as advised by Claude
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MediaItem {
  id: string;
  message_id: string;
  sender_phone: string;
  sender_name: string | null;
  media_type: 'photo' | 'video';
  file_path: string;
  caption: string | null;
  received_at: string;
  mime_type: string;
}

export default function WhatsAppMediaViewer() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch media items
  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .order('received_at', { ascending: false });

      if (error) throw error;
      setMediaItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  // Get signed URL for media file
  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('whatsapp-media-public')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchMedia();

    // Real-time subscription for new media
    const channel = supabase
      .channel('media_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media_items' },
        (payload) => {
          setMediaItems((prev) => [payload.new as MediaItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">WhatsApp Media Messages</h1>
      
      {mediaItems.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No messages yet. Send an image or video to your WhatsApp Business number.
        </div>
      ) : (
        <div className="space-y-4">
          {mediaItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
              {/* Sender Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {item.sender_name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-semibold">{item.sender_name || 'Unknown'}</div>
                  <div className="text-sm text-gray-500">{item.sender_phone}</div>
                </div>
                <div className="ml-auto text-xs text-gray-400">
                  {new Date(item.received_at).toLocaleString()}
                </div>
              </div>

              {/* Media Content */}
              <div className="mb-3">
                {item.media_type === 'photo' ? (
                  <img
                    src={getMediaUrl(item.file_path)}
                    alt={item.caption || 'WhatsApp image'}
                    className="w-full rounded-lg max-h-96 object-contain bg-gray-100"
                  />
                ) : (
                  <video
                    src={getMediaUrl(item.file_path)}
                    controls
                    className="w-full rounded-lg max-h-96"
                  >
                    Your browser doesn't support video playback.
                  </video>
                )}
              </div>

              {/* Caption */}
              {item.caption && (
                <div className="text-gray-700 bg-gray-50 p-3 rounded">
                  {item.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
