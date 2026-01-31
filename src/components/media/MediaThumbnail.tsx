import { useState, useEffect } from "react";
import { Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MediaThumbnailProps {
  filePath: string | null;
  thumbnailPath: string | null;
  mediaType: "photo" | "video";
  alt?: string;
  className?: string;
}

export function MediaThumbnail({
  filePath,
  thumbnailPath,
  mediaType,
  alt = "Media thumbnail",
  className = "",
}: MediaThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Get the URL for the thumbnail or file
  const pathToUse = thumbnailPath || filePath;
  
  useEffect(() => {
    if (pathToUse) {
      const { data } = supabase.storage
        .from("whatsapp-media-public")
        .getPublicUrl(pathToUse);
      setImageUrl(data.publicUrl);
    } else {
      setIsLoading(false);
    }
  }, [pathToUse]);

  // Show placeholder for videos without thumbnails or on error
  if (hasError || !pathToUse || (mediaType === "video" && !thumbnailPath)) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
      >
        {mediaType === "photo" ? (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Video className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          loading="lazy"
        />
      )}
      {mediaType === "video" && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="rounded-full bg-white/90 p-2">
            <Video className="h-4 w-4 text-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
