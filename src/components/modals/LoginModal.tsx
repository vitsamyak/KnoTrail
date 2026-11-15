'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login, isAuthLoading, authError, setActiveView } = useProject();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
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

  const handleFillDemoCredentials = () => {
    setEmail('manager@knotrail.demo');
    setPassword('KnoTrail2026!Manager');
    setLocalError(null);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/50 p-6 flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
              <h2
                id="login-modal-title"
                className="text-sm font-semibold text-on-surface tracking-tight"
              >
                Sign In to KnoTrail
              </h2>
              <p className="text-[11px] text-secondary mt-0.5">
                Server-verified authentication for protected workspaces
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Public Demo Info Banner */}
        <div className="p-3 bg-surface-container-low/50 border border-outline-variant/30 rounded-lg flex items-start gap-2.5 text-xs text-secondary">
          <span className="material-symbols-outlined text-primary text-[17px] shrink-0 mt-0.5">
            info
          </span>
          <div className="space-y-0.5">
            <p className="font-semibold text-on-surface text-xs">Zero-Login Public Demo Available</p>
            <p className="text-secondary leading-relaxed text-[11px]">
              Judges and evaluators can explore all 8 views with zero login. Sign in with the Demo Manager account to evaluate server-verified RBAC and team permissions.
            </p>
          </div>
        </div>

        {/* Demo Credentials Quick-Fill Card */}
        <div className="p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-on-surface text-xs">Demo Manager Account</span>
            <span className="font-mono text-[11px] text-primary truncate">manager@knotrail.demo</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemoCredentials}
            className="px-2.5 h-7 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-[11px] border border-outline-variant/40 transition-colors shrink-0"
          >
            Use Demo Login
          </button>
        </div>

        {/* Error Feedback Alert */}
        {(localError || authError) && (
          <div className="p-2.5 bg-error/10 border border-error/30 rounded-lg flex items-start gap-2 text-xs text-error">
            <span className="material-symbols-outlined text-error text-[16px] shrink-0 mt-0.5">
              error
            </span>
            <span className="font-medium leading-relaxed">{localError || authError}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface" htmlFor="login-email">
              Email Address
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-secondary text-[16px]">
                mail
              </span>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="manager@knotrail.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface pl-8 pr-3 h-9 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary text-xs transition-colors font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface" htmlFor="login-password">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-secondary text-[16px]">
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
                className="w-full bg-surface-container-low text-on-surface pl-8 pr-9 h-9 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary text-xs transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-secondary hover:text-on-surface focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-outline-variant/30 mt-1">
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full sm:flex-1 h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-on-primary font-medium text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isAuthLoading ? (
                <>
                  <span className="material-symbols-outlined text-[15px] animate-spin">
                    progress_activity
                  </span>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">login</span>
                  <span>Sign In as Manager</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isAuthLoading}
              className="w-full sm:w-auto h-9 px-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-medium text-xs border border-outline-variant/40 transition-colors"
            >
              Continue as Demo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
