'use client';

import React from 'react';

export interface KnowledgeTrailLoaderProps {
  variant?: 'fullscreen' | 'section' | 'inline' | 'page';
  message?: string;
  submessage?: string;
  step?: 1 | 2 | 3 | 4;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STEPS = [
  { id: 1, label: 'Reconstruct', icon: 'dataset' },
  { id: 2, label: 'Verify', icon: 'fact_check' },
  { id: 3, label: 'Review', icon: 'rule' },
  { id: 4, label: 'Handover', icon: 'verified' },
];

export function KnowledgeTrailLoader({
  variant = 'section',
  message = 'Preparing your workspace...',
  submessage,
  step = 1,
  progress,
  size = 'md',
  className = '',
}: KnowledgeTrailLoaderProps) {
  // 1. INLINE VARIANT (For inside buttons or compact indicators)
  if (variant === 'inline') {
    const sizeClasses = size === 'sm' ? 'w-6 h-2.5' : size === 'lg' ? 'w-10 h-4' : 'w-8 h-3';
    return (
      <span
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`inline-flex items-center gap-1.5 ${className}`}
      >
        <span className="sr-only">{message}</span>
        <svg
          viewBox="0 0 32 12"
          className={`${sizeClasses} text-current overflow-visible`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Base connecting line */}
          <line
            x1="4"
            y1="6"
            x2="28"
            y2="6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
          {/* Dot 1 */}
          <circle
            cx="4"
            cy="6"
            r="2.5"
            fill="currentColor"
            className="animate-trail-dot-1"
          />
          {/* Dot 2 */}
          <circle
            cx="16"
            cy="6"
            r="2.5"
            fill="currentColor"
            className="animate-trail-dot-2"
          />
          {/* Dot 3 */}
          <circle
            cx="28"
            cy="6"
            r="2.5"
            fill="currentColor"
            className="animate-trail-dot-3"
          />
        </svg>
      </span>
    );
  }

  // Common SVG Trail Graphic used by Page, Section, and Fullscreen
  const renderTrailGraphic = (compact = false) => {
    const width = compact ? 220 : 280;
    const height = 40;
    const y = 20;
    const nodeCoords = [
      compact ? 20 : 25,
      compact ? 80 : 105,
      compact ? 140 : 185,
      compact ? 200 : 255,
    ];

    return (
      <div className="flex flex-col items-center gap-2 w-full max-w-xs select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[280px] h-10 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Base inactive dashed trail line */}
          <line
            x1={nodeCoords[0]}
            y1={y}
            x2={nodeCoords[3]}
            y2={y}
            stroke="#c1c8c2"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Active moving beam of light */}
          <line
            x1={nodeCoords[0]}
            y1={y}
            x2={nodeCoords[3]}
            y2={y}
            stroke="url(#trailBeamGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-trail-beam"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="trailBeamGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#416352" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#597c6a" stopOpacity="1" />
              <stop offset="100%" stopColor="#cae6d5" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* 4 Connected Knowledge Nodes */}
          {STEPS.map((s, idx) => {
            const cx = nodeCoords[idx];
            const isPassed = step > s.id;
            const isCurrent = step === s.id;

            return (
              <g key={s.id} className="transition-all duration-300">
                {/* Active radiating pulse ring */}
                {isCurrent && (
                  <circle
                    cx={cx}
                    cy={y}
                    r="12"
                    fill="#416352"
                    fillOpacity="0.15"
                    className="animate-trail-pulse"
                  />
                )}
                {/* Node circle */}
                <circle
                  cx={cx}
                  cy={y}
                  r={isCurrent ? 7.5 : 5.5}
                  fill={isPassed || isCurrent ? '#416352' : '#ffffff'}
                  stroke={isPassed || isCurrent ? '#416352' : '#c1c8c2'}
                  strokeWidth="2"
                  className={isCurrent ? 'filter drop-shadow(0 0 4px rgba(65,99,82,0.35))' : ''}
                />
                {/* Inner dot */}
                <circle
                  cx={cx}
                  cy={y}
                  r="2.5"
                  fill={isPassed || isCurrent ? '#ffffff' : '#727973'}
                />
              </g>
            );
          })}
        </svg>

        {/* Node Labels below trail */}
        <div className="flex justify-between w-full text-[10px] font-mono tracking-wider text-outline px-1">
          {STEPS.map((s) => {
            const isCurrent = step === s.id;
            return (
              <span
                key={s.id}
                className={`transition-colors duration-200 ${
                  isCurrent ? 'text-primary font-bold' : 'text-outline/70'
                }`}
              >
                {s.label}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. FULLSCREEN VARIANT (Initial load & global overlay)
  if (variant === 'fullscreen') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 animate-in fade-in duration-300 select-none ${className}`}
      >
        <div className="flex flex-col items-center text-center max-w-sm w-full bg-surface-container-lowest/80 p-8 rounded-3xl border border-outline-variant/30 shadow-[0_20px_50px_rgba(32,40,34,0.06)]">
          {/* Logo Emblem */}
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-md shadow-primary/20">
              <span className="material-symbols-outlined text-[34px]">route</span>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-primary/20 -z-10 animate-trail-pulse" />
          </div>

          {/* Brand Typography */}
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            KnoTrail
          </h1>
          <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mt-0.5 mb-6">
            Knowledge Handover Platform
          </p>

          {/* Animated Knowledge Trail */}
          {renderTrailGraphic(false)}

          {/* Contextual Status Message */}
          <div className="mt-6 flex flex-col items-center">
            <p className="font-headline-sm text-headline-sm text-on-surface font-semibold text-center leading-snug">
              {message}
            </p>
            {submessage && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 text-center leading-relaxed max-w-xs">
                {submessage}
              </p>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="w-full mt-6">
            <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden relative">
              {typeof progress === 'number' ? (
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              ) : (
                <div className="w-1/2 h-full bg-gradient-to-r from-primary/30 via-primary to-primary-container rounded-full animate-trail-shimmer" />
              )}
            </div>
            {typeof progress === 'number' && (
              <div className="flex justify-between items-center text-[10px] text-outline font-mono mt-1 px-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. PAGE VARIANT (For Next.js loading.tsx boundaries)
  if (variant === 'page') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`min-h-[60vh] w-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-200 select-none ${className}`}
      >
        <div className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center mb-4 shadow-xs">
            <span className="material-symbols-outlined text-[26px]">route</span>
          </div>

          <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight mb-4">
            {message}
          </h2>

          {renderTrailGraphic(true)}

          {submessage && (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-4 text-center leading-relaxed">
              {submessage}
            </p>
          )}

          <div className="w-full bg-surface-container-high rounded-full h-1 overflow-hidden relative mt-5">
            <div className="w-1/2 h-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full animate-trail-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // 4. SECTION VARIANT (Embedded inside views/cards)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`w-full bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 flex flex-col items-center text-center animate-in fade-in duration-200 select-none ${className}`}
    >
      <div className="flex items-center gap-2 text-primary mb-2">
        <span className="material-symbols-outlined text-[20px]">route</span>
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
          {message}
        </span>
      </div>

      {submessage && (
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mb-4 leading-relaxed">
          {submessage}
        </p>
      )}

      {renderTrailGraphic(true)}

      <div className="w-full max-w-xs bg-surface-container-high rounded-full h-1.5 overflow-hidden relative mt-4">
        {typeof progress === 'number' ? (
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        ) : (
          <div className="w-1/2 h-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full animate-trail-shimmer" />
        )}
      </div>
    </div>
  );
}
