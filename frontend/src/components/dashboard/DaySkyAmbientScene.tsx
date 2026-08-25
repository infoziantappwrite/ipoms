'use client';

import React from 'react';

interface Props {
  className?: string;
}

export function DaySkyAmbientScene({ className = '' }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute right-0 top-0 bottom-0 w-full sm:w-2/3 lg:w-1/2 overflow-hidden z-0 opacity-90 transition-opacity duration-1000 ${className}`}
      style={{
        maskImage: 'radial-gradient(ellipse 90% 90% at 75% 50%, black 45%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 75% 50%, black 45%, transparent 100%)',
      }}
    >
      <div className="relative w-full h-full">
        {/* 1. Warm Golden Solar Atmospheric Halo */}
        <div className="absolute right-14 top-1/6 w-80 h-80 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute right-24 top-1/4 w-56 h-56 rounded-full bg-orange-300/20 dark:bg-orange-400/10 blur-2xl animate-pulse" style={{ animationDuration: '4.5s' }} />
        <div className="absolute right-32 top-10 w-44 h-44 rounded-full bg-yellow-200/25 dark:bg-yellow-300/10 blur-xl animate-pulse" style={{ animationDuration: '3.5s' }} />

        {/* 2. The Brilliant Radiant Sun with Rotating Beams */}
        <div className="absolute right-16 sm:right-24 top-6 sm:top-10 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {/* Pulsating Corona Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-100 opacity-40 blur-xl animate-ping" style={{ animationDuration: '4s' }} />
          <div className="absolute -inset-3 rounded-full bg-amber-400/25 blur-lg animate-pulse" style={{ animationDuration: '3s' }} />

          {/* Rotating Sun Rays / Flares SVG */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full drop-shadow-[0_0_16px_rgba(251,191,36,0.6)]"
            style={{ animation: 'spinSunRays 45s linear infinite' }}
          >
            <g transform="translate(50, 50)" fill="#FBBF24" opacity="0.6">
              {/* 12 Radiant Rays */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <path
                  key={deg}
                  d="M -2,-46 L 0,-54 L 2,-46 Z"
                  transform={`rotate(${deg})`}
                />
              ))}
            </g>
          </svg>

          {/* 3D Radiant Sun Sphere */}
          <svg
            viewBox="0 0 100 100"
            className="w-18 h-18 sm:w-20 sm:h-20 drop-shadow-[0_0_30px_rgba(245,158,11,0.7)] relative z-10"
          >
            <defs>
              <radialGradient id="sunGlow" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="35%" stopColor="#FEF08A" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="38" fill="url(#sunGlow)" />
          </svg>
        </div>

        {/* 3. Layer 1: Background Drifting Fluffy Day Clouds */}
        <div
          className="absolute -bottom-4 right-0 w-[540px] h-36 opacity-40 dark:opacity-20"
          style={{ animation: 'driftCloudDaySlow 40s linear infinite' }}
        >
          <svg viewBox="0 0 600 200" fill="currentColor" className="w-full h-full text-sky-200/80 dark:text-slate-400">
            <path d="M50 150 C80 100, 160 100, 200 130 C230 90, 310 90, 340 125 C370 85, 450 85, 480 120 C520 95, 580 115, 600 150 C600 180, 50 180, 50 150 Z" />
          </svg>
        </div>

        {/* 4. Layer 2: Foreground Sunny Cloud Layer Floating Near Sun */}
        <div
          className="absolute top-12 -right-12 w-[460px] h-32 opacity-50 dark:opacity-30"
          style={{ animation: 'driftCloudDayFast 28s linear infinite' }}
        >
          <svg viewBox="0 0 500 180" fill="currentColor" className="w-full h-full text-amber-100/70 dark:text-slate-300">
            <path d="M30 130 C60 80, 130 75, 170 105 C200 70, 270 65, 300 100 C330 65, 400 70, 430 105 C460 85, 500 105, 500 130 C500 160, 30 160, 30 130 Z" />
          </svg>
        </div>

        {/* 5. Layer 3: Low Floating Breeze Cloud */}
        <div
          className="absolute bottom-1 right-6 w-[580px] h-24 opacity-35 dark:opacity-20"
          style={{ animation: 'driftCloudDayReverse 34s ease-in-out infinite alternate' }}
        >
          <svg viewBox="0 0 600 120" fill="currentColor" className="w-full h-full text-blue-100 dark:text-sky-200">
            <path d="M0 80 C100 40, 200 100, 300 60 C400 20, 500 80, 600 50 L600 120 L0 120 Z" />
          </svg>
        </div>

        {/* 6. Graceful Birds Flying Across the Sky */}
        {/* Bird 1 */}
        <div
          className="absolute"
          style={{ animation: 'flyBird1 18s linear infinite' }}
        >
          <div className="animate-bird-flap">
            <svg viewBox="0 0 32 20" className="w-5 h-3 text-slate-700/60 dark:text-sky-200/60 drop-shadow-xs">
              <path
                d="M 0,10 C 6,2 12,2 16,9 C 20,2 26,2 32,10 C 26,6 20,7 16,13 C 12,7 6,6 0,10 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* Bird 2 (Smaller & Higher) */}
        <div
          className="absolute"
          style={{ animation: 'flyBird2 22s linear infinite 5s' }}
        >
          <div className="animate-bird-flap-fast">
            <svg viewBox="0 0 32 20" className="w-4 h-2.5 text-slate-600/50 dark:text-sky-100/50 drop-shadow-xs">
              <path
                d="M 0,10 C 6,2 12,2 16,9 C 20,2 26,2 32,10 C 26,6 20,7 16,13 C 12,7 6,6 0,10 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* Bird 3 (Follower in Formation) */}
        <div
          className="absolute"
          style={{ animation: 'flyBird3 20s linear infinite 9s' }}
        >
          <div className="animate-bird-flap">
            <svg viewBox="0 0 32 20" className="w-3.5 h-2 text-slate-700/40 dark:text-sky-200/40 drop-shadow-xs">
              <path
                d="M 0,10 C 6,2 12,2 16,9 C 20,2 26,2 32,10 C 26,6 20,7 16,13 C 12,7 6,6 0,10 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* 7. Organic Floating Leaves & Floral Petals Drifting in the Gentle Breeze */}
        {/* Leaf 1 (Emerald Green Spring Leaf) */}
        <div
          className="absolute"
          style={{ animation: 'floatLeaf1 14s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-500/75 dark:text-emerald-400/60 drop-shadow-xs">
            <path
              d="M 2,12 C 2,4 12,2 22,2 C 22,12 20,22 12,22 C 4,22 2,12 2,12 Z M 2,12 C 10,12 15,9 22,2"
              fill="currentColor"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="0.8"
            />
          </svg>
        </div>

        {/* Petal 1 (Soft Sakura / Rose Blossom Petal) */}
        <div
          className="absolute"
          style={{ animation: 'floatPetal1 11s cubic-bezier(0.4, 0, 0.2, 1) infinite 2s' }}
        >
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-rose-400/80 dark:text-rose-300/70 drop-shadow-xs">
            <path
              d="M 10,2 C 15,2 18,7 18,11 C 18,16 14,18 10,18 C 6,18 2,16 2,11 C 2,7 5,2 10,2 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Leaf 2 (Lime Leaf fluttering) */}
        <div
          className="absolute"
          style={{ animation: 'floatLeaf2 16s cubic-bezier(0.4, 0, 0.2, 1) infinite 6s' }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-lime-600/70 dark:text-lime-400/60 drop-shadow-xs">
            <path
              d="M 2,12 C 2,4 12,2 22,2 C 22,12 20,22 12,22 C 4,22 2,12 2,12 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Petal 2 (Golden Amber Blossom Petal) */}
        <div
          className="absolute"
          style={{ animation: 'floatPetal2 13s cubic-bezier(0.4, 0, 0.2, 1) infinite 4s' }}
        >
          <svg viewBox="0 0 20 20" className="w-3 h-3 text-amber-400/80 dark:text-amber-300/70 drop-shadow-xs">
            <path
              d="M 10,2 C 15,2 18,7 18,11 C 18,16 14,18 10,18 C 6,18 2,16 2,11 C 2,7 5,2 10,2 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Petal 3 (Pink Drift) */}
        <div
          className="absolute"
          style={{ animation: 'floatPetal3 15s cubic-bezier(0.4, 0, 0.2, 1) infinite 8s' }}
        >
          <svg viewBox="0 0 20 20" className="w-2.5 h-2.5 text-pink-400/75 dark:text-pink-300/65 drop-shadow-xs">
            <path
              d="M 10,2 C 15,2 18,7 18,11 C 18,16 14,18 10,18 C 6,18 2,16 2,11 C 2,7 5,2 10,2 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Embedded CSS Animations for Physics-Based Natural Motion */}
      <style jsx>{`
        @keyframes spinSunRays {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes driftCloudDaySlow {
          0% {
            transform: translateX(110px);
          }
          50% {
            transform: translateX(-50px);
          }
          100% {
            transform: translateX(110px);
          }
        }

        @keyframes driftCloudDayFast {
          0% {
            transform: translateX(70px);
          }
          50% {
            transform: translateX(-80px);
          }
          100% {
            transform: translateX(70px);
          }
        }

        @keyframes driftCloudDayReverse {
          0% {
            transform: translateX(-30px) translateY(0px);
          }
          100% {
            transform: translateX(45px) translateY(-6px);
          }
        }

        /* ── Bird Flight Paths & Wing Flap ── */
        @keyframes flyBird1 {
          0% {
            top: 75%;
            right: -10%;
            transform: scale(0.9) rotate(-12deg);
            opacity: 0;
          }
          10% {
            opacity: 0.85;
          }
          90% {
            opacity: 0.85;
          }
          100% {
            top: 15%;
            right: 105%;
            transform: scale(0.65) rotate(-15deg);
            opacity: 0;
          }
        }

        @keyframes flyBird2 {
          0% {
            top: 60%;
            right: -10%;
            transform: scale(0.75) rotate(-8deg);
            opacity: 0;
          }
          15% {
            opacity: 0.75;
          }
          85% {
            opacity: 0.75;
          }
          100% {
            top: 10%;
            right: 110%;
            transform: scale(0.55) rotate(-12deg);
            opacity: 0;
          }
        }

        @keyframes flyBird3 {
          0% {
            top: 80%;
            right: -10%;
            transform: scale(0.65) rotate(-10deg);
            opacity: 0;
          }
          15% {
            opacity: 0.65;
          }
          85% {
            opacity: 0.65;
          }
          100% {
            top: 25%;
            right: 105%;
            transform: scale(0.5) rotate(-14deg);
            opacity: 0;
          }
        }

        /* ── Leaves & Petals Drifting Breeze Paths ── */
        @keyframes floatLeaf1 {
          0% {
            top: -10%;
            right: 25%;
            transform: rotate(0deg) scale(0.8) translate(0, 0);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          50% {
            transform: rotate(180deg) scale(1) translate(-60px, 40px);
          }
          85% {
            opacity: 0.85;
          }
          100% {
            top: 110%;
            right: 75%;
            transform: rotate(360deg) scale(0.7) translate(-120px, 80px);
            opacity: 0;
          }
        }

        @keyframes floatPetal1 {
          0% {
            top: -5%;
            right: 40%;
            transform: rotate(0deg) scale(0.75);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          50% {
            transform: rotate(140deg) scale(0.9) translate(-45px, 30px);
          }
          85% {
            opacity: 0.9;
          }
          100% {
            top: 110%;
            right: 90%;
            transform: rotate(290deg) scale(0.6) translate(-90px, 60px);
            opacity: 0;
          }
        }

        @keyframes floatLeaf2 {
          0% {
            top: -10%;
            right: 15%;
            transform: rotate(45deg) scale(0.7);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          60% {
            transform: rotate(220deg) scale(0.85) translate(-70px, 50px);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            top: 110%;
            right: 60%;
            transform: rotate(410deg) scale(0.6) translate(-130px, 90px);
            opacity: 0;
          }
        }

        @keyframes floatPetal2 {
          0% {
            top: 0%;
            right: 10%;
            transform: rotate(10deg) scale(0.8);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          50% {
            transform: rotate(160deg) scale(0.95) translate(-50px, 35px);
          }
          85% {
            opacity: 0.85;
          }
          100% {
            top: 110%;
            right: 65%;
            transform: rotate(320deg) scale(0.7) translate(-100px, 70px);
            opacity: 0;
          }
        }

        @keyframes floatPetal3 {
          0% {
            top: -5%;
            right: 60%;
            transform: rotate(0deg) scale(0.65);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          60% {
            transform: rotate(200deg) scale(0.8) translate(-40px, 30px);
          }
          85% {
            opacity: 0.8;
          }
          100% {
            top: 110%;
            right: 98%;
            transform: rotate(380deg) scale(0.55) translate(-80px, 50px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
