'use client';

import React, { useState, useEffect } from 'react';
import { DaySkyAmbientScene } from './DaySkyAmbientScene';
import { NightSkyAmbientScene } from './NightSkyAmbientScene';

interface Props {
  /**
   * Optional manual override:
   * 'day' -> Forces glowing sun, clouds, birds & floating leaves
   * 'night' -> Forces crescent moon, twinkling stars & cosmic clouds
   * 'auto' -> Automatic time switch: Day from 6:00 AM to 6:00 PM (18:00), Night from 6:00 PM to 6:00 AM
   */
  forceMode?: 'day' | 'night' | 'auto';
  className?: string;
}

export function DashboardAmbientScene({ forceMode = 'auto', className = '' }: Props) {
  const [isDayTime, setIsDayTime] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkTime = () => {
      const currentHour = new Date().getHours();
      // Daytime is from 6:00 AM (6) to 5:59 PM (< 18)
      // Nighttime is from 6:00 PM (>= 18) to 5:59 AM (< 6)
      const day = currentHour >= 6 && currentHour < 18;
      setIsDayTime(day);
    };

    checkTime();
    const interval = setInterval(checkTime, 30000); // verify every 30s
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const showDay = forceMode === 'day' ? true : forceMode === 'night' ? false : isDayTime;

  return (
    <div className={`transition-opacity duration-1000 ${className}`}>
      {showDay ? (
        <DaySkyAmbientScene />
      ) : (
        <NightSkyAmbientScene forceShow={true} />
      )}
    </div>
  );
}
