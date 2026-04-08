import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrackCompletionParams {
  trackId: string;
  trackTitle: string;
}

export function useTrackCompletionNotification() {
  // Track which tracks have already had notifications sent this session
  const notifiedTracksRef = useRef<Set<string>>(new Set());

  const sendCompletionNotification = useCallback(async ({ trackId, trackTitle }: TrackCompletionParams) => {
    // Prevent duplicate notifications for the same track
    if (notifiedTracksRef.current.has(trackId)) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        console.error('No session found for sending completion email');
        return;
      }

      const response = await supabase.functions.invoke('send-track-completion-email', {
        body: { trackId, trackTitle },
      });

      if (response.error) {
        console.error('Error sending completion email:', response.error);
        return;
      }

      // Mark this track as notified
      notifiedTracksRef.current.add(trackId);
      
      toast.success('Congratulations! 🎉', {
        description: `You've completed "${trackTitle}". A confirmation email has been sent.`,
        duration: 5000,
      });

      console.log('Completion notification sent:', response.data);
    } catch (error) {
      console.error('Error sending track completion notification:', error);
    }
  }, []);

  return { sendCompletionNotification };
}
