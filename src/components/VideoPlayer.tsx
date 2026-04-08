import { useState, useEffect, useRef } from 'react';

interface VideoPlayerProps {
  url: string;
  title?: string;
  startPosition?: number; // seconds to resume from
  onProgress?: (percent: number, positionSeconds: number) => void;
  onComplete?: () => void;
  className?: string;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/v\/([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extracts Vimeo video ID from Vimeo URLs
 */
function getVimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Checks if URL is a direct video file
 */
function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv'];
  return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
}

export function VideoPlayer({ url, title, startPosition = 0, onProgress, onComplete, className = '' }: VideoPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasSetInitialPosition = useRef(false);

  const youtubeId = getYouTubeVideoId(url);
  const vimeoId = getVimeoVideoId(url);
  const isDirect = isDirectVideoUrl(url);

  useEffect(() => {
    if (!youtubeId && !vimeoId && !isDirect) {
      setError('Unsupported video format. Please use YouTube, Vimeo, or a direct video URL.');
    } else {
      setError(null);
    }
  }, [url, youtubeId, vimeoId, isDirect]);

  // Set initial position for direct video files
  useEffect(() => {
    if (videoRef.current && startPosition > 0 && !hasSetInitialPosition.current) {
      videoRef.current.currentTime = startPosition;
      hasSetInitialPosition.current = true;
    }
  }, [startPosition]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-8 ${className}`}>
        <p className="text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  // YouTube embed with start time parameter
  if (youtubeId) {
    const startParam = startPosition > 0 ? `&start=${Math.floor(startPosition)}` : '';
    return (
      <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1${startParam}`}
          title={title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  // Vimeo embed with start time hash
  if (vimeoId) {
    const startHash = startPosition > 0 ? `#t=${Math.floor(startPosition)}s` : '';
    return (
      <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0${startHash}`}
          title={title || 'Video'}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  // Direct video file (HTML5 video player)
  if (isDirect) {
    return (
      <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
        <video
          ref={videoRef}
          src={url}
          controls
          className="absolute inset-0 w-full h-full"
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (video.duration && onProgress) {
              const percent = Math.round((video.currentTime / video.duration) * 100);
              onProgress(percent, Math.round(video.currentTime));
            }
          }}
          onEnded={() => onComplete?.()}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return null;
}
