'use client';

import React from 'react';

export interface AnimatedIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * 1. Animated Dashboard Icon (21st.dev style)
 * 4-quadrant layout with spring tile shift and micro-expansion on hover
 */
export function AnimatedDashboardIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="9"
        rx="2"
        className="transition-all duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:fill-current/15"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="5"
        rx="2"
        className="transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:fill-current/15"
      />
      <rect
        x="14"
        y="12"
        width="7"
        height="9"
        rx="2"
        className="transition-all duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:fill-current/15"
      />
      <rect
        x="3"
        y="16"
        width="7"
        height="5"
        rx="2"
        className="transition-all duration-300 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 group-hover:fill-current/15"
      />
    </svg>
  );
}

/**
 * 2. Animated Daily Tracker / Phone Outgoing Icon (animateicons / 21st.dev style)
 * Outgoing call receiver with animated dash paths and shooting arrow on hover
 */
export function AnimatedTrackerIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <g>
        {/* Phone Handset */}
        <path
          d="M8 3c0.5 0 2.5 4.5 2.5 5c0 1 -1.5 2 -2 3c-0.5 1 0.5 2 1.5 3c0.39 0.39 2 2 3 1.5c1 -0.5 2 -2 3 -2c0.5 0 5 2 5 2.5c0 2 -1.5 3.5 -3 4c-1.5 0.5 -2.5 0.5 -4.5 0c-2 -0.5 -3.5 -1 -6 -3.5c-2.5 -2.5 -3 -4 -3.5 -6c-0.5 -2 -0.5 -3 0 -4.5c0.5 -1.5 2 -3 4 -3Z"
          className="transition-all duration-300 origin-center group-hover:stroke-primary group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]"
        />
        {/* Outgoing Arrow Stem */}
        <path
          d="M16 8l4 -4"
          className="transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:stroke-primary"
        />
        {/* Outgoing Arrow Head */}
        <path
          d="M20 4h-4M20 4v4"
          className="transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:stroke-primary"
        />
      </g>
    </svg>
  );
}

export const PhoneOutgoingIcon = AnimatedTrackerIcon;

/**
 * 3. Animated Weekly Tracker / Calendar Icon (21st.dev style)
 * Calendar with responsive day matrix, binder hook spring motion, and highlighted days on hover
 */
export function AnimatedWeeklyTrackerIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        className="transition-all duration-300 group-hover:fill-current/10 group-hover:stroke-primary"
      />
      {/* Top Binder Rings */}
      <line
        x1="16"
        y1="2"
        x2="16"
        y2="6"
        className="group-hover:-translate-y-0.5 transition-transform duration-200"
      />
      <line
        x1="8"
        y1="2"
        x2="8"
        y2="6"
        className="group-hover:-translate-y-0.5 transition-transform duration-200"
      />
      <line x1="3" y1="10" x2="21" y2="10" className="group-hover:stroke-primary transition-colors duration-300" />
      {/* Interactive Day Matrix Dots */}
      <circle cx="8" cy="14" r="1.2" className="fill-current" />
      <circle
        cx="12"
        cy="14"
        r="1.2"
        className="fill-current group-hover:scale-150 group-hover:fill-primary origin-center transition-all duration-300"
      />
      <circle cx="16" cy="14" r="1.2" className="fill-current" />
      <circle cx="8" cy="18" r="1.2" className="fill-current" />
      <circle
        cx="12"
        cy="18"
        r="1.2"
        className="fill-current group-hover:scale-150 group-hover:fill-primary origin-center transition-all duration-300 delay-75"
      />
      <circle
        cx="16"
        cy="18"
        r="1.2"
        className="fill-current group-hover:scale-150 group-hover:fill-primary origin-center transition-all duration-300 delay-150"
      />
    </svg>
  );
}

export const AnimatedCalendarIcon = AnimatedWeeklyTrackerIcon;

/**
 * 4. Animated Daily Leads / Target Icon (21st.dev style)
 * Bullseye with rotating crosshair radar sweep and center lock dot
 */
export function AnimatedDailyLeadsIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <circle cx="12" cy="12" r="10" className="group-hover:stroke-primary transition-colors duration-300" />
      <circle
        cx="12"
        cy="12"
        r="6"
        className="group-hover:scale-90 origin-center transition-transform duration-300"
      />
      <circle cx="12" cy="12" r="2" className="fill-current group-hover:scale-125 origin-center transition-transform duration-300" />
      {/* Radar Crosshairs */}
      <line x1="12" y1="2" x2="12" y2="5" className="group-hover:translate-y-0.5 transition-transform duration-300" />
      <line x1="12" y1="19" x2="12" y2="22" className="group-hover:-translate-y-0.5 transition-transform duration-300" />
      <line x1="2" y1="12" x2="5" y2="12" className="group-hover:translate-x-0.5 transition-transform duration-300" />
      <line x1="19" y1="12" x2="22" y2="12" className="group-hover:-translate-x-0.5 transition-transform duration-300" />
    </svg>
  );
}

/**
 * 5. Animated Active Leads / Unlimited (Infinity) Icon (21st.dev style)
 * Infinite loop representing unlimited corporate leads with pulsing dual orbital nodes & flowing path
 */
export function AnimatedActiveLeadsIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <path
        d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"
        className="transition-all duration-300 group-hover:stroke-primary group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]"
      />
      {/* Orbital Flowing Pulses */}
      <circle cx="6" cy="12" r="1.5" className="fill-current opacity-60 group-hover:opacity-100 group-hover:scale-125 origin-center transition-all duration-300" />
      <circle cx="18" cy="12" r="1.5" className="fill-current opacity-60 group-hover:opacity-100 group-hover:scale-125 origin-center transition-all duration-300 delay-100" />
    </svg>
  );
}

export const AnimatedInfinityIcon = AnimatedActiveLeadsIcon;

/**
 * Animated Route Icon (AnimateIcons / 21st.dev style)
 */
export function AnimatedRouteIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <circle cx="6" cy="19" r="3" className="group-hover:scale-125 origin-[6px_19px] transition-transform duration-300" />
      <path
        d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"
        className="transition-all duration-300 group-hover:stroke-primary"
      />
      <circle cx="18" cy="5" r="3" className="group-hover:scale-125 origin-[18px_5px] transition-transform duration-300 delay-100" />
    </svg>
  );
}

/**
 * 6. Animated Pending Tasks / ListTodo Icon (21st.dev style)
 * Checkbox and list with animated tick-in and sliding bullet items
 */
export function AnimatedPendingTasksIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <rect
        x="3"
        y="5"
        width="6"
        height="6"
        rx="1"
        className="transition-all duration-300 group-hover:fill-current/15"
      />
      <path
        d="m5 8 1 1 2-2"
        className="origin-center group-hover:scale-110 transition-transform duration-200"
      />
      <path
        d="M13 6h8"
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
      <path
        d="M13 12h8"
        className="transition-transform duration-300 delay-75 group-hover:translate-x-1"
      />
      <path
        d="M13 18h8"
        className="transition-transform duration-300 delay-150 group-hover:translate-x-1"
      />
      <rect
        x="3"
        y="15"
        width="6"
        height="6"
        rx="1"
        className="transition-all duration-300 group-hover:fill-current/15"
      />
    </svg>
  );
}

/**
 * 7. Animated Metadata DB / Database Icon (21st.dev style)
 * 3-tier database stack with sequential glowing LED layers
 */
export function AnimatedMetadataIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" className="group-hover:fill-current/20 transition-colors duration-300" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path
        d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"
        className="group-hover:translate-y-0.5 transition-transform duration-300"
      />
    </svg>
  );
}

/**
 * 8. Animated Report Builder / Spreadsheet Icon (21st.dev style)
 * Document sheet with rising staggered bar charts
 */
export function AnimatedReportsIcon({ size = 20, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-300 ${className}`}
    >
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
        className="transition-all duration-300 group-hover:fill-current/10"
      />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      {/* Rising Bar Graph Columns */}
      <path
        d="M8 18v-3"
        className="group-hover:stroke-primary transition-all duration-300"
      />
      <path
        d="M12 18v-6"
        className="group-hover:stroke-primary transition-all duration-300 delay-75"
      />
      <path
        d="M16 18v-9"
        className="group-hover:stroke-primary transition-all duration-300 delay-150"
      />
    </svg>
  );
}

/**
 * 9. Animated Trash / Delete Icon (21st.dev style)
 * Dustbin with spring-hinge opening lid on hover
 */
export function AnimatedTrashIcon({ size = 16, className = '', strokeWidth = 2 }: AnimatedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`group-hover:scale-110 transition-transform duration-200 ${className}`}
    >
      {/* Lifting Lid */}
      <path
        d="M3 6h18"
        className="origin-left group-hover:-translate-y-1 transition-transform duration-200"
      />
      <path
        d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        className="origin-left group-hover:-translate-y-1 group-hover:-rotate-6 transition-transform duration-200"
      />
      {/* Bin Body */}
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" className="group-hover:stroke-destructive transition-colors duration-200" />
      <line x1="14" y1="11" x2="14" y2="17" className="group-hover:stroke-destructive transition-colors duration-200" />
    </svg>
  );
}

/**
 * 10. Animated Theme Toggle Icon (Sun / Moon morphing)
 */
export function AnimatedThemeIcon({ isDark = false, size = 16, className = '' }: { isDark?: boolean; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-all duration-300 ${isDark ? 'text-amber-400 -rotate-12' : 'text-amber-500 rotate-0'} group-hover:scale-110 ${className}`}
    >
      {isDark ? (
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" className="fill-amber-400/20" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" className="fill-amber-500/20" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </>
      )}
    </svg>
  );
}
