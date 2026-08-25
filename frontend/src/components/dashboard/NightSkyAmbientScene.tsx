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
      className={`pointer-events-none select-none absolute right-0 top-0 bottom-0 w-full sm:w-2/3 lg:w-1/2 overflow-hidden z-0 transition-opacity duration-1000 ${className}`}
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
          {/* 0. Deep Twilight / Midnight Sky Atmosphere (Rich dark sky visible in Light theme as well) */}
          <div
            className="absolute inset-0 bg-gradient-to-l from-[#090e1a] via-[#0f172a]/95 to-transparent"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 20%, black 50%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 20%, black 50%)',
            }}
          />

          {/* 1. Deep Midnight Cosmic Nebula Glow */}
          <div className="absolute right-12 top-1/4 w-80 h-80 rounded-full bg-blue-900/40 dark:bg-sky-500/20 blur-3xl animate-pulse duration-5000" />
          <div className="absolute right-24 top-1/3 w-64 h-64 rounded-full bg-indigo-900/50 dark:bg-indigo-500/20 blur-2xl animate-pulse duration-7000" />

          {/* 2. Twinkling & Floating Golden / Diamond Stars */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Star Clusters with bright contrast */}
            <circle cx="20%" cy="25%" r="1.2" className="fill-white animate-ping opacity-70" style={{ animationDuration: '3.2s' }} />
            <circle cx="45%" cy="18%" r="1.8" className="fill-amber-300 animate-pulse opacity-90" style={{ animationDuration: '2.4s' }} />
            <circle cx="70%" cy="15%" r="1.5" className="fill-sky-200 animate-pulse opacity-85" style={{ animationDuration: '4.1s' }} />
            <circle cx="85%" cy="30%" r="2.2" className="fill-amber-200 animate-pulse opacity-95" style={{ animationDuration: '2.8s' }} />
            <circle cx="35%" cy="65%" r="1.2" className="fill-white animate-ping opacity-60" style={{ animationDuration: '5s' }} />
            <circle cx="60%" cy="75%" r="1.8" className="fill-sky-300 animate-pulse opacity-85" style={{ animationDuration: '3.6s' }} />
            <circle cx="80%" cy="60%" r="2" className="fill-amber-300 animate-pulse opacity-90" style={{ animationDuration: '2.1s' }} />
            <circle cx="92%" cy="45%" r="1.8" className="fill-white animate-pulse opacity-95" style={{ animationDuration: '3.9s' }} />
            <circle cx="15%" cy="50%" r="1" className="fill-white opacity-50 animate-pulse" style={{ animationDuration: '4.5s' }} />
            <circle cx="50%" cy="40%" r="1.5" className="fill-amber-100 opacity-75 animate-pulse" style={{ animationDuration: '3.1s' }} />

            {/* 4-Point Glimmer Star */}
            <g className="animate-spin-slow origin-center opacity-90" style={{ transformOrigin: '78% 28%', animationDuration: '18s' }}>
              <path
                d="M 0,-10 Q 0,0 10,0 Q 0,0 0,10 Q 0,0 -10,0 Q 0,0 0,-10"
                fill="#FEF08A"
                transform="translate(390, 55) scale(0.9)"
              />
            </g>
            <g className="animate-pulse opacity-85" style={{ transformOrigin: '55% 45%', animationDuration: '3s' }}>
              <path
                d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8"
                fill="#BAE6FD"
                transform="translate(280, 85) scale(0.8)"
              />
            </g>
          </svg>

          {/* 3. Glowing Crescent Moon with Deep Radial Luminescence */}
          <div className="absolute right-16 sm:right-24 top-6 sm:top-10 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            {/* Outer Moonlight Aura */}
            <div className="absolute inset-0 rounded-full bg-amber-300/30 blur-2xl animate-pulse duration-4000 scale-125" />
            <div className="absolute inset-2 rounded-full bg-amber-200/40 blur-md" />

            {/* Realistic 3D Glowing Moon SVG */}
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_30px_rgba(254,240,138,0.7)] relative z-10"
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
            className="absolute top-12 -right-16 w-[480px] h-32 opacity-70"
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
            className="absolute bottom-0 right-8 w-[600px] h-24 opacity-50"
            style={{
              animation: 'driftCloudReverse 32s ease-in-out infinite alternate',
            }}
          >
            <svg viewBox="0 0 600 120" fill="currentColor" className="w-full h-full text-indigo-950/70">
              <path d="M0 80 C100 40, 200 100, 300 60 C400 20, 500 80, 600 50 L600 120 L0 120 Z" />
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
