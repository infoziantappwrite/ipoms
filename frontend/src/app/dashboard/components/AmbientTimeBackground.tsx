'use client';

import React, { useRef, useEffect, useState } from 'react';

export type GreetingPeriod =
  | 'midnight'
  | 'wee_hours'
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'early_evening'
  | 'dusk'
  | 'evening'
  | 'night';

interface Props {
  period?: GreetingPeriod;
}

/**
 * Exact minute-precision time boundaries for the 3 master atmospheric videos:
 * - /videos/morning.mp4 : Morning clip (03:01 AM till 04:00 PM) -> 181 to 960 mins
 * - /videos/evening.mp4 : Evening clip (04:01 PM till 07:00 PM) -> 961 to 1140 mins
 * - /videos/night.mp4   : Night Moon clip (07:01 PM till 03:00 AM) -> 1141 to 1439 mins & 0 to 180 mins
 */
export function resolveScheduledVideo(): { src: string; periodLabel: string; minuteRange: string } {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Morning: 3:01 AM (181 min) till 4:00 PM (960 min)
  if (totalMinutes >= 181 && totalMinutes <= 960) {
    return {
      src: '/videos/morning.mp4',
      periodLabel: 'Morning Video',
      minuteRange: '03:01 AM - 04:00 PM',
    };
  }

  // 2. Evening: 4:01 PM (961 min) till 7:00 PM (1140 min)
  if (totalMinutes >= 961 && totalMinutes <= 1140) {
    return {
      src: '/videos/evening.mp4',
      periodLabel: 'Evening Video',
      minuteRange: '04:01 PM - 07:00 PM',
    };
  }

  // 3. Night: 7:01 PM (1141 min) till 3:00 AM (180 min)
  return {
    src: '/videos/night.mp4',
    periodLabel: 'Night Moon Video',
    minuteRange: '07:01 PM - 03:00 AM',
  };
}

/**
 * High-performance, GPU-accelerated atmospheric video background engine.
 * Automatically checks and switches video loops according to exact schedule.
 */
export function AmbientTimeBackground({ period }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoInfo, setVideoInfo] = useState(resolveScheduledVideo);
  const [isLoaded, setIsLoaded] = useState(false);

  // Live schedule ticker: re-evaluates every 15 seconds so period transitions happen automatically
  useEffect(() => {
    const checkSchedule = () => {
      const current = resolveScheduledVideo();
      setVideoInfo((prev) => {
        if (prev.src !== current.src) {
          setIsLoaded(false);
          return current;
        }
        return prev;
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 15000);
    return () => clearInterval(interval);
  }, []);

  // Video playback management
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.95;
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => setIsLoaded(true))
        .catch(() => {
          // Autoplay policy fallback: muted allows instant playback
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
    }
  }, [videoInfo.src]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      
      {/* ── High-Definition Atmospheric Video Background Layer ── */}
      <video
        ref={videoRef}
        key={videoInfo.src}
        src={videoInfo.src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-80'
        }`}
      />

      {/* ── Subtle Scrim (Guarantees crisp typography without reducing video vibrancy) ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/20 to-white/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-white/10 pointer-events-none" />

    </div>
  );
}
