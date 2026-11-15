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
import { apiClient } from '../../lib/api-client';

export function ReviewView() {
  const {
    project,
    conflicts,
    stats,
    workspaceId,
    currentUserRole,
    approveFinding,
    rejectFinding,
    editFinding,
    resolveConflict,
    resolveConflictRecord,
    certifyHandover,
    setActiveView,
    setSelectedFinding,
  } = useProject();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReviewStatus | 'NEEDS_RE_REVIEW'>('ALL');
  const [categoryFilter] = useState<string>('ALL');
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
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'NEEDS_RE_REVIEW'
        ? Boolean(finding.needsReReview)
        : computedStatus === statusFilter;
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
      setRejectError('Please enter a short reason for rejecting this item.');
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
    if (finding.status === 'UNCERTAIN' || finding.claimStatus === 'UNCERTAIN') {
      setApproveModalFinding(finding);
      setApproveJustification(finding.reviewerNotes || '');
      setApproveJustificationError('');
      return;
    }
    approveFinding(finding.id, undefined, signerName);
  };

  const handleConfirmApproveJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalFinding) return;
    if (!approveJustification.trim() || approveJustification.trim().length < 5) {
      setApproveJustificationError('Please explain how you checked this item (at least 5 characters).');
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
      const data = await apiClient.getAuditHistory(workspaceId, finding.id);
      if (data?.auditHistory) {
        setAuditHistoryData(data.auditHistory);
      }
    } catch (err) {
      // local fallback
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
    <div className="flex flex-col w-full gap-5 animate-in fade-in duration-200">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-xl shadow-xs border border-outline-variant/40">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <span
              onClick={() => setActiveView('workspace')}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              {project.name}
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Review Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight mt-1">
            Human Review &amp; Approval
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Validate AI findings, resolve cross-document contradictions, and certify handover facts before final package generation.
          </p>
        </div>

        {/* Active Reviewer Identity */}
        <div className="flex items-center gap-2.5 bg-surface-container-low/60 px-3.5 py-2 rounded-xl border border-outline-variant/40 shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
            {signerName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col text-left text-xs">
            <span className="text-xs text-on-surface font-semibold leading-tight">
              {signerName}
            </span>
            <span className="text-[10px] text-secondary font-mono leading-tight">
              Reviewer ({currentUserRole})
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Governance Warning Banner */}
      <div className="bg-surface-container-low/50 rounded-xl p-4 sm:p-5 border border-outline-variant/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-on-surface">
                Human Review Invariant
              </span>
              <span className="bg-surface-container-low text-secondary border border-outline-variant/40 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Mandatory Sign-off
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5 max-w-xl leading-relaxed">
              AI proposes findings, but humans make the final determination. Only approved findings appear in the certified handover document.
            </p>
          </div>
        </div>

        {/* Real-time Approval Progress & Certification Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 shrink-0 self-stretch md:self-center w-full md:w-auto">
          <div className="flex items-center justify-between sm:flex-col sm:items-end">
            <span className="text-[11px] text-secondary font-medium uppercase tracking-wider">Progress</span>
            <span className="text-xl font-bold text-on-surface">{stats.certificationProgressPercent}%</span>
          </div>
          <button
            onClick={() => setShowCertifyConfirm(true)}
            disabled={!stats.canCertifyHandover || currentUserRole !== 'MANAGER'}
            title={
              currentUserRole !== 'MANAGER'
                ? `Certification requires Manager permissions (current role: ${currentUserRole}).`
                : undefined
            }
            className={`w-full sm:w-auto justify-center px-4 h-9 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs ${
              !stats.canCertifyHandover || currentUserRole !== 'MANAGER'
                ? 'bg-surface-container-low text-secondary cursor-not-allowed border border-outline-variant/40 opacity-60'
                : 'bg-primary text-on-primary hover:bg-primary-hover'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {currentUserRole !== 'MANAGER' ? 'lock' : 'verified'}
            </span>
            <span>
              {currentUserRole !== 'MANAGER'
                ? 'Manager Role Required to Certify'
                : hasBlockingConflicts
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
      <div className="flex flex-col gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Pill Strip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              All ({project.findings.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING_REVIEW')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'PENDING_REVIEW'
                  ? 'bg-surface-container text-on-surface font-semibold border border-outline-variant/60 shadow-xs'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Pending ({stats.pendingReviewCount})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 shadow-2xs'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Approved ({stats.approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200 shadow-2xs'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Rejected ({stats.rejectedCount})
            </button>
            <button
              onClick={() => setStatusFilter('CONFLICT_REQUIRES_RESOLUTION')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'CONFLICT_REQUIRES_RESOLUTION'
                  ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200 shadow-2xs'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Conflicting ({openConflicts.length})
            </button>
            <button
              onClick={() => setStatusFilter('NEEDS_CORRECTION')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'NEEDS_CORRECTION'
                  ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200 shadow-2xs'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Needs Correction ({stats.needsCorrectionCount})
            </button>
            <button
              onClick={() => setStatusFilter('NEEDS_RE_REVIEW')}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'NEEDS_RE_REVIEW'
                  ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200 shadow-2xs'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              Needs Re-Review ({stats.needsReReviewCount ?? (project.findings || []).filter((f) => f.needsReReview).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter findings..."
              className="w-full pl-8 pr-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* OPEN CONFLICTS RESOLUTION CENTER */}
      {openConflicts.length > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-5 shadow-xs flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-error/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-error text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">
                  {openConflicts.length} Cross-Document Contradiction(s) Block Certification
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Conflicting assertions exist between uploaded project sources. Resolve each conflict before certification.
                </p>
              </div>
            </div>
            <span className="bg-error/10 text-error border border-error/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              Mandatory Gate
            </span>
          </div>

          <div className="space-y-3">
            {openConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="bg-surface-container-lowest rounded-xl p-4 border border-error/30 shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-error text-white">
                      {conflict.conflictCategory}
                    </span>
                    <span className="text-xs font-semibold text-on-surface font-mono">{conflict.id}</span>
                    {conflict.isTemporalSuperseded && (
                      <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 font-semibold px-2 py-0.5 rounded-full">
                        Supersession Detected
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenConflictRecordModal(conflict)}
                    className="px-3 h-7 bg-primary text-on-primary hover:bg-primary-hover rounded-md text-xs font-medium transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">balance</span>
                    <span>Resolve Conflict</span>
                  </button>
                </div>

                <p className="text-xs text-on-surface leading-relaxed">{conflict.explanation}</p>

                {/* Two-Sided Diff View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-surface-container-low/50 rounded-lg border border-outline-variant/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-secondary">
                      <strong className="text-on-surface">{conflict.sourceNameA}</strong>
                      <span className="font-mono">{conflict.locationA}</span>
                    </div>
                    <p className="font-semibold text-on-surface text-xs">{conflict.claimA}</p>
                    {conflict.quoteA && (
                      <blockquote className="pl-2 border-l-2 border-primary/40 text-[11px] italic text-secondary">
                        &ldquo;{conflict.quoteA}&rdquo;
                      </blockquote>
                    )}
                  </div>

                  <div className="p-3 bg-surface-container-low/50 rounded-lg border border-outline-variant/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-secondary">
                      <strong className="text-on-surface">{conflict.sourceNameB}</strong>
                      <span className="font-mono">{conflict.locationB}</span>
                    </div>
                    <p className="font-semibold text-on-surface text-xs">{conflict.claimB}</p>
                    {conflict.quoteB && (
                      <blockquote className="pl-2 border-l-2 border-error/40 text-[11px] italic text-secondary">
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
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 sm:p-12 border border-outline-variant/40 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">rule</span>
            </div>
            <h4 className="text-sm font-semibold text-on-surface">No findings matching your filter</h4>
            <p className="text-xs text-secondary max-w-md leading-relaxed">
              {project.findings.length === 0
                ? 'Upload project documents and run AI extraction to populate the Review Center with decisions, tasks, and risks.'
                : 'Try adjusting your search or status filter to view findings.'}
            </p>
            {project.findings.length === 0 && (
              <button
                onClick={() => setActiveView('sources')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
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
                className={`bg-surface-container-lowest rounded-xl p-5 shadow-xs border transition-all ${
                  reviewStatus === 'APPROVED'
                    ? 'border-primary/30'
                    : reviewStatus === 'REJECTED'
                    ? 'border-error/30 opacity-75'
                    : reviewStatus === 'NEEDS_CORRECTION'
                    ? 'border-warning/30'
                    : isConflictBlocked
                    ? 'border-error/40 bg-error/5 ring-1 ring-error/20'
                    : 'border-outline-variant/40'
                }`}
              >
                {/* Top row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-container-low text-secondary font-mono border border-outline-variant/30">
                      {finding.type}
                    </span>

                    {/* Review Status Badge */}
                    {reviewStatus === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        <span>Approved</span>
                      </span>
                    )}
                    {reviewStatus === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        <span className="material-symbols-outlined text-[12px]">cancel</span>
                        <span>Rejected</span>
                      </span>
                    )}
                    {reviewStatus === 'NEEDS_CORRECTION' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <span className="material-symbols-outlined text-[12px]">build</span>
                        <span>Needs Correction</span>
                      </span>
                    )}
                    {reviewStatus === 'CONFLICT_REQUIRES_RESOLUTION' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md animate-pulse">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        <span>Conflict Requires Resolution</span>
                      </span>
                    )}
                    {reviewStatus === 'PENDING_REVIEW' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-secondary bg-surface-container-low border border-outline-variant/30 px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        <span>Pending Review</span>
                      </span>
                    )}

                    {/* Continuous Update Re-Review Badge */}
                    {finding.needsReReview && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[12px]">sync_problem</span>
                        <span>Needs Re-Review</span>
                      </span>
                    )}

                    {/* Evidence Validity Badge */}
                    {finding.evidenceValidity && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono ${
                          finding.evidenceValidity === 'MATCHED'
                            ? 'bg-primary/5 text-primary border border-primary/20'
                            : 'bg-surface-container-low text-secondary border border-outline-variant/30'
                        }`}
                      >
                        Evidence: {finding.evidenceValidity}
                      </span>
                    )}

                    <span className="text-sm font-semibold text-on-surface ml-0.5">
                      {finding.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {finding.owner && (
                      <>
                        <span className="text-secondary text-[11px]">Owner: {finding.owner}</span>
                        <span className="text-secondary">•</span>
                      </>
                    )}
                    <span className="font-semibold text-primary text-[11px]">{finding.confidence}% confidence</span>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-secondary mt-2 leading-relaxed">
                  {finding.summary}
                </p>

                {/* Reasoning & Impact Details */}
                {(finding.reasoning || finding.impact) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2.5 text-xs">
                    {finding.reasoning && (
                      <div className="p-2.5 bg-surface-container-low/40 rounded-lg border border-outline-variant/30">
                        <strong className="text-on-surface block mb-0.5 font-medium text-[11px]">Reasoning:</strong>
                        <p className="text-secondary leading-relaxed">{finding.reasoning}</p>
                      </div>
                    )}
                    {finding.impact && (
                      <div className="p-2.5 bg-surface-container-low/40 rounded-lg border border-outline-variant/30">
                        <strong className="text-on-surface block mb-0.5 font-medium text-[11px]">Impact:</strong>
                        <p className="text-secondary leading-relaxed">{finding.impact}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Continuous Update Drift & Re-Review Details Callout */}
                {finding.needsReReview && (
                  <div className="mt-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[17px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      history_toggle_off
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-amber-800 dark:text-amber-200 font-semibold">
                          Requires Manager Re-Review
                        </strong>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                          Evidence Drift
                        </span>
                      </div>
                      <p className="text-secondary leading-relaxed mt-1">
                        {finding.reReviewReason ||
                          'Supporting evidence for this finding was modified, removed, or superseded in a recent repository update.'}
                      </p>
                      {finding.driftDetectedAt && (
                        <span className="block text-[11px] font-mono text-amber-700/80 dark:text-amber-300/80 mt-1">
                          Drift detected: {new Date(finding.driftDetectedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Rejection Details Callout */}
                {finding.rejected && finding.rejectionReason && (
                  <div className="mt-2.5 bg-error/10 border border-error/30 rounded-lg p-2.5 text-xs text-error flex items-start gap-2">
                    <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">cancel</span>
                    <div>
                      <strong>Excluded from Handover: </strong>
                      <span>{finding.rejectionReason}</span>
                      <span className="block text-[11px] text-error/80 mt-0.5 font-mono">
                        Reviewed by {finding.reviewedBy || 'Reviewer'} on{' '}
                        {finding.reviewedAt ? new Date(finding.reviewedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Documented Reviewer Justification (if approved while UNCERTAIN) */}
                {finding.approved && finding.status === 'UNCERTAIN' && finding.reviewerNotes && (
                  <div className="mt-2.5 bg-warning/10 border border-warning/20 rounded-lg p-2.5 text-xs text-on-surface flex items-start gap-2">
                    <span className="material-symbols-outlined text-[15px] text-warning shrink-0 mt-0.5">
                      fact_check
                    </span>
                    <div>
                      <strong className="text-warning">Verification Justification: </strong>
                      <span className="text-secondary">{finding.reviewerNotes}</span>
                      <span className="block text-[11px] text-secondary mt-0.5 font-mono">
                        Certified by {finding.reviewedBy || 'Reviewer'}
                      </span>
                    </div>
                  </div>
                )}

                {/* General Reviewer Notes */}
                {!finding.rejected &&
                  !(finding.approved && finding.status === 'UNCERTAIN') &&
                  finding.reviewerNotes && (
                    <div className="mt-2 text-xs bg-surface-container-low/60 px-3 py-1.5 rounded-lg border border-outline-variant/30 flex items-center gap-1.5 text-on-surface">
                      <span className="material-symbols-outlined text-[14px] text-secondary">rate_review</span>
                      <span>
                        <strong className="font-medium">Reviewer Note: </strong> {finding.reviewerNotes}
                      </span>
                    </div>
                  )}

                {/* Action Bar */}
                <div className="mt-4 pt-3 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedFinding(finding);
                        setActiveView('evidence');
                      }}
                      className="text-primary hover:underline font-medium text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">link</span>
                      <span>Supporting Evidence ({finding.citations.length})</span>
                    </button>

                    <button
                      onClick={() => handleOpenAuditModal(finding)}
                      className="text-secondary hover:text-on-surface font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">history</span>
                      <span>Audit Trail ({auditActions.length})</span>
                    </button>

                    {finding.citations.some((c: any) => c.gitHubProvenance) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-secondary bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30">
                        <span className="material-symbols-outlined text-[13px] text-primary">code</span>
                        <span>
                          {(() => {
                            const gh = finding.citations.find((c: any) => c.gitHubProvenance)?.gitHubProvenance;
                            return gh
                              ? `${gh.repositoryName}@${(gh.commitSha || '').slice(0, 7) || gh.branch}`
                              : 'GitHub Provenance';
                          })()}
                        </span>
                      </span>
                    )}
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
                        className={`px-3 h-7 rounded-md font-medium text-xs flex items-center gap-1 shadow-xs transition-colors ${
                          currentUserRole !== 'MANAGER'
                            ? 'bg-surface-container-low text-secondary opacity-60 cursor-not-allowed border border-outline-variant/40'
                            : 'bg-error text-white hover:bg-error/90'
                        }`}
                        disabled={currentUserRole !== 'MANAGER'}
                        title={currentUserRole !== 'MANAGER' ? 'Manager role required to resolve conflicts' : undefined}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {currentUserRole !== 'MANAGER' ? 'lock' : 'balance'}
                        </span>
                        <span>Resolve Conflict</span>
                      </button>
                    )}

                    {/* Edit Finding */}
                    <button
                      onClick={() => handleOpenEditModal(finding)}
                      disabled={currentUserRole === 'EXTERNAL'}
                      title={currentUserRole === 'EXTERNAL' ? 'Read-only access for External role' : undefined}
                      className={`px-2.5 h-7 rounded-md font-medium text-xs flex items-center gap-1 transition-colors border border-outline-variant/40 ${
                        currentUserRole === 'EXTERNAL'
                          ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">edit</span>
                      <span>Edit</span>
                    </button>

                    {/* Reject Finding */}
                    <button
                      onClick={() => handleOpenRejectModal(finding)}
                      disabled={currentUserRole !== 'MANAGER'}
                      title={currentUserRole !== 'MANAGER' ? 'Manager permissions required to reject findings' : undefined}
                      className={`px-2.5 h-7 rounded-md font-medium text-xs flex items-center gap-1 transition-colors border ${
                        currentUserRole !== 'MANAGER'
                          ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed border-outline-variant/40'
                          : finding.rejected
                          ? 'bg-error/10 text-error border-error/30'
                          : 'bg-surface-container-low hover:bg-error/10 text-secondary hover:text-error border-outline-variant/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {currentUserRole !== 'MANAGER' ? 'lock' : 'close'}
                      </span>
                      <span>{finding.rejected ? 'Rejected' : 'Reject'}</span>
                    </button>

                    {/* Approve Finding Button */}
                    <button
                      onClick={() => handleApproveClick(finding)}
                      disabled={isConflictBlocked || isMissingEvidence || currentUserRole !== 'MANAGER'}
                      title={
                        currentUserRole !== 'MANAGER'
                          ? 'Manager permissions required to approve findings.'
                          : isConflictBlocked
                          ? 'Direct approval locked: Resolve contradictory sources first.'
                          : isMissingEvidence
                          ? 'Approval locked: Primary source evidence is MISSING. Provide documentation first.'
                          : isUncertain
                          ? 'Uncertain finding: Requires documented reviewer justification before approval.'
                          : undefined
                      }
                      className={`px-3 h-7 rounded-md font-medium text-xs flex items-center gap-1 transition-all shadow-xs ${
                        isConflictBlocked || isMissingEvidence || currentUserRole !== 'MANAGER'
                          ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed border border-outline-variant/40'
                          : finding.approved
                          ? 'bg-success/15 text-success border border-success/30 font-semibold'
                          : 'bg-primary text-on-primary hover:bg-primary-hover'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isConflictBlocked || isMissingEvidence || currentUserRole !== 'MANAGER' ? 'lock' : 'check'}
                      </span>
                      <span>
                        {currentUserRole !== 'MANAGER'
                          ? currentUserRole === 'EXTERNAL'
                            ? 'Read-Only'
                            : 'Manager Only'
                          : isConflictBlocked
                          ? 'Locked (Conflict)'
                          : isMissingEvidence
                          ? 'Missing Evidence'
                          : finding.approved
                          ? 'Approved'
                          : isUncertain
                          ? 'Justify & Approve'
                          : 'Approve'}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface">Reject Finding</h3>
              </div>
              <button
                onClick={() => setRejectModalFinding(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="text-xs text-secondary space-y-1">
              <p>
                <strong>Finding:</strong> {rejectModalFinding.title}
              </p>
              <p className="leading-relaxed">
                Rejecting permanently excludes this finding from certified handover exports. A documented rejection reason is stored in the audit trail.
              </p>
            </div>

            <form onSubmit={handleConfirmReject} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">
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
                  placeholder="Explain why this finding is rejected..."
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
                {rejectError && <p className="text-error text-[11px] mt-1">{rejectError}</p>}
              </div>

              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  value={rejectReviewerName}
                  onChange={(e) => setRejectReviewerName(e.target.value)}
                  className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setRejectModalFinding(null)}
                  className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReject || !rejectReason.trim()}
                  className="px-4 h-8 rounded-lg bg-error text-white hover:bg-error/90 font-medium transition-colors shadow-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                  <span>{isSubmittingReject ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FINDING MODAL */}
      {editModalFinding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface">Edit Finding &amp; Revalidate</h3>
              </div>
              <button
                onClick={() => setEditModalFinding(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/30 text-xs text-secondary">
              <span className="font-semibold text-primary block">Automatic Revalidation:</span>
              Edits to the claim title or summary are re-evaluated against source documents. If modified claims lack support, approval is reset.
            </div>

            <form onSubmit={handleConfirmEdit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-on-surface font-semibold block mb-1">Owner / Lead</label>
                  <input
                    type="text"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface font-semibold block mb-1">Urgency</label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value as any)}
                    className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">Summary</label>
                <textarea
                  rows={3}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">Reasoning (Optional)</label>
                <textarea
                  rows={2}
                  value={editReasoning}
                  onChange={(e) => setEditReasoning(e.target.value)}
                  placeholder="Architectural or technical rationale..."
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">Impact (Optional)</label>
                <textarea
                  rows={2}
                  value={editImpact}
                  onChange={(e) => setEditImpact(e.target.value)}
                  placeholder="Downstream operational or business impact..."
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">Reviewer Note (Audit Trail)</label>
                <input
                  type="text"
                  value={editReviewerNotes}
                  onChange={(e) => setEditReviewerNotes(e.target.value)}
                  placeholder="Reason for making this edit..."
                  className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setEditModalFinding(null)}
                  className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim() || !editSummary.trim()}
                  className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium transition-colors shadow-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  <span>{isSavingEdit ? 'Revalidating...' : 'Save & Revalidate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE UNCERTAIN FINDING JUSTIFICATION MODAL */}
      {approveModalFinding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface">
                  Reviewer Justification Required
                </h3>
              </div>
              <button
                onClick={() => setApproveModalFinding(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="text-xs text-secondary space-y-1.5">
              <p>
                <strong>Finding:</strong> {approveModalFinding.title}
              </p>
              <div className="p-2.5 bg-warning/10 border border-warning/20 rounded-lg text-warning">
                <span className="font-semibold block mb-0.5">Uncertain Support:</span>
                This finding has weak or uncertain support in documents. To approve into the certified handover, document how you verified this operational fact.
              </div>
            </div>

            <form onSubmit={handleConfirmApproveJustification} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">
                  Review Justification <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={approveJustification}
                  onChange={(e) => {
                    setApproveJustification(e.target.value);
                    if (approveJustificationError) setApproveJustificationError('');
                  }}
                  placeholder="Explain how this claim was verified..."
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
                {approveJustificationError && (
                  <p className="text-error text-[11px] mt-1">{approveJustificationError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setApproveModalFinding(null)}
                  className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApproval || !approveJustification.trim()}
                  className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingApproval ? (
                    <>
                      <KnowledgeTrailLoader variant="inline" message="Approving..." />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>Approve with Justification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      {auditModalFinding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 max-h-[85vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface">
                  Review Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setAuditModalFinding(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="text-xs text-secondary">
              <p>
                <strong>Finding:</strong> {auditModalFinding.title} ({auditModalFinding.id})
              </p>
              <p className="text-[11px] text-secondary mt-0.5">
                Immutable, chronological log of all human review actions and status transitions.
              </p>
            </div>

            {isLoadingAudit ? (
              <div className="py-6">
                <KnowledgeTrailLoader
                  variant="section"
                  message="Loading review history..."
                  submessage="Retrieving verified audit trail..."
                  step={3}
                />
              </div>
            ) : auditHistoryData.length === 0 ? (
              <div className="py-8 text-center text-xs text-secondary bg-surface-container-low/50 rounded-xl border border-outline-variant/30">
                No formal review actions logged yet for this finding. Actions will record automatically when reviewed.
              </div>
            ) : (
              <div className="space-y-2">
                {auditHistoryData.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className="p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/30 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            action.actionType === 'APPROVE'
                              ? 'bg-success/10 text-success border-success/20'
                              : action.actionType === 'REJECT'
                              ? 'bg-error/10 text-error border-error/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {action.actionType}
                        </span>
                        <span className="font-semibold text-on-surface">
                          {action.previousStatus} &rarr; {action.newStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-secondary font-mono">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-secondary mt-0.5">
                      <span>Reviewer: <strong>{action.reviewerName}</strong></span>
                    </div>

                    {action.reviewerNotes && (
                      <p className="mt-1 p-2 bg-surface-container-lowest rounded border border-outline-variant/30 text-secondary leading-relaxed">
                        &ldquo;{action.reviewerNotes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setAuditModalFinding(null)}
                className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium text-xs border border-outline-variant/40"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT RECORD RESOLUTION MODAL */}
      {activeConflictRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-2xl w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">balance</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface">
                  Resolve Cross-Document Conflict ({activeConflictRecord.id})
                </h3>
              </div>
              <button
                onClick={() => setActiveConflictRecord(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              {activeConflictRecord.explanation}
            </p>

            <form onSubmit={handleResolveConflictRecordSubmit} className="flex flex-col gap-4 text-xs">
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
                        : 'border-outline-variant/30 bg-surface-container-low/40 hover:bg-surface-container-low'
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
                      <div className="flex items-center justify-between text-[11px] text-secondary">
                        <strong>Claim A ({activeConflictRecord.sourceNameA})</strong>
                        <span className="font-mono">{activeConflictRecord.locationA}</span>
                      </div>
                      <p className="font-semibold text-on-surface text-xs mt-0.5">{activeConflictRecord.claimA}</p>
                      {activeConflictRecord.quoteA && (
                        <blockquote className="mt-1 pl-2 border-l-2 border-primary/40 text-[11px] italic text-secondary">
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
                        : 'border-outline-variant/30 bg-surface-container-low/40 hover:bg-surface-container-low'
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
                      <div className="flex items-center justify-between text-[11px] text-secondary">
                        <strong>Claim B ({activeConflictRecord.sourceNameB})</strong>
                        <span className="font-mono">{activeConflictRecord.locationB}</span>
                      </div>
                      <p className="font-semibold text-on-surface text-xs mt-0.5">{activeConflictRecord.claimB}</p>
                      {activeConflictRecord.quoteB && (
                        <blockquote className="mt-1 pl-2 border-l-2 border-error/40 text-[11px] italic text-secondary">
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
                        : 'border-outline-variant/30 bg-surface-container-low/40 hover:bg-surface-container-low'
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
                  Resolution Justification &amp; Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={conflictNotes}
                  onChange={(e) => setConflictNotes(e.target.value)}
                  placeholder="Explain why this choice prevails..."
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setActiveConflictRecord(null)}
                  className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium text-xs border border-outline-variant/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolvingConflict || !conflictNotes.trim()}
                  className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium transition-colors shadow-xs text-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>{isResolvingConflict ? 'Resolving...' : 'Confirm Resolution'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CERTIFY CONFIRMATION MODAL */}
      {showCertifyConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <h3 className="text-base font-semibold text-on-surface">
              Certify &amp; Approve Handover Dossier
            </h3>
            <p className="text-xs text-secondary leading-relaxed">
              This action formally attests that all critical decisions, operational risks, and pending tasks have been reviewed and approved by human leads.
            </p>

            <div className="text-left text-xs bg-surface-container-low/50 p-3 rounded-lg border border-outline-variant/40">
              <label className="font-semibold text-on-surface block mb-1">
                Signer Authorization Credentials
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3 h-8 bg-surface-container-lowest rounded-md border border-outline-variant/40 text-on-surface font-medium"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCertifyConfirm(false)}
                className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors text-xs font-medium border border-outline-variant/40"
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
                className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium text-xs transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">draw</span>
                <span>Affix Signature &amp; View Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DIRECT FINDING CONFLICT MODAL */}
      {conflictModalFinding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                <h3 className="text-sm font-semibold text-on-surface">
                  Resolve Contradiction
                </h3>
              </div>
              <button
                onClick={() => setConflictModalFinding(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="text-xs text-secondary space-y-1">
              <p>
                <strong>Finding:</strong> {conflictModalFinding.title}
              </p>
              <p className="leading-relaxed">
                {conflictModalFinding.conflictDetails?.explanation ||
                  'Contradictory assertions exist in original documents.'}
              </p>
            </div>

            <form onSubmit={handleResolveSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">
                  Resolution Decision &amp; Justification <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={conflictResolutionText}
                  onChange={(e) => setConflictResolutionText(e.target.value)}
                  placeholder="Document which source prevails..."
                  className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setConflictModalFinding(null)}
                  className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!conflictResolutionText.trim()}
                  className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium transition-colors shadow-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Confirm Resolution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
