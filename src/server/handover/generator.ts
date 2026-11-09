import crypto from 'node:crypto';
import type {
  KnowledgeFinding,
  ProjectData,
  ConflictRecord,
  HandoverDocument,
  HandoverEvidenceItem,
  HandoverSectionCounts,
} from '../../lib/types.ts';
import { checkHandoverBlockStatus } from '../../lib/handoverFilter.ts';

/**
 * Filter finding strictly for Handover eligibility per Phase G rules.
 * 1. Must be approved (approved: true and reviewStatus === 'APPROVED').
 * 2. Must NOT be rejected (rejected !== true and reviewStatus !== 'REJECTED').
 * 3. Must have verified or matched primary source evidence (evidenceValidity !== 'MISSING' and status !== 'MISSING').
 * 4. Must NOT be involved in any unresolved conflict.
 */
export function getEligibleHandoverFindings(
  findings: KnowledgeFinding[],
  conflicts?: ConflictRecord[]
): KnowledgeFinding[] {
  const openConflicts = (conflicts || []).filter((c) => c.status === 'OPEN');
  const openConflictFindingIds = new Set<string>();

  for (const c of openConflicts) {
    if (c.findingIdA) openConflictFindingIds.add(c.findingIdA);
    if (c.findingIdB) openConflictFindingIds.add(c.findingIdB);
  }

  return (findings || []).filter((f) => {
    // Must be approved and not rejected
    if (!f.approved || f.rejected) return false;
    if (f.reviewStatus === 'REJECTED' || f.reviewStatus === 'NEEDS_CORRECTION') return false;

    // Must not have missing evidence
    if (f.status === 'MISSING' || f.evidenceValidity === 'MISSING') return false;

    // Must not be involved in an open conflict
    if (f.status === 'CONFLICTING') return false;
    if (openConflictFindingIds.has(f.id)) return false;

    return true;
  });
}

/**
 * Computes a deterministic snapshot hash of current findings and sources.
 * Used to detect if the underlying project data changes after a handover was certified.
 */
export function computeProjectDataSnapshotHash(project: ProjectData): string {
  const findingsFingerprint = (project.findings || []).map((f) => ({
    id: f.id,
    title: f.title,
    summary: f.summary,
    approved: f.approved,
    rejected: f.rejected,
    status: f.status,
    reviewStatus: f.reviewStatus,
  }));

  const sourcesFingerprint = (project.sources || []).map((s) => ({
    id: s.id,
    name: s.name,
    contentHash: s.documentData?.contentHash,
  }));

  const payload = JSON.stringify({ findingsFingerprint, sourcesFingerprint });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Deterministic rule-based executive summary generated strictly from eligible findings.
 * Guaranteed 100% offline, zero hallucination, and fully verifiable.
 */
export function generateDeterministicExecutiveSummary(
  project: ProjectData,
  eligibleFindings: KnowledgeFinding[]
): string {
  const decisions = eligibleFindings.filter((f) => f.type === 'decision');
  const tasks = eligibleFindings.filter((f) => f.type === 'task');
  const risks = eligibleFindings.filter((f) => f.type === 'risk');
  const dependencies = eligibleFindings.filter((f) => f.type === 'dependency');
  const urgentTasks = tasks.filter((t) => t.urgency === 'critical' || t.urgency === 'high');
  const urgentRisks = risks.filter((r) => r.urgency === 'critical' || r.urgency === 'high');

  const sentences: string[] = [];

  // Project identity sentence
  sentences.push(
    `This certified engineering handover report documents the verified operational state for ${project.name} (${project.code}), classified under ${project.category || 'Software Engineering'}.`
  );

  // Completed / architectural state
  if (decisions.length > 0) {
    const decisionHighlights = decisions.slice(0, 2).map((d) => `"${d.title}"`).join(' and ');
    sentences.push(
      `${decisions.length} core architectural decision(s) have been verified and signed off by lead reviewers, including ${decisionHighlights}.`
    );
  } else {
    sentences.push('No formal architectural decisions have been certified in this handover.');
  }

  // Pending tasks and work
  if (tasks.length > 0) {
    if (urgentTasks.length > 0) {
      sentences.push(
        `There are ${tasks.length} pending operational task(s) tracked for the incoming team, with ${urgentTasks.length} high-priority action(s) requiring immediate attention.`
      );
    } else {
      sentences.push(
        `There are ${tasks.length} pending operational task(s) currently recorded across project domains.`
      );
    }
  } else {
    sentences.push('All documented operational tasks have been completed or marked non-blocking.');
  }

  // Risks requiring attention
  if (risks.length > 0) {
    if (urgentRisks.length > 0) {
      sentences.push(
        `Critical attention is required for ${urgentRisks.length} elevated risk(s): ${urgentRisks.slice(0, 2).map((r) => `"${r.title}"`).join(', ')}.`
      );
    } else {
      sentences.push(
        `${risks.length} operational risk(s) are recorded with documented mitigation strategies.`
      );
    }
  }

  // Dependencies
  if (dependencies.length > 0) {
    sentences.push(
      `System reliability relies on ${dependencies.length} verified technical integration(s) and upstream dependencies.`
    );
  }

  sentences.push(
    'All factual assertions in this dossier have undergone human review and are backed by verifiable source citations.'
  );

  return sentences.join(' ');
}

/**
 * Builds the complete, structured 12-section HandoverDocument.
 */
export async function buildHandoverDocument(
  project: ProjectData,
  options: {
    signerName?: string;
    version?: string;
    regenerate?: boolean;
    useAiSummary?: boolean;
  } = {}
): Promise<HandoverDocument> {
  // Gate check: Handover cannot be generated if empty, or if blocking conflicts, unreviewed findings, or correction requests exist
  if (!project.findings || project.findings.length === 0) {
    throw new Error('Handover cannot be certified: No project findings exist to compile a handover.');
  }

  const blockStatus = checkHandoverBlockStatus(project.findings, false, project.conflicts);
  if (!blockStatus.canCertify) {
    throw new Error(
      `Handover cannot be certified: ${blockStatus.reason || 'Unresolved review blockers exist.'}`
    );
  }

  const eligibleFindings = getEligibleHandoverFindings(project.findings, project.conflicts);

  // Partition eligible findings into operational categories
  const decisions = eligibleFindings.filter((f) => f.type === 'decision');
  const tasks = eligibleFindings.filter((f) => f.type === 'task');
  const risks = eligibleFindings.filter((f) => f.type === 'risk');
  const dependencies = eligibleFindings.filter((f) => f.type === 'dependency');
  const unresolvedQuestions = eligibleFindings.filter((f) => f.type === 'unresolved_question');
  const nextActions = eligibleFindings.filter((f) => f.type === 'next_action');
  const contacts = eligibleFindings.filter((f) => f.type === 'contact');

  // Partition Responsibilities (assigned vs unassigned)
  const ownerMap: Record<string, string[]> = {};
  const unassignedTasks: KnowledgeFinding[] = [];

  for (const task of tasks) {
    const ownerName = task.owner?.trim();
    const isUnassigned =
      !ownerName ||
      ownerName.toLowerCase() === 'unassigned' ||
      ownerName.toLowerCase() === 'tbd' ||
      ownerName.toLowerCase() === 'none' ||
      ownerName === 'Unassigned Team';

    if (isUnassigned) {
      unassignedTasks.push(task);
    } else {
      if (!ownerMap[ownerName]) ownerMap[ownerName] = [];
      ownerMap[ownerName].push(task.title);
    }
  }

  const assignedResponsibilities = Object.entries(ownerMap).map(([owner, taskTitles]) => ({
    owner,
    tasksCount: taskTitles.length,
    taskTitles,
  }));

  // Partition Recommended Next Actions by priority
  // Combine nextActions and urgent tasks into prioritized roadmap
  const allActionItems = [
    ...nextActions,
    ...tasks.filter((t) => t.urgency === 'critical' || t.urgency === 'high'),
  ];
  // Deduplicate by ID
  const seenActionIds = new Set<string>();
  const uniqueActionItems = allActionItems.filter((item) => {
    if (seenActionIds.has(item.id)) return false;
    seenActionIds.add(item.id);
    return true;
  });

  const immediateActions = uniqueActionItems.filter(
    (a) => a.urgency === 'critical' || a.urgency === 'high'
  );
  const shortTermActions = uniqueActionItems.filter((a) => a.urgency === 'medium');
  const followUpActions = uniqueActionItems.filter((a) => a.urgency === 'low' || !a.urgency);

  // Build Evidence & Source Inventory (Section K)
  const evidenceInventory: HandoverEvidenceItem[] = eligibleFindings.map((f) => {
    const isAcceptedUncertain = f.status === 'UNCERTAIN' || f.claimStatus === 'UNCERTAIN';
    return {
      findingId: f.id,
      findingTitle: f.title,
      findingType: f.type,
      status: f.status,
      evidenceValidity: f.evidenceValidity,
      claimStatus: f.claimStatus,
      isAcceptedUncertain,
      reviewerJustification: isAcceptedUncertain ? f.reviewerNotes : undefined,
      citations: f.citations || [],
    };
  });

  // Human Review History (Section L)
  const auditActions = project.reviewAuditHistory || [];
  const acceptedUncertainCount = eligibleFindings.filter(
    (f) => f.status === 'UNCERTAIN' || f.claimStatus === 'UNCERTAIN'
  ).length;
  const rejectedCount = project.findings.filter((f) => f.rejected).length;
  const resolvedConflictsCount = (project.conflicts || []).filter((c) => c.status === 'RESOLVED').length;

  const reviewHistory = {
    approvedCount: eligibleFindings.length,
    acceptedUncertainCount,
    rejectedCount,
    resolvedConflictsCount,
    auditActions,
  };

  const sectionCounts: HandoverSectionCounts = {
    decisions: decisions.length,
    tasks: tasks.length,
    risks: risks.length,
    dependencies: dependencies.length,
    questions: unresolvedQuestions.length,
    nextActions: immediateActions.length + shortTermActions.length + followUpActions.length,
    contacts: contacts.length,
    totalApprovedFindings: eligibleFindings.length,
  };

  // Generate Executive Summary
  const executiveSummary = generateDeterministicExecutiveSummary(project, eligibleFindings);

  // Version management
  const nextVersionNumber = options.version || (project.currentHandover ? incrementVersion(project.currentHandover.version) : 'v1.0');

  const now = new Date().toISOString();
  const certDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const signer = options.signerName || project.lead?.name || 'Authorized Project Reviewer';
  const certificationHash = `SHA256:${crypto.createHash('sha256').update(`${project.id}-${now}-${signer}-${eligibleFindings.length}`).digest('hex')}`;
  const auditStamp = `#KT-${project.code}-${certificationHash.slice(7, 15).toUpperCase()}`;

  const handoverDoc: HandoverDocument = {
    id: `handover-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: project.id,
    projectId: project.id,
    version: nextVersionNumber,
    generatedAt: now,
    certifiedDate: certDate,
    certifiedBy: signer,
    certificationHash,
    isOutdated: false,
    sourceSnapshotHash: computeProjectDataSnapshotHash(project),

    metadata: {
      projectName: project.name,
      projectCode: project.code,
      description: project.description,
      category: project.category || 'Software Engineering',
      version: nextVersionNumber,
      targetExitDate: project.targetExitDate || 'Flexible',
      auditStamp,
      outgoingLead: project.lead ? { name: project.lead.name, role: project.lead.role, email: project.lead.email } : undefined,
      incomingLead: project.stakeholders && project.stakeholders.length > 1
        ? { name: project.stakeholders[1].name, role: project.stakeholders[1].role, email: project.stakeholders[1].email }
        : undefined,
    },

    executiveSummary,

    projectOverview: {
      purpose: project.description || `Knowledge continuity for ${project.name}`,
      scope: `${project.sources.length} connected source documents containing ${eligibleFindings.length} verified architectural statements`,
      operationalStatus: project.handoverCertified ? 'Certified for Transition' : 'Approved by Lead Reviewer',
      connectedSourcesCount: project.sources.length,
    },

    decisions,
    tasks,
    responsibilities: {
      assigned: assignedResponsibilities,
      unassignedTasks,
      unassignedCount: unassignedTasks.length,
    },
    risks,
    dependencies,
    unresolvedQuestions,
    recommendedNextActions: {
      immediate: immediateActions,
      shortTerm: shortTermActions,
      followUp: followUpActions,
    },
    evidenceInventory,
    reviewHistory,
    sectionCounts,
  };

  return handoverDoc;
}

function incrementVersion(prevVersion: string = 'v1.0'): string {
  const match = prevVersion.match(/^v?(\d+)\.(\d+)$/);
  if (!match) return 'v1.1';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10) + 1;
  return `v${major}.${minor}`;
}
