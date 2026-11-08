'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { KnowledgeFinding } from '../../lib/types';

export function ReviewView() {
  const {
    project,
    stats,
    approveFinding,
    rejectFinding,
    editFinding,
    resolveConflict,
    certifyHandover,
    setActiveView,
    selectedFinding,
    setSelectedFinding,
  } = useProject();

  const [conflictModalFinding, setConflictModalFinding] = useState<KnowledgeFinding | null>(null);
  const [conflictResolutionText, setConflictResolutionText] = useState('');
  const [editModalFinding, setEditModalFinding] = useState<KnowledgeFinding | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [signerName, setSignerName] = useState(project.lead?.name || 'Project Reviewer');
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);

  // Open conflict resolution modal
  const handleOpenConflictModal = (finding: KnowledgeFinding) => {
    setConflictModalFinding(finding);
    setConflictResolutionText(
      finding.conflictDetails?.resolution ||
        'Adopt documented standard and update configuration files accordingly.'
    );
  };

  // Submit conflict resolution
  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictModalFinding) return;
    resolveConflict(conflictModalFinding.id, conflictResolutionText, signerName || project.lead?.name || 'Project Reviewer');
    setConflictModalFinding(null);
  };

  // Open edit modal
  const handleOpenEditModal = (finding: KnowledgeFinding) => {
    setEditModalFinding(finding);
    setEditTitle(finding.title);
    setEditSummary(finding.summary);
  };

  // Submit edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalFinding) return;
    editFinding(editModalFinding.id, {
      title: editTitle.trim(),
      summary: editSummary.trim(),
    });
    setEditModalFinding(null);
  };

  const hasBlockingConflicts = project.findings.some((f) => f.status === 'CONFLICTING');

  return (
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
            <span
              onClick={() => setActiveView('workspace')}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              {project.name}
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Review Center</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Human Review &amp; Knowledge Sign-Off
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Validate AI-reconstructed statements, resolve conflicting architectural evidence, and certify handover integrity.
          </p>
        </div>

        {/* Active Reviewer Strip */}
        <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-full border border-outline-variant/30">
          <img
            src={project.lead.avatar}
            alt={project.lead.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-container-lowest"
          />
          <div className="flex flex-col text-left text-xs">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold leading-tight">
              {project.lead.name}
            </span>
            <span className="font-body-sm text-body-sm text-outline leading-tight">
              {project.lead.role}
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Governance Warning Banner */}
      <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-xs">
        <div className="flex items-start gap-space-sm">
          <div className="p-2 bg-secondary-container text-on-secondary-container rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified_user</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Strict Human Oversight Mandate
              </span>
              <span className="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Audit Protocol 4.1
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              AI generates candidate findings; humans hold legal and technical approval authority. No ungrounded claim can be certified into the final handover package.
            </p>
          </div>
        </div>

        {/* Real-time Approval Progress */}
        <div className="flex items-center gap-space-md shrink-0 self-end md:self-center">
          <div className="flex flex-col items-end">
            <span className="text-xs text-outline font-medium">Certification Level</span>
            <span className="text-xl font-bold text-on-surface">{stats.certificationProgressPercent}%</span>
          </div>
          <button
            onClick={() => setShowCertifyConfirm(true)}
            disabled={!stats.canCertifyHandover}
            className={`px-space-md py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              !stats.canCertifyHandover
                ? 'bg-surface-container text-outline cursor-not-allowed border border-outline-variant/30'
                : 'bg-primary text-on-primary hover:bg-primary-container active:scale-95'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>
              {hasBlockingConflicts
                ? 'Resolve Conflicts to Certify'
                : stats.unreviewedCount > 0
                ? `Review All Claims to Certify (${stats.unreviewedCount} pending)`
                : project.handoverCertified
                ? 'Re-certify Handover'
                : 'Certify & Approve Handover'}
            </span>
          </button>
        </div>
      </div>

      {/* REVIEW FINDINGS STREAM */}
      <div className="space-y-space-md">
        {project.findings.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-space-2xl border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">rule</span>
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">No findings awaiting review.</h4>
            <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
              Upload project documents and run AI extraction to populate the Review Center with decisions, tasks, and risks for human approval.
            </p>
            <button
              onClick={() => setActiveView('sources')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
          </div>
        ) : (
          project.findings.map((finding) => (
          <div
            key={finding.id}
            className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border transition-all ${
              finding.approved
                ? 'border-primary/40 bg-primary-fixed/5'
                : finding.status === 'CONFLICTING'
                ? 'border-error/50 bg-error-container/10 ring-1 ring-error/20'
                : 'border-outline-variant/30'
            }`}
          >
            {/* Top row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    finding.status === 'VERIFIED'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : finding.status === 'CONFLICTING'
                      ? 'bg-error text-on-error animate-pulse'
                      : finding.status === 'UNCERTAIN'
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {finding.status}
                </span>

                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {finding.title}
                </span>

                {finding.approved && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    <span>Approved</span>
                  </span>
                )}
                {finding.rejected && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-error bg-error-container px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">cancel</span>
                    <span>Rejected</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-outline">Assigned: {finding.owner}</span>
                <span>•</span>
                <span className="font-semibold text-primary">{finding.confidence}% confidence</span>
              </div>
            </div>

            {/* Summary */}
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
              {finding.summary}
            </p>

            {/* CONFLICT DETAILS CALLOUT (If CONFLICTING) */}
            {finding.conflictDetails && (
              <div className="mt-space-sm bg-surface-container-low rounded-xl p-space-md border border-error/30 flex flex-col gap-space-xs text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-error font-semibold">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    <span>Active Architectural Conflict Identified</span>
                  </div>
                  <span className="font-mono text-[10px] text-outline">Action Required</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm pt-1">
                  <div className="bg-surface-container-lowest p-space-sm rounded-lg border border-outline-variant/30">
                    <span className="font-semibold text-on-surface block mb-1">
                      Source A: {finding.conflictDetails.sourceA.name}
                    </span>
                    <p className="text-on-surface-variant text-[11px] leading-relaxed">
                      {finding.conflictDetails.sourceA.claim}
                    </p>
                    <span className="text-[10px] text-outline font-mono mt-1 block">
                      Ref: {finding.conflictDetails.sourceA.reference}
                    </span>
                  </div>

                  <div className="bg-surface-container-lowest p-space-sm rounded-lg border border-outline-variant/30">
                    <span className="font-semibold text-on-surface block mb-1">
                      Source B: {finding.conflictDetails.sourceB.name}
                    </span>
                    <p className="text-on-surface-variant text-[11px] leading-relaxed">
                      {finding.conflictDetails.sourceB.claim}
                    </p>
                    <span className="text-[10px] text-outline font-mono mt-1 block">
                      Ref: {finding.conflictDetails.sourceB.reference}
                    </span>
                  </div>
                </div>

                {finding.conflictDetails.resolution && (
                  <div className="mt-1 p-2 bg-secondary-container/50 rounded-lg border border-primary/20 text-on-surface">
                    <strong className="text-primary font-semibold">Resolution: </strong>
                    <span>{finding.conflictDetails.resolution}</span>
                    <span className="text-outline text-[10px] block mt-0.5">
                      Resolved by: {finding.conflictDetails.resolvedBy} on {finding.conflictDetails.resolvedAt}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reviewer Notes (if any) */}
            {finding.reviewerNotes && (
              <div className="mt-2 text-xs bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant/20 flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[14px] text-secondary">rate_review</span>
                <span>
                  <strong>Reviewer Note: </strong> {finding.reviewerNotes}
                </span>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedFinding(finding);
                    setActiveView('evidence');
                  }}
                  className="text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  <span>View Supporting Evidence ({finding.citations.length})</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {finding.status === 'CONFLICTING' && (
                  <button
                    onClick={() => handleOpenConflictModal(finding)}
                    className="px-3 py-1.5 rounded-lg bg-error text-on-error hover:bg-error/90 font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">build</span>
                    <span>Resolve Conflict</span>
                  </button>
                )}

                <button
                  onClick={() => handleOpenEditModal(finding)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  <span>Edit Context</span>
                </button>

                <button
                  onClick={() => rejectFinding(finding.id)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-error-container text-outline hover:text-on-error-container font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => approveFinding(finding.id)}
                  className={`px-4 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-all shadow-xs ${
                    finding.approved
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-primary text-on-primary hover:bg-primary-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  <span>{finding.approved ? 'Certified' : 'Approve Claim'}</span>
                </button>
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* CONFLICT RESOLUTION MODAL */}
      {conflictModalFinding && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">gavel</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Resolve Architectural Conflict
                </h3>
              </div>
              <button
                onClick={() => setConflictModalFinding(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs text-on-surface-variant">
              <p>
                <strong>Finding:</strong> {conflictModalFinding.title}
              </p>
              <p className="mt-1">
                Select or write the definitive decision resolution. Once confirmed, this claim will transition to <strong>VERIFIED</strong> with human approval.
              </p>
            </div>

            <form onSubmit={handleResolveSubmit} className="flex flex-col gap-space-sm text-xs">
              <div className="space-y-2">
                <label
                  onClick={() =>
                    setConflictResolutionText(
                      'Adopt RFC-042 standard: Mandate `allkeys-lru` eviction policy across all financial cache clusters. Update Helm values in PR #145.'
                    )
                  }
                  className="p-space-sm rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container flex items-start gap-2 cursor-pointer transition-colors block"
                >
                  <input
                    type="radio"
                    name="res-option"
                    defaultChecked
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold text-on-surface block">
                      Option A: Adopt RFC-042 (allkeys-lru)
                    </span>
                    <span className="text-outline text-[11px]">
                      Ensures cache cannot exhaust memory under un-expiring key saturation. Updates Helm values.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() =>
                    setConflictResolutionText(
                      'Preserve Helm implementation: Retain `volatile-lru` with strict mandatory TTL enforcement on all session writes.'
                    )
                  }
                  className="p-space-sm rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container flex items-start gap-2 cursor-pointer transition-colors block"
                >
                  <input
                    type="radio"
                    name="res-option"
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-semibold text-on-surface block">
                      Option B: Preserve Helm Implementation (volatile-lru)
                    </span>
                    <span className="text-outline text-[11px]">
                      Requires application code to guarantee TTL on every single write to avoid OOM.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Recorded Resolution Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={conflictResolutionText}
                  onChange={(e) => setConflictResolutionText(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setConflictModalFinding(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Confirm Resolution &amp; Approve</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FINDING MODAL */}
      {editModalFinding && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Edit Finding Context</h3>
              <button
                onClick={() => setEditModalFinding(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-space-sm text-xs">
              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">Summary</label>
                <textarea
                  rows={4}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setEditModalFinding(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CERTIFY CONFIRMATION MODAL */}
      {showCertifyConfirm && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md text-center">
            <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Certify &amp; Seal Handover Dossier
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              This action formally attests that all critical decisions, operational risks, and pending tasks have been verified by human leads. A cryptographic SHA-256 seal will be minted into the audit trail.
            </p>

            <div className="text-left text-xs bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
              <label className="font-semibold text-on-surface block mb-1">
                Signer Authorization Credentials
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface-container-lowest rounded border border-outline-variant/30 text-on-surface font-medium"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-space-xs">
              <button
                type="button"
                onClick={() => setShowCertifyConfirm(false)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-medium"
              >
                Return to Review
              </button>
              <button
                type="button"
                onClick={() => {
                  certifyHandover(signerName);
                  setShowCertifyConfirm(false);
                  setActiveView('handover');
                }}
                className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                <span>Affix Signature &amp; View Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
