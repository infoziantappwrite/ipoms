'use client';

import React, { useState, useEffect } from 'react';

interface Props {
  /** Force show for preview/testing or rely on automatic 7:00 PM (19:00) check */
  forceShow?: boolean;
  className?: string;
  customVideoUrl?: string; // Optional user clip e.g. /ambient/night.webm or mp4
}

export function NightSkyAmbientScene({ forceShow, className = '', customVideoUrl }: Props) {
  const [isNightTime, setIsNightTime] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkTime = () => {
      const currentHour = new Date().getHours();
      // 6:00 PM (18:00) till 5:59 AM (< 6)
      const night = currentHour >= 18 || currentHour < 6;
      setIsNightTime(night);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const shouldRender = forceShow ?? isNightTime;
  if (!shouldRender) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 w-full h-full overflow-hidden z-0 transition-opacity duration-1000 ${className}`}
    >
      {/* If user provides a custom video/animation clip */}
      {customVideoUrl ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover mix-blend-screen opacity-90"
        >
          <source src={customVideoUrl} type="video/webm" />
          <source src={customVideoUrl} type="video/mp4" />
        </video>
      ) : (
        /* Realistic CSS & SVG Animated Ambient Night Sky (Moon + Billowing Clouds + Twinkling Stars) */
        <div className="relative w-full h-full">
          {/* 0. Atmosphere Gradient: White -> Light Tone -> Gray Shades -> Dark Twilight Sky (Light Theme) | Deep Midnight (Dark Theme) */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-100/95 via-30% via-slate-300/80 via-60% to-[#0b1329] dark:from-[#060c1c] dark:via-[#0c1630] dark:to-[#070e24]" />

          {/* 1. Deep Midnight Cosmic Nebula Glows in Dark Sector */}
          <div className="absolute left-1/3 top-1/4 w-72 h-72 rounded-full bg-slate-300/30 dark:bg-blue-900/30 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute right-1/4 top-1/3 w-80 h-80 rounded-full bg-slate-400/20 dark:bg-indigo-900/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute right-12 top-1/4 w-80 h-80 rounded-full bg-indigo-900/40 dark:bg-sky-900/35 blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />

          {/* 2. Twinkling & Floating Golden / Diamond Stars */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Left Sector Stars */}
            <circle cx="5%" cy="20%" r="1.4" className="fill-amber-200 animate-pulse opacity-90" style={{ animationDuration: '2.5s' }} />
            <circle cx="10%" cy="65%" r="1.2" className="fill-white animate-ping opacity-60" style={{ animationDuration: '4.2s' }} />
            <circle cx="16%" cy="32%" r="1.8" className="fill-sky-200 animate-pulse opacity-85" style={{ animationDuration: '3.1s' }} />
            <circle cx="22%" cy="80%" r="1.3" className="fill-amber-300 animate-pulse opacity-80" style={{ animationDuration: '3.8s' }} />
            <circle cx="28%" cy="15%" r="1.5" className="fill-white animate-pulse opacity-95" style={{ animationDuration: '2.9s' }} />

            {/* Center Sector Stars */}
            <circle cx="38%" cy="25%" r="1.8" className="fill-amber-300 animate-pulse opacity-90" style={{ animationDuration: '2.4s' }} />
            <circle cx="44%" cy="70%" r="1.2" className="fill-white animate-ping opacity-70" style={{ animationDuration: '5.1s' }} />
            <circle cx="52%" cy="18%" r="1.6" className="fill-sky-200 animate-pulse opacity-85" style={{ animationDuration: '4.1s' }} />
            <circle cx="58%" cy="55%" r="1.4" className="fill-amber-200 animate-pulse opacity-90" style={{ animationDuration: '3.3s' }} />
            <circle cx="65%" cy="30%" r="2.0" className="fill-amber-300 animate-pulse opacity-95" style={{ animationDuration: '2.7s' }} />

            {/* Right Sector Stars */}
            <circle cx="72%" cy="15%" r="1.5" className="fill-sky-200 animate-pulse opacity-85" style={{ animationDuration: '4.1s' }} />
            <circle cx="78%" cy="75%" r="1.8" className="fill-sky-300 animate-pulse opacity-85" style={{ animationDuration: '3.6s' }} />
            <circle cx="84%" cy="58%" r="2.2" className="fill-amber-300 animate-pulse opacity-95" style={{ animationDuration: '2.1s' }} />
            <circle cx="92%" cy="45%" r="1.8" className="fill-white animate-pulse opacity-95" style={{ animationDuration: '3.9s' }} />
            <circle cx="96%" cy="22%" r="1.3" className="fill-amber-100 opacity-75 animate-pulse" style={{ animationDuration: '3.1s' }} />

            {/* 4-Point Glimmer Stars */}
            <g className="animate-spin-slow origin-center opacity-90" style={{ transformOrigin: '82% 24%', animationDuration: '18s' }}>
              <path
                d="M 0,-10 Q 0,0 10,0 Q 0,0 0,10 Q 0,0 -10,0 Q 0,0 0,-10"
                fill="#FEF08A"
                transform="translate(420, 50) scale(0.9)"
              />
            </g>
            <g className="animate-pulse opacity-85" style={{ transformOrigin: '32% 35%', animationDuration: '3.5s' }}>
              <path
                d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8"
                fill="#BAE6FD"
                transform="translate(180, 45) scale(0.75)"
              />
            </g>
          </svg>

          {/* 3. Glowing Crescent Moon with Deep Radial Luminescence */}
          <div className="absolute right-12 sm:right-20 top-5 sm:top-8 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            {/* Outer Moonlight Aura */}
            <div className="absolute inset-0 rounded-full bg-amber-300/30 blur-2xl animate-pulse duration-4000 scale-125" />
            <div className="absolute inset-2 rounded-full bg-amber-200/40 blur-md" />

            {/* Realistic 3D Glowing Moon SVG */}
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_35px_rgba(254,240,138,0.85)] relative z-10"
            >
              <defs>
                <linearGradient id="moonGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="45%" stopColor="#FEF08A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
                <radialGradient id="moonCrater" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Crescent Moon Arc with subtle crater depth */}
              <path
                d="M50 10 A40 40 0 1 0 90 50 A32 32 0 1 1 50 10 Z"
                fill="url(#moonGlowGrad)"
              />
              {/* Subtle Crater Details */}
              <circle cx="42" cy="46" r="4" fill="url(#moonCrater)" />
              <circle cx="34" cy="62" r="3.5" fill="url(#moonCrater)" />
              <circle cx="48" cy="74" r="5" fill="url(#moonCrater)" />
              <circle cx="56" cy="30" r="2.5" fill="url(#moonCrater)" />
            </svg>
          </div>

          {/* 4. Layer 1: Background Drifting Moonlit Night Clouds */}
          <div
            className="absolute -bottom-4 right-0 w-[550px] h-36 opacity-60"
            style={{
              animation: 'driftCloudSlow 38s linear infinite',
            }}
          >
            <svg viewBox="0 0 600 200" fill="currentColor" className="w-full h-full text-slate-800/80">
              <path d="M50 150 C80 100, 160 100, 200 130 C230 90, 310 90, 340 125 C370 85, 450 85, 480 120 C520 95, 580 115, 600 150 C600 180, 50 180, 50 150 Z" />
            </svg>
          </div>

          {/* 5. Layer 2: Foreground Billowing Night Clouds Passing Near Moon */}
          <div
            className="absolute top-10 -right-16 w-[480px] h-32 opacity-65"
            style={{
              animation: 'driftCloudFast 26s linear infinite',
            }}
          >
            <svg viewBox="0 0 500 180" fill="currentColor" className="w-full h-full text-slate-700/60">
              <path d="M30 130 C60 80, 130 75, 170 105 C200 70, 270 65, 300 100 C330 65, 400 70, 430 105 C460 85, 500 105, 500 130 C500 160, 30 160, 30 130 Z" />
            </svg>
          </div>

          {/* 6. Layer 3: Low Floating Night Mist Wave */}
          <div
            className="absolute bottom-0 left-0 right-0 w-full h-20 opacity-40"
            style={{
              animation: 'driftCloudReverse 32s ease-in-out infinite alternate',
            }}
          >
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor" className="w-full h-full text-indigo-950/70">
              <path d="M0 80 C200 40, 400 100, 600 60 C800 20, 1000 80, 1200 50 L1200 120 L0 120 Z" />
            </svg>
          </div>
        </div>
      )}

      {/* Embedded CSS Animations for High-Performance Organic Motion */}
      <style jsx>{`
        @keyframes driftCloudSlow {
          0% {
            transform: translateX(120px);
          }
          50% {
            transform: translateX(-60px);
          }
          100% {
            transform: translateX(120px);
          }
        }
        @keyframes driftCloudFast {
          0% {
            transform: translateX(80px);
          }
          50% {
            transform: translateX(-90px);
          }
          100% {
            transform: translateX(80px);
          }
        }
        @keyframes driftCloudReverse {
          0% {
            transform: translateX(-40px) translateY(0px);
          }
          100% {
            transform: translateX(50px) translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}
