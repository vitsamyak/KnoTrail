'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import type { UserRole } from '../../lib/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  label: string;
  email: string;
  password: string;
  badge: string;
  shortBadge: string;
  badgeColor: string;
  description: string;
  icon: string;
}> = [
  {
    role: 'MANAGER',
    label: 'Manager',
    email: 'manager@knotrail.demo',
    password: 'KnoTrail2026!Manager',
    badge: 'Full Governance',
    shortBadge: 'Full Control',
    badgeColor: 'bg-primary/10 text-primary border-primary/30',
    description: 'Approve & reject findings, certify handovers, resolve conflicts, manage members.',
    icon: 'admin_panel_settings',
  },
  {
    role: 'DEVELOPER',
    label: 'Developer',
    email: 'developer@knotrail.demo',
    password: 'KnoTrail2026!Dev',
    badge: 'Operational Access',
    shortBadge: 'Contributor',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
    description: 'Upload documents, sync GitHub, edit finding details, retry update jobs. No approval powers.',
    icon: 'code',
  },
  {
    role: 'EXTERNAL',
    label: 'External',
    email: 'external@knotrail.demo',
    password: 'KnoTrail2026!Ext',
    badge: 'Auditor (Read-Only)',
    shortBadge: 'Auditor',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
    description: 'Auditor permissions: read-only access with confidential source contents and paths redacted.',
    icon: 'visibility',
  },
];

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login, isAuthLoading, authError, setActiveView } = useProject();

  const [selectedRole, setSelectedRole] = useState<UserRole>('MANAGER');
  const [email, setEmail] = useState('manager@knotrail.demo');
  const [password, setPassword] = useState('KnoTrail2026!Manager');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole('MANAGER');
      setEmail('manager@knotrail.demo');
      setPassword('KnoTrail2026!Manager');
      setShowPassword(false);
      setLocalError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectDemoRole = (role: UserRole) => {
    const matched = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (matched) {
      setSelectedRole(matched.role);
      setEmail(matched.email);
      setPassword(matched.password);
      setLocalError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!trimmedPassword) {
      setLocalError('Please enter your password.');
      return;
    }

    setLocalError(null);
    const result = await login({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (result.success) {
      onClose();
      setActiveView('workspace');
      if (onSuccess) onSuccess();
    } else {
      setLocalError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const activeAccount = DEMO_ACCOUNTS.find((a) => a.role === selectedRole);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/50 p-6 flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
            </div>
            <div>
              <h2
                id="login-modal-title"
                className="text-sm font-bold text-on-surface tracking-tight"
              >
                Sign In to KnoTrail
              </h2>
              <p className="text-[11px] text-secondary mt-0.5 leading-snug">
                Select a role to test server-verified RBAC boundaries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-on-surface hover:bg-surface-container p-1 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Public Demo Info Banner */}
        <div className="p-3 bg-surface-container-low/70 border border-outline-variant/30 rounded-xl flex items-start gap-2.5 text-xs text-secondary">
          <span className="material-symbols-outlined text-primary text-[17px] shrink-0 mt-0.5">
            info
          </span>
          <p className="text-secondary leading-relaxed text-[11px]">
            <strong className="text-on-surface font-semibold">Zero-Login Evaluation:</strong> Judges can explore all views with no credentials in Demo mode. To evaluate role-based controls and signed HMAC sessions, choose a demo account below.
          </p>
        </div>

        {/* Role-Specific Demo Account Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono text-secondary uppercase tracking-wider font-semibold">
            Select Demo Account Role:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = selectedRole === acc.role;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleSelectDemoRole(acc.role)}
                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30 text-secondary hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                      {acc.icon}
                    </span>
                    <span className={`font-semibold text-xs ${isSelected ? 'text-on-surface' : 'text-on-surface/80'}`}>
                      {acc.label}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-primary/20 text-primary font-semibold' : 'bg-surface-container text-secondary'
                  }`}>
                    {acc.shortBadge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Role Permissions Card */}
          {activeAccount && (
            <div className="p-2.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/30 text-xs flex items-start gap-2.5 mt-0.5">
              <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">
                shield
              </span>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-on-surface">{activeAccount.label} Role:</span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${activeAccount.badgeColor}`}>
                    {activeAccount.badge}
                  </span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  {activeAccount.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Feedback Alert */}
        {(localError || authError) && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <span className="material-symbols-outlined text-rose-600 text-[16px] shrink-0 mt-0.5">
              error
            </span>
            <span className="font-medium leading-relaxed">{localError || authError}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface" htmlFor="login-email">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px] pointer-events-none select-none">
                mail
              </span>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="manager@knotrail.demo"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  const match = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === e.target.value.toLowerCase().trim());
                  if (match) setSelectedRole(match.role);
                }}
                className="w-full bg-surface-container-low/60 text-on-surface pl-10 pr-3.5 h-10 rounded-xl border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-colors font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface" htmlFor="login-password">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px] pointer-events-none select-none">
                lock
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low/60 text-on-surface pl-10 pr-10 h-10 rounded-xl border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-colors font-mono tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-secondary hover:text-on-surface focus:outline-none rounded-md transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30 mt-1">
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isAuthLoading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  <span>Sign In as {activeAccount ? activeAccount.label : 'User'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isAuthLoading}
              className="w-full h-8 px-3 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low font-medium text-xs transition-colors flex items-center justify-center gap-1"
            >
              <span>Continue as Guest Demo (No Sign In)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
