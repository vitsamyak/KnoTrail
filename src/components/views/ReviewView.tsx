'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  ConflictRecord,
  KnowledgeFinding,
  ReviewStatus,
  ReviewAuditAction,
  getFindingReviewStatus,
} from '../../lib/types';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';

export function ReviewView() {
  const {
    project,
    conflicts,
    stats,
    workspaceId,
    approveFinding,
    rejectFinding,
    editFinding,
    resolveConflict,
    resolveConflictRecord,
    certifyHandover,
    setActiveView,
    selectedFinding,
    setSelectedFinding,
  } = useProject();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReviewStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Conflict Modals
  const [activeConflictRecord, setActiveConflictRecord] = useState<ConflictRecord | null>(null);
  const [chosenFindingId, setChosenFindingId] = useState<string>('');
  const [conflictNotes, setConflictNotes] = useState('');
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const [conflictModalFinding, setConflictModalFinding] = useState<KnowledgeFinding | null>(null);
  const [conflictResolutionText, setConflictResolutionText] = useState('');

  // Handover Certification Modal
  const [signerName, setSignerName] = useState(project.lead?.name || 'Workspace Reviewer');
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);

  // Reject Modal State
  const [rejectModalFinding, setRejectModalFinding] = useState<KnowledgeFinding | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReviewerName, setRejectReviewerName] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Edit Modal State
  const [editModalFinding, setEditModalFinding] = useState<KnowledgeFinding | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editReasoning, setEditReasoning] = useState('');
  const [editImpact, setEditImpact] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editUrgency, setEditUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [editCategory, setEditCategory] = useState('');
  const [editReviewerNotes, setEditReviewerNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Approve Justification Modal State (for UNCERTAIN findings)
  const [approveModalFinding, setApproveModalFinding] = useState<KnowledgeFinding | null>(null);
  const [approveJustification, setApproveJustification] = useState('');
  const [approveJustificationError, setApproveJustificationError] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Audit History Modal State
  const [auditModalFinding, setAuditModalFinding] = useState<KnowledgeFinding | null>(null);
  const [auditHistoryData, setAuditHistoryData] = useState<ReviewAuditAction[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const openConflicts = (conflicts || []).filter((c) => c.status === 'OPEN');
  const hasBlockingConflicts =
    project.findings.some((f) => f.status === 'CONFLICTING') || openConflicts.length > 0;

  // Filter findings according to status, category, and search text
  const filteredFindings = project.findings.filter((finding) => {
    const computedStatus = getFindingReviewStatus(finding, conflicts);
    const matchesStatus = statusFilter === 'ALL' || computedStatus === statusFilter;
    const matchesCategory =
      categoryFilter === 'ALL' ||
      finding.type === categoryFilter ||
      finding.category?.toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      finding.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finding.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (finding.owner && finding.owner.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Handle opening Reject Modal
  const handleOpenRejectModal = (finding: KnowledgeFinding) => {
    setRejectModalFinding(finding);
    setRejectReason(finding.rejectionReason || '');
    setRejectReviewerName(signerName || project.lead?.name || 'Workspace Reviewer');
    setRejectError('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalFinding) return;
    if (!rejectReason.trim()) {
      setRejectError('A documented rejection reason is required for the audit trail.');
      return;
    }
    setIsSubmittingReject(true);
    await rejectFinding(rejectModalFinding.id, rejectReason.trim(), rejectReviewerName.trim());
    setIsSubmittingReject(false);
    setRejectModalFinding(null);
  };

  // Handle opening Edit Modal
  const handleOpenEditModal = (finding: KnowledgeFinding) => {
    setEditModalFinding(finding);
    setEditTitle(finding.title);
    setEditSummary(finding.summary);
    setEditReasoning(finding.reasoning || '');
    setEditImpact(finding.impact || '');
    setEditOwner(finding.owner || '');
    setEditUrgency((finding.urgency as any) || 'medium');
    setEditCategory(finding.category || finding.type);
    setEditReviewerNotes(finding.reviewerNotes || '');
  };

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalFinding) return;
    setIsSavingEdit(true);
    await editFinding(
      editModalFinding.id,
      {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        reasoning: editReasoning.trim() || undefined,
        impact: editImpact.trim() || undefined,
        owner: editOwner.trim() || undefined,
        urgency: editUrgency,
        category: editCategory.trim() || undefined,
      },
      editReviewerNotes.trim() || 'Claim edited during human review',
      signerName || project.lead?.name || 'Workspace Reviewer'
    );
    setIsSavingEdit(false);
    setEditModalFinding(null);
  };

  // Handle Approve button click
  const handleApproveClick = (finding: KnowledgeFinding) => {
    // If UNCERTAIN, require justification modal
    if (finding.status === 'UNCERTAIN' || finding.claimStatus === 'UNCERTAIN') {
      setApproveModalFinding(finding);
      setApproveJustification(finding.reviewerNotes || '');
      setApproveJustificationError('');
      return;
    }
    // Direct approval for VERIFIED / SUPPORTED findings
    approveFinding(finding.id, undefined, signerName);
  };

  const handleConfirmApproveJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalFinding) return;
    if (!approveJustification.trim() || approveJustification.trim().length < 5) {
      setApproveJustificationError('Justification must be at least 5 characters explaining how this claim was verified.');
      return;
    }
    setIsSubmittingApproval(true);
    await approveFinding(
      approveModalFinding.id,
      approveJustification.trim(),
      signerName || project.lead?.name || 'Workspace Reviewer'
    );
    setIsSubmittingApproval(false);
    setApproveModalFinding(null);
  };

  // Handle opening Audit History
  const handleOpenAuditModal = async (finding: KnowledgeFinding) => {
    setAuditModalFinding(finding);
    const localEntries = (project.reviewAuditHistory || []).filter((a) => a.findingId === finding.id);
    setAuditHistoryData(localEntries);
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/findings/${encodeURIComponent(finding.id)}/audit?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.auditHistory) {
          setAuditHistoryData(data.auditHistory);
        }
      }
    } catch (err) {
      // localEntries is sufficient fallback
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Handle conflict record resolution
  const handleOpenConflictRecordModal = (conflict: ConflictRecord) => {
    setActiveConflictRecord(conflict);
    setChosenFindingId(conflict.findingIdA);
    setConflictNotes(
      conflict.isTemporalSuperseded
        ? `Adopting newer decision from ${conflict.sourceNameB}. Older finding is superseded.`
        : `Approved prevailing architecture decision: ${conflict.claimA}`
    );
  };

  const handleResolveConflictRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConflictRecord) return;
    setIsResolvingConflict(true);
    await resolveConflictRecord(
      activeConflictRecord.id,
      chosenFindingId || undefined,
      conflictNotes.trim(),
      signerName || project.lead?.name || 'Review Lead'
    );
    setIsResolvingConflict(false);
    setActiveConflictRecord(null);
  };

  const handleOpenConflictModal = (finding: KnowledgeFinding) => {
    setConflictModalFinding(finding);
    setConflictResolutionText(
      finding.conflictDetails?.resolution ||
        'Adopt documented standard and update configuration files accordingly.'
    );
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictModalFinding) return;
    resolveConflict(
      conflictModalFinding.id,
      conflictResolutionText,
      signerName || project.lead?.name || 'Workspace Reviewer'
    );
    setConflictModalFinding(null);
  };

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

        {/* Active Reviewer Identity */}
        <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-full border border-outline-variant/30">
          <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
            {signerName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col text-left text-xs">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold leading-tight">
              {signerName}
            </span>
            <span className="font-body-sm text-body-sm text-outline leading-tight">
              Human Reviewer
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
                Mandatory Sign-off
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              AI proposes candidate statements; human reviewers retain complete decision authority. No ungrounded, rejected, or conflicting claim can be included in the handover dossier.
            </p>
          </div>
        </div>

        {/* Real-time Approval Progress & Certification Action */}
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
                : stats.needsCorrectionCount > 0
                ? `Revalidate Corrections (${stats.needsCorrectionCount} pending)`
                : stats.unreviewedCount > 0
                ? `Review All Claims to Certify (${stats.unreviewedCount} pending)`
                : project.handoverCertified
                ? 'Re-certify Handover'
                : 'Certify & Approve Handover'}
            </span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          {/* Status Filter Pill Strip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              All ({project.findings.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_REVIEW')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'PENDING_REVIEW'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              Pending Review ({stats.pendingReviewCount})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              Approved ({stats.approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-error text-on-error shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              Rejected ({stats.rejectedCount})
            </button>
            <button
              onClick={() => setStatusFilter('CONFLICT_REQUIRES_RESOLUTION')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'CONFLICT_REQUIRES_RESOLUTION'
                  ? 'bg-error-container text-on-error-container shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              Conflicting ({openConflicts.length})
            </button>
            <button
              onClick={() => setStatusFilter('NEEDS_CORRECTION')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                statusFilter === 'NEEDS_CORRECTION'
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              Needs Correction ({stats.needsCorrectionCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter findings by text..."
              className="w-full pl-8 pr-3 py-1 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* PHASE E: OPEN CONFLICTS RESOLUTION CENTER */}
      {openConflicts.length > 0 && (
        <div className="bg-error-container/10 border-2 border-error/40 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-error/20 pb-space-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-error text-on-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">gavel</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {openConflicts.length} Cross-Document Contradiction(s) Block Certification
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Conflicting assertions exist between uploaded project sources. You must review and resolve each conflict before handover certification can be granted.
                </p>
              </div>
            </div>
            <span className="bg-error text-on-error text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
              Mandatory Gate
            </span>
          </div>

          <div className="space-y-space-md">
            {openConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="bg-surface-container-lowest rounded-xl p-space-md border border-error/30 shadow-xs flex flex-col gap-space-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-error text-on-error">
                      {conflict.conflictCategory}
                    </span>
                    <span className="text-xs font-semibold text-on-surface font-mono">{conflict.id}</span>
                    {conflict.isTemporalSuperseded && (
                      <span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed font-semibold px-2 py-0.5 rounded-full">
                        Chronological Supersession Detected
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenConflictRecordModal(conflict)}
                    className="px-3 py-1 bg-primary text-on-primary hover:bg-primary-container rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">balance</span>
                    <span>Resolve Conflict</span>
                  </button>
                </div>

                <p className="text-xs text-on-surface leading-relaxed">{conflict.explanation}</p>

                {/* Two-Sided Diff View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm text-xs">
                  <div className="p-space-sm bg-surface-container-low/60 rounded-lg border border-outline-variant/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-outline">
                      <strong className="text-on-surface">{conflict.sourceNameA}</strong>
                      <span>{conflict.locationA}</span>
                    </div>
                    <p className="font-semibold text-on-surface text-xs">{conflict.claimA}</p>
                    {conflict.quoteA && (
                      <blockquote className="pl-2 border-l-2 border-primary/40 text-[11px] italic text-on-surface-variant">
                        &ldquo;{conflict.quoteA}&rdquo;
                      </blockquote>
                    )}
                  </div>

                  <div className="p-space-sm bg-surface-container-low/60 rounded-lg border border-outline-variant/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-outline">
                      <strong className="text-on-surface">{conflict.sourceNameB}</strong>
                      <span>{conflict.locationB}</span>
                    </div>
                    <p className="font-semibold text-on-surface text-xs">{conflict.claimB}</p>
                    {conflict.quoteB && (
                      <blockquote className="pl-2 border-l-2 border-error/40 text-[11px] italic text-on-surface-variant">
                        &ldquo;{conflict.quoteB}&rdquo;
                      </blockquote>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW FINDINGS STREAM */}
      <div className="space-y-space-md">
        {filteredFindings.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-space-2xl border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">rule</span>
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">No findings matching your filter.</h4>
            <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
              {project.findings.length === 0
                ? 'Upload project documents and run AI extraction to populate the Review Center with decisions, tasks, and risks for human approval.'
                : 'Try adjusting your search or status filter to view findings.'}
            </p>
            {project.findings.length === 0 && (
              <button
                onClick={() => setActiveView('sources')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload Documents</span>
              </button>
            )}
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const reviewStatus = getFindingReviewStatus(finding, conflicts);
            const isConflictBlocked =
              reviewStatus === 'CONFLICT_REQUIRES_RESOLUTION' ||
              finding.status === 'CONFLICTING' ||
              (conflicts || []).some(
                (c) =>
                  (c.findingIdA === finding.id || c.findingIdB === finding.id) &&
                  c.status === 'OPEN'
              );

            const isMissingEvidence =
              finding.status === 'MISSING' || finding.evidenceValidity === 'MISSING';
            const isUncertain =
              finding.status === 'UNCERTAIN' || finding.claimStatus === 'UNCERTAIN';

            const auditActions = (project.reviewAuditHistory || []).filter(
              (a) => a.findingId === finding.id
            );

            return (
              <div
                key={finding.id}
                className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border transition-all ${
                  reviewStatus === 'APPROVED'
                    ? 'border-primary/40 bg-primary-fixed/5'
                    : reviewStatus === 'REJECTED'
                    ? 'border-error/30 bg-error-container/5 opacity-80'
                    : reviewStatus === 'NEEDS_CORRECTION'
                    ? 'border-tertiary/40 bg-tertiary-fixed/5'
                    : isConflictBlocked
                    ? 'border-error/50 bg-error-container/10 ring-1 ring-error/20'
                    : 'border-outline-variant/30'
                }`}
              >
                {/* Top row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Label */}
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono">
                      {finding.type}
                    </span>

                    {/* Review Status Badge */}
                    {reviewStatus === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        <span>Approved</span>
                      </span>
                    )}
                    {reviewStatus === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-error bg-error-container px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[13px]">cancel</span>
                        <span>Rejected</span>
                      </span>
                    )}
                    {reviewStatus === 'NEEDS_CORRECTION' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-tertiary bg-tertiary-fixed px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[13px]">build</span>
                        <span>Needs Correction</span>
                      </span>
                    )}
                    {reviewStatus === 'CONFLICT_REQUIRES_RESOLUTION' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-error bg-error-container px-2.5 py-0.5 rounded-full animate-pulse">
                        <span className="material-symbols-outlined text-[13px]">warning</span>
                        <span>Conflict Requires Resolution</span>
                      </span>
                    )}
                    {reviewStatus === 'PENDING_REVIEW' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-outline bg-surface-container px-2.5 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>Pending Review</span>
                      </span>
                    )}

                    {/* Evidence Validity Badge */}
                    {finding.evidenceValidity && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          finding.evidenceValidity === 'MATCHED'
                            ? 'bg-secondary-container/60 text-on-secondary-container'
                            : finding.evidenceValidity === 'MISMATCHED'
                            ? 'bg-error-container text-error'
                            : 'bg-surface-container-highest text-outline'
                        }`}
                      >
                        Evidence: {finding.evidenceValidity}
                      </span>
                    )}

                    {/* Claim Grounding Badge */}
                    {finding.claimStatus && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          finding.claimStatus === 'SUPPORTED'
                            ? 'bg-primary/10 text-primary'
                            : finding.claimStatus === 'UNCERTAIN'
                            ? 'bg-tertiary-fixed/60 text-on-tertiary-fixed'
                            : 'bg-error-container text-error'
                        }`}
                      >
                        Claim: {finding.claimStatus}
                      </span>
                    )}

                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold ml-1">
                      {finding.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {finding.owner && (
                      <>
                        <span className="text-outline">Owner: {finding.owner}</span>
                        <span>•</span>
                      </>
                    )}
                    <span className="font-semibold text-primary">{finding.confidence}% confidence</span>
                  </div>
                </div>

                {/* Summary */}
                <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                  {finding.summary}
                </p>

                {/* Reasoning & Impact Details */}
                {(finding.reasoning || finding.impact) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-2 text-xs">
                    {finding.reasoning && (
                      <div className="p-2 bg-surface-container-low rounded-lg border border-outline-variant/20">
                        <strong className="text-on-surface block mb-0.5">Reasoning:</strong>
                        <p className="text-on-surface-variant">{finding.reasoning}</p>
                      </div>
                    )}
                    {finding.impact && (
                      <div className="p-2 bg-surface-container-low rounded-lg border border-outline-variant/20">
                        <strong className="text-on-surface block mb-0.5">Impact:</strong>
                        <p className="text-on-surface-variant">{finding.impact}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection Details Callout */}
                {finding.rejected && finding.rejectionReason && (
                  <div className="mt-space-sm bg-error-container/20 border border-error/30 rounded-lg p-space-sm text-xs text-error flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">cancel</span>
                    <div>
                      <strong>Excluded from Handover: </strong>
                      <span>{finding.rejectionReason}</span>
                      <span className="block text-[11px] text-error/80 mt-0.5">
                        Reviewed by {finding.reviewedBy || 'Reviewer'} on{' '}
                        {finding.reviewedAt ? new Date(finding.reviewedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Documented Reviewer Justification (if approved while UNCERTAIN) */}
                {finding.approved && finding.status === 'UNCERTAIN' && finding.reviewerNotes && (
                  <div className="mt-space-sm bg-tertiary-fixed/20 border border-tertiary/30 rounded-lg p-space-sm text-xs text-on-surface flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-tertiary shrink-0 mt-0.5">
                      fact_check
                    </span>
                    <div>
                      <strong className="text-tertiary">Documented Verification Justification: </strong>
                      <span>{finding.reviewerNotes}</span>
                      <span className="block text-[11px] text-outline mt-0.5">
                        Certified by {finding.reviewedBy || 'Reviewer'} on{' '}
                        {finding.reviewedAt ? new Date(finding.reviewedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                )}

                {/* General Reviewer Notes */}
                {!finding.rejected &&
                  !(finding.approved && finding.status === 'UNCERTAIN') &&
                  finding.reviewerNotes && (
                    <div className="mt-2 text-xs bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant/20 flex items-center gap-1.5 text-on-surface">
                      <span className="material-symbols-outlined text-[14px] text-secondary">rate_review</span>
                      <span>
                        <strong>Reviewer Note: </strong> {finding.reviewerNotes}
                      </span>
                    </div>
                  )}

                {/* Action Bar */}
                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-space-md flex-wrap">
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

                    <button
                      onClick={() => handleOpenAuditModal(finding)}
                      className="text-on-surface-variant hover:text-primary font-medium flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">history</span>
                      <span>Audit Trail ({auditActions.length})</span>
                    </button>
                  </div>

                  {/* Review Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Resolve Conflict Button */}
                    {isConflictBlocked && (
                      <button
                        onClick={() => {
                          const matchedConf = (conflicts || []).find(
                            (c) =>
                              (c.findingIdA === finding.id || c.findingIdB === finding.id) &&
                              c.status === 'OPEN'
                          );
                          if (matchedConf) {
                            handleOpenConflictRecordModal(matchedConf);
                          } else {
                            handleOpenConflictModal(finding);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-error text-on-error hover:bg-error/90 font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">balance</span>
                        <span>Resolve Conflict</span>
                      </button>
                    )}

                    {/* Edit Finding */}
                    <button
                      onClick={() => handleOpenEditModal(finding)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit Finding</span>
                    </button>

                    {/* Reject Finding */}
                    <button
                      onClick={() => handleOpenRejectModal(finding)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1 transition-colors ${
                        finding.rejected
                          ? 'bg-error-container text-error font-semibold'
                          : 'bg-surface-container hover:bg-error-container text-outline hover:text-on-error-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                      <span>{finding.rejected ? 'Rejected' : 'Reject'}</span>
                    </button>

                    {/* Approve Finding Button */}
                    <button
                      onClick={() => handleApproveClick(finding)}
                      disabled={isConflictBlocked || isMissingEvidence}
                      title={
                        isConflictBlocked
                          ? 'Direct approval locked: Resolve contradictory sources first.'
                          : isMissingEvidence
                          ? 'Approval locked: Primary source evidence is MISSING. Provide documentation first.'
                          : isUncertain
                          ? 'Uncertain finding: Requires documented reviewer justification before approval.'
                          : undefined
                      }
                      className={`px-4 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-all shadow-xs ${
                        isConflictBlocked || isMissingEvidence
                          ? 'bg-surface-container text-outline opacity-50 cursor-not-allowed border border-outline-variant/30'
                          : finding.approved
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-primary text-on-primary hover:bg-primary-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {isConflictBlocked || isMissingEvidence ? 'lock' : 'check'}
                      </span>
                      <span>
                        {isConflictBlocked
                          ? 'Approval Locked (Conflict)'
                          : isMissingEvidence
                          ? 'Evidence Missing'
                          : finding.approved
                          ? 'Approved'
                          : isUncertain
                          ? 'Justify & Approve'
                          : 'Approve Claim'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REJECT FINDING MODAL */}
      {rejectModalFinding && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">cancel</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Reject Finding</h3>
              </div>
              <button
                onClick={() => setRejectModalFinding(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs text-on-surface-variant">
              <p>
                <strong>Finding:</strong> {rejectModalFinding.title}
              </p>
              <p className="mt-1">
                Rejecting this finding permanently excludes it from the certified handover package and all exports. A documented rejection reason is mandatory for the audit trail.
              </p>
            </div>

            <form onSubmit={handleConfirmReject} className="flex flex-col gap-space-sm text-xs">
              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Rejection Reason <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  placeholder="Explain why this finding is rejected (e.g., superseded by recent sprint decision, inaccurate interpretation)..."
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
                {rejectError && <p className="text-error text-[11px] mt-1">{rejectError}</p>}
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  value={rejectReviewerName}
                  onChange={(e) => setRejectReviewerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setRejectModalFinding(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReject || !rejectReason.trim()}
                  className="px-5 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 font-semibold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  <span>{isSubmittingReject ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FINDING MODAL */}
      {editModalFinding && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">edit</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Edit Finding &amp; Revalidate</h3>
              </div>
              <button
                onClick={() => setEditModalFinding(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20 text-xs text-on-surface-variant">
              <span className="font-semibold text-primary block">Automatic Revalidation:</span>
              Edits to the claim title or summary are re-evaluated against source documents. If modified claims lack support in original documents, they are flagged as <strong>NEEDS_CORRECTION</strong> and approval is reset.
            </div>

            <form onSubmit={handleConfirmEdit} className="flex flex-col gap-space-sm text-xs">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <div>
                  <label className="font-label-sm text-on-surface font-semibold block mb-1">Owner / Lead</label>
                  <input
                    type="text"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface text-xs"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface font-semibold block mb-1">Urgency</label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">Summary</label>
                <textarea
                  rows={3}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">Reasoning (Optional)</label>
                <textarea
                  rows={2}
                  value={editReasoning}
                  onChange={(e) => setEditReasoning(e.target.value)}
                  placeholder="Architectural or technical rationale..."
                  className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">Impact (Optional)</label>
                <textarea
                  rows={2}
                  value={editImpact}
                  onChange={(e) => setEditImpact(e.target.value)}
                  placeholder="Downstream operational or business impact..."
                  className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">Reviewer Note (Audit Trail)</label>
                <input
                  type="text"
                  value={editReviewerNotes}
                  onChange={(e) => setEditReviewerNotes(e.target.value)}
                  placeholder="Reason for making this edit..."
                  className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface text-xs"
                />
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
                  disabled={isSavingEdit || !editTitle.trim() || !editSummary.trim()}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{isSavingEdit ? 'Revalidating...' : 'Save & Revalidate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE UNCERTAIN FINDING JUSTIFICATION MODAL */}
      {approveModalFinding && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[22px]">verified</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Reviewer Justification Required
                </h3>
              </div>
              <button
                onClick={() => setApproveModalFinding(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs text-on-surface-variant space-y-1.5">
              <p>
                <strong>Finding:</strong> {approveModalFinding.title}
              </p>
              <div className="p-2.5 bg-tertiary-fixed/20 border border-tertiary/30 rounded-lg">
                <span className="font-semibold text-tertiary block mb-0.5">Uncertain Support:</span>
                This finding has weak or uncertain textual support in the original documents. To approve it into the certified handover, document how you verified this operational fact.
              </div>
            </div>

            <form onSubmit={handleConfirmApproveJustification} className="flex flex-col gap-space-sm text-xs">
              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Documented Review Justification <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={approveJustification}
                  onChange={(e) => {
                    setApproveJustification(e.target.value);
                    if (approveJustificationError) setApproveJustificationError('');
                  }}
                  placeholder="Explain how this claim was verified (e.g., verified verbally with team lead, confirmed in staging environment)..."
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
                {approveJustificationError && (
                  <p className="text-error text-[11px] mt-1">{approveJustificationError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setApproveModalFinding(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApproval || !approveJustification.trim()}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingApproval ? (
                    <>
                      <KnowledgeTrailLoader variant="inline" message="Approving claim..." />
                      <span>Recording Approval...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Approve with Justification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL / DRAWER */}
      {auditModalFinding && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">history</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Review Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setAuditModalFinding(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs text-on-surface-variant">
              <p>
                <strong>Finding:</strong> {auditModalFinding.title} ({auditModalFinding.id})
              </p>
              <p className="text-[11px] text-outline mt-0.5">
                Immutable, chronological log of all human review actions, revalidations, and status transitions.
              </p>
            </div>

            {isLoadingAudit ? (
              <div className="py-6">
                <KnowledgeTrailLoader
                  variant="section"
                  message="Loading review history..."
                  submessage="Retrieving verified audit trail and status transitions..."
                  step={3}
                />
              </div>
            ) : auditHistoryData.length === 0 ? (
              <div className="py-8 text-center text-xs text-outline bg-surface-container-low rounded-xl border border-outline-variant/20">
                No formal review actions logged yet for this finding. Actions will record automatically when reviewed.
              </div>
            ) : (
              <div className="space-y-space-sm">
                {auditHistoryData.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className="p-space-sm bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            action.actionType === 'APPROVE'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : action.actionType === 'REJECT'
                              ? 'bg-error text-on-error'
                              : action.actionType === 'EDIT'
                              ? 'bg-primary/20 text-primary'
                              : action.actionType === 'RESOLVE_CONFLICT'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-surface-container-high text-on-surface'
                          }`}
                        >
                          {action.actionType}
                        </span>
                        <span className="font-semibold text-on-surface">
                          {action.previousStatus} &rarr; {action.newStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-outline font-mono">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-outline mt-0.5">
                      <span>Reviewer: <strong>{action.reviewerName}</strong></span>
                      {action.evidenceReferences && action.evidenceReferences.length > 0 && (
                        <span>• {action.evidenceReferences.length} cited reference(s)</span>
                      )}
                    </div>

                    {action.reviewerNotes && (
                      <p className="mt-1 p-2 bg-surface-container-lowest rounded border border-outline-variant/20 text-on-surface-variant leading-relaxed">
                        &ldquo;{action.reviewerNotes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-space-xs border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setAuditModalFinding(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium text-xs"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE E: CONFLICT RECORD RESOLUTION MODAL */}
      {activeConflictRecord && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl p-space-xl shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">balance</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Resolve Cross-Document Conflict ({activeConflictRecord.id})
                </span>
              </div>
              <button
                onClick={() => setActiveConflictRecord(null)}
                className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {activeConflictRecord.explanation}
            </p>

            <form onSubmit={handleResolveConflictRecordSubmit} className="flex flex-col gap-space-md text-xs">
              <div>
                <label className="font-semibold text-on-surface block mb-2">
                  Select Prevailing Statement or Consensus:
                </label>
                <div className="space-y-2">
                  {/* Option A */}
                  <label
                    className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      chosenFindingId === activeConflictRecord.findingIdA
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="prevailingClaim"
                      checked={chosenFindingId === activeConflictRecord.findingIdA}
                      onChange={() => setChosenFindingId(activeConflictRecord.findingIdA)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11px] text-outline">
                        <strong>Claim A ({activeConflictRecord.sourceNameA})</strong>
                        <span>{activeConflictRecord.locationA}</span>
                      </div>
                      <p className="font-semibold text-on-surface text-xs mt-0.5">{activeConflictRecord.claimA}</p>
                      {activeConflictRecord.quoteA && (
                        <blockquote className="mt-1 pl-2 border-l-2 border-primary/40 text-[11px] italic text-on-surface-variant">
                          &ldquo;{activeConflictRecord.quoteA}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  </label>

                  {/* Option B */}
                  <label
                    className={`p-3 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      chosenFindingId === activeConflictRecord.findingIdB
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="prevailingClaim"
                      checked={chosenFindingId === activeConflictRecord.findingIdB}
                      onChange={() => setChosenFindingId(activeConflictRecord.findingIdB)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11px] text-outline">
                        <strong>Claim B ({activeConflictRecord.sourceNameB})</strong>
                        <span>{activeConflictRecord.locationB}</span>
                      </div>
                      <p className="font-semibold text-on-surface text-xs mt-0.5">{activeConflictRecord.claimB}</p>
                      {activeConflictRecord.quoteB && (
                        <blockquote className="mt-1 pl-2 border-l-2 border-error/40 text-[11px] italic text-on-surface-variant">
                          &ldquo;{activeConflictRecord.quoteB}&rdquo;
                        </blockquote>
                      )}
                    </div>
                  </label>

                  {/* Option C: Mutual Consensus */}
                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                      chosenFindingId === ''
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="prevailingClaim"
                      checked={chosenFindingId === ''}
                      onChange={() => setChosenFindingId('')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="font-medium text-on-surface text-xs">
                      Mutual consensus / Keep both as verified with notes below
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-on-surface block mb-1">
                  Resolution Justification &amp; Notes (Mandatory for Handover Dossier)
                </label>
                <textarea
                  rows={3}
                  required
                  value={conflictNotes}
                  onChange={(e) => setConflictNotes(e.target.value)}
                  placeholder="Explain why this choice prevails (e.g. newer RFC superseded older architecture specification)..."
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setActiveConflictRecord(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingConflict || !conflictNotes.trim()}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm text-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{isResolvingConflict ? 'Resolving...' : 'Confirm Conflict Resolution'}</span>
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
