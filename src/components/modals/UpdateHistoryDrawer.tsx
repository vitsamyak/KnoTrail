'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitHubIntegration,
  ContinuousUpdateRecord,
  ContinuousUpdateStatus,
  UserRole,
} from '../../lib/types';
import { apiClient } from '../../lib/api-client';

interface UpdateHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  integration: GitHubIntegration | null;
  workspaceId: string;
  currentUserRole?: UserRole;
  onRetryComplete?: () => void;
}

export function UpdateHistoryDrawer({
  isOpen,
  onClose,
  integration,
  workspaceId,
  currentUserRole = 'MANAGER',
  onRetryComplete,
}: UpdateHistoryDrawerProps) {
  const [history, setHistory] = useState<ContinuousUpdateRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retry state
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{
    updateId: string;
    success: boolean;
    message: string;
  } | null>(null);

  const PAGE_LIMIT = 10;

  const loadHistory = useCallback(
    async (reset = true) => {
      if (!integration) return;

      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const nextOffset = reset ? 0 : offset;
        const res = await apiClient.getContinuousUpdateHistory(
          workspaceId,
          integration.repoId,
          {
            limit: PAGE_LIMIT,
            offset: nextOffset,
          }
        );

        if (reset) {
          setHistory(res.history || []);
          setOffset(PAGE_LIMIT);
        } else {
          setHistory((prev) => [...prev, ...(res.history || [])]);
          setOffset((prev) => prev + PAGE_LIMIT);
        }

        setTotal(res.total || 0);
        setHasMore(Boolean(res.hasMore));
      } catch (err: any) {
        setError(err.message || 'Failed to load update history.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [integration, workspaceId, offset]
  );

  useEffect(() => {
    if (isOpen && integration) {
      setRetryFeedback(null);
      setOffset(0);
      loadHistory(true);
    } else {
      setHistory([]);
      setTotal(0);
      setOffset(0);
      setHasMore(false);
    }
  }, [isOpen, integration?.repoId]);

  if (!isOpen || !integration) return null;

  const handleRetry = async (record: ContinuousUpdateRecord) => {
    if (currentUserRole === 'EXTERNAL') return;

    setRetryingId(record.id);
    setRetryFeedback(null);

    try {
      const res = await apiClient.retryContinuousUpdate(
        workspaceId,
        integration.repoId,
        record.id
      );

      if (res.success) {
        setRetryFeedback({
          updateId: record.id,
          success: true,
          message: `Retry succeeded: ${res.findingsAdded} findings extracted and verified.`,
        });
        await loadHistory(true);
        if (onRetryComplete) onRetryComplete();
      } else {
        setRetryFeedback({
          updateId: record.id,
          success: false,
          message: res.error || res.message || 'Retry failed.',
        });
      }
    } catch (err: any) {
      setRetryFeedback({
        updateId: record.id,
        success: false,
        message: err.message || 'Retry request failed.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: ContinuousUpdateStatus) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Success</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Partial</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Failed</span>
          </span>
        );
      case 'no_change':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-secondary bg-surface-container-low border border-outline-variant/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>No Change</span>
          </span>
        );
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'webhook':
        return 'webhook';
      case 'manual_sync':
        return 'sync';
      case 'retry':
        return 'replay';
      default:
        return 'history';
    }
  };

  const canRetry = currentUserRole === 'MANAGER' || currentUserRole === 'DEVELOPER';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-out Drawer Panel */}
      <div className="w-full max-w-xl bg-surface-container-lowest h-full shadow-2xl border-l border-outline-variant/40 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-outline-variant/30 flex items-start justify-between gap-3 bg-surface-container-low/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined text-primary text-[22px]">
                update
              </span>
              <h2 className="text-base font-bold text-on-surface">
                Continuous Update Activity
              </h2>
              {currentUserRole === 'EXTERNAL' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container text-secondary border border-outline-variant/30">
                  Read-Only (External)
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-1">
              Audit log of repository syncs, webhook deliveries, and AI knowledge extraction for{' '}
              <strong className="text-on-surface font-mono">
                {integration.repoOwner}/{integration.repoName}
              </strong>
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-secondary font-mono">
              <span className="bg-surface-container px-2 py-0.5 rounded">
                branch: {integration.selectedBranch || integration.defaultBranch}
              </span>
              <span>•</span>
              <span>Total Records: {total}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => loadHistory(true)}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
              title="Refresh activity history"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  isLoading ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-secondary hover:text-on-surface transition-colors"
              title="Close drawer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {retryFeedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-lg text-xs flex items-start gap-2 ${
              retryFeedback.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
              {retryFeedback.success ? 'check_circle' : 'error'}
            </span>
            <div className="flex-1">
              <p className="font-medium">{retryFeedback.message}</p>
            </div>
            <button
              onClick={() => setRetryFeedback(null)}
              className="text-secondary hover:text-on-surface text-[14px]"
            >
              ×
            </button>
          </div>
        )}

        {/* Drawer Body / Activity List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 animate-pulse space-y-2.5"
                >
                  <div className="h-4 bg-surface-container-high rounded w-1/3"></div>
                  <div className="h-3 bg-surface-container-high rounded w-3/4"></div>
                  <div className="h-3 bg-surface-container-high rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                error
              </span>
              <div>
                <strong>Error loading update history:</strong>
                <p className="mt-1">{error}</p>
                <button
                  onClick={() => loadHistory(true)}
                  className="mt-2 text-primary hover:underline font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-secondary bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant/40 my-6">
              <span className="material-symbols-outlined text-[32px] text-secondary/60">
                history_toggle_off
              </span>
              <span className="text-xs font-semibold text-on-surface">
                No Continuous Update Activity
              </span>
              <p className="text-[11px] text-secondary max-w-xs leading-relaxed">
                Update events will appear automatically when GitHub webhooks arrive (push, PR,
                issues) or when manual synchronizations are triggered.
              </p>
            </div>
          ) : (
            history.map((record) => {
              const isEligibleForRetry =
                (record.status === 'partial' || record.status === 'failed') &&
                record.retryCount < record.maxRetries;

              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-xl border transition-all text-xs flex flex-col gap-2.5 bg-surface-container-lowest shadow-xs ${
                    record.status === 'failed'
                      ? 'border-rose-500/30'
                      : record.status === 'partial'
                      ? 'border-amber-500/30'
                      : 'border-outline-variant/40'
                  }`}
                >
                  {/* Top Status & Trigger Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Trigger pill */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-surface-container-low text-on-surface px-2 py-0.5 rounded-full border border-outline-variant/30 font-mono">
                        <span className="material-symbols-outlined text-[12px] text-primary">
                          {getTriggerIcon(record.trigger)}
                        </span>
                        <span className="capitalize">{record.trigger.replace('_', ' ')}</span>
                      </span>

                      {/* Event Type */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-secondary">
                        {record.eventType}
                      </span>

                      {/* Status Badge */}
                      {getStatusBadge(record.status)}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[11px] text-secondary font-mono">
                      {new Date(record.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      {' • '}
                      {new Date(record.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Description / Reason */}
                  <p className="text-xs text-on-surface leading-relaxed">
                    {record.reason}
                  </p>

                  {/* Metadata Chips: Commit SHA, Counts, Handover */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-secondary pt-1 border-t border-outline-variant/20">
                    {record.commitSha && (
                      <span className="bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant/30 text-primary font-semibold">
                        SHA: {record.commitSha.slice(0, 7)}
                      </span>
                    )}

                    {record.findingsAdded > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{record.findingsAdded} added
                      </span>
                    )}

                    {record.findingsInvalidated > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        -{record.findingsInvalidated} drifted
                      </span>
                    )}

                    {record.conflictsDetected > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {record.conflictsDetected} conflict(s)
                      </span>
                    )}

                    {record.handoverInvalidated && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        handover outdated
                      </span>
                    )}

                    <span className="ml-auto text-[10px] text-secondary">
                      Retry {record.retryCount}/{record.maxRetries}
                    </span>
                  </div>

                  {/* Error Callout */}
                  {record.errorMessage && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">
                        warning
                      </span>
                      <p className="leading-relaxed font-mono text-[11px]">
                        {record.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Retry Action Button for Eligible Records */}
                  {isEligibleForRetry && (
                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                      <span className="text-[11px] text-secondary">
                        Processing incomplete. You can retry AI extraction and drift verification.
                      </span>

                      <button
                        onClick={() => handleRetry(record)}
                        disabled={retryingId === record.id || !canRetry}
                        title={
                          !canRetry
                            ? 'Manager or Developer permissions required to retry.'
                            : undefined
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shadow-xs ${
                          !canRetry
                            ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed border border-outline-variant/40'
                            : 'bg-primary text-on-primary hover:bg-primary-hover active:scale-95'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[14px] ${
                            retryingId === record.id ? 'animate-spin' : ''
                          }`}
                        >
                          replay
                        </span>
                        <span>
                          {retryingId === record.id
                            ? 'Retrying...'
                            : !canRetry
                            ? 'Retry (Read-Only)'
                            : 'Retry'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Load More Pagination Button */}
          {hasMore && !isLoading && (
            <div className="pt-2 text-center">
              <button
                onClick={() => loadHistory(false)}
                disabled={isLoadingMore}
                className="w-full py-2 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-medium text-xs border border-outline-variant/30 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                {isLoadingMore ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Loading more activity...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                    <span>Load More Activity ({total - history.length} remaining)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/40 flex items-center justify-between text-xs text-secondary">
          <span>Continuous Update Engine Active</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
