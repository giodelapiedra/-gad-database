import { useEffect } from 'react';
import { SparklesIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useTour } from './useTour';

const SEEN_KEY = 'gad.tour.encoder.v1';

/**
 * The "Demo" button in the topbar plus a one-time auto-start on an encoder's
 * first login. Encoders only — admins have a different workflow. The button is
 * always available so the walkthrough can be replayed anytime during a demo.
 */
export default function TourLauncher() {
  const { user } = useAuth();
  const { start } = useTour();
  const isEncoder = user?.role === 'ENCODER';

  // Auto-start once, ever, for encoders. Guarded by localStorage so it fires on
  // the first page they land on and never again (they can replay via the button).
  useEffect(() => {
    if (!isEncoder) return;
    let seen = false;
    try {
      seen = !!localStorage.getItem(SEEN_KEY);
      if (!seen) localStorage.setItem(SEEN_KEY, '1');
    } catch {
      seen = true; // storage blocked — skip auto-start, keep the button
    }
    if (seen) return;
    const t = setTimeout(start, 900); // let the page finish rendering first
    return () => clearTimeout(t);
  }, [isEncoder, start]);

  if (!isEncoder) return null;

  return (
    <Button
      data-tour="demo-btn"
      variant="outline"
      size="sm"
      onClick={start}
      title="Simulan ang gabay / demo"
      className="gap-1.5 border-[#C7D2FE] bg-[#EEF2FF] text-[#4338CA] hover:bg-[#E0E7FF] hover:text-[#3730A3]"
    >
      <SparklesIcon className="size-3.5" />
      Demo
    </Button>
  );
}
