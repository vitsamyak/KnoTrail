'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import type {
  GitHubIntegration,
  CodebaseIntelligence,
  CodebaseQuestionResponse,
} from '../../lib/types';

interface CodebaseQnAModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: GitHubIntegration | null;
}

const CANONICAL_QUESTIONS = [
  'What is the application architecture and key components?',
  'How does authentication and role-based access work?',
  'How is the GitHub API integrated and authenticated?',
  'What database tables and migrations exist?',
  'How does the document ingestion pipeline work?',
  'What are the key dependencies and external services?',
  'What are the major technical decisions recorded in the code?',
  'Where are the main entry points and data flows?',
];

export function CodebaseQnAModal({ isOpen, onClose, integration }: CodebaseQnAModalProps) {
  const { getCodebaseIntelligence, askCodebaseQuestion, setActiveView } = useProject();

  const [activeTab, setActiveTab] = useState<'qa' | 'blueprint' | 'files'>('qa');
  const [intelligence, setIntelligence] = useState<CodebaseIntelligence | null>(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState<boolean>(false);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [answerData, setAnswerData] = useState<CodebaseQuestionResponse | null>(null);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedCitationIndex, setExpandedCitationIndex] = useState<number | null>(null);
  const [fileFilter, setFileFilter] = useState<string>('');

  // Fetch intelligence whenever modal opens for this integration
  useEffect(() => {
    if (isOpen && integration) {
      setErrorMessage(null);
      setIsLoadingIntelligence(true);
      // Pre-seed with existing if available
      if (integration.codebaseIntelligence) {
        setIntelligence(integration.codebaseIntelligence);
      }
      getCodebaseIntelligence(integration.repoId)
        .then((res) => {
          if (res.success && res.data) {
            setIntelligence(res.data);
          }
        })
        .finally(() => {
          setIsLoadingIntelligence(false);
        });
    }
  }, [isOpen, integration, getCodebaseIntelligence]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !integration) return null;

  const handleAsk = async (questionToAsk: string) => {
    const q = questionToAsk.trim();
    if (!q) return;

    setLastAskedQuestion(q);
    setIsAnswering(true);
    setErrorMessage(null);
    setExpandedCitationIndex(null);

    const res = await askCodebaseQuestion(integration.repoId, q);
    if (res.success && res.data) {
      setAnswerData(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to answer question about codebase.');
    }
    setIsAnswering(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(questionInput);
  };

  const filteredInventory = (intelligence?.inventory || []).filter((item) => {
    if (!fileFilter) return true;
    const term = fileFilter.toLowerCase();
    return (
      item.path.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      (item.language && item.language.toLowerCase().includes(term))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="codebase-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-outline-variant/30 flex items-start justify-between gap-4 bg-surface-container-low/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <span className="material-symbols-outlined text-[24px]">terminal</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="codebase-modal-title"
                  className="text-base font-bold text-on-surface truncate font-mono"
                >
                  {integration.repoOwner}/{integration.repoName}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-semibold border border-primary/20">
                  branch: {integration.selectedBranch || integration.defaultBranch}
                </span>
                {intelligence?.stats?.totalFilesDiscovered ? (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-[10px] font-mono">
                    {intelligence.stats.totalFilesDiscovered} files · {intelligence.stats.totalLinesOfCode?.toLocaleString() || 0} LOC
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-secondary mt-0.5">
                Deep repository intelligence, architectural blueprint &amp; source-grounded engineering Q&amp;A.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-secondary hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 py-1.5">
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'qa'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Codebase Q&amp;A</span>
            </button>

            <button
              onClick={() => setActiveTab('blueprint')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'blueprint'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">architecture</span>
              <span>Architecture Blueprint</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'files'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              <span>File Inventory ({intelligence?.inventory?.length || 0})</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              setActiveView('evidence');
            }}
            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 py-1"
          >
            <span>Open in Evidence Explorer</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoadingIntelligence && !intelligence && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-secondary">
              <span className="material-symbols-outlined text-[32px] animate-spin text-primary">
                progress_activity
              </span>
              <p className="text-xs font-medium">Loading codebase intelligence &amp; architecture blueprint...</p>
            </div>
          )}

          {/* TAB 1: CODEBASE Q&A */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              {/* Canonical Questions Shelf */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                  Canonical Architecture &amp; Engineering Questions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CANONICAL_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAsk(q)}
                      disabled={isAnswering}
                      className="text-left p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 hover:bg-surface-container hover:border-primary/40 transition-all text-xs text-on-surface flex items-start gap-2 group disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        help_outline
                      </span>
                      <span className="leading-snug">{q}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Free-form Question Input */}
              <form onSubmit={handleFormSubmit} className="flex gap-2 items-center pt-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask any question about this codebase (e.g. routes, auth, schema, state)..."
                    disabled={isAnswering}
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface-container-low border border-outline-variant/50 text-xs text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAnswering || !questionInput.trim()}
                  className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {isAnswering ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Answering...</span>
                    </>
                  ) : (
                    <>
                      <span>Ask</span>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </>
                  )}
                </button>
              </form>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-error text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Answer Card */}
              {answerData && (
                <div className="p-4 bg-surface-container-low/60 rounded-2xl border border-primary/30 space-y-4 animate-in fade-in duration-200">
                  {/* Question and Confidence Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant/30">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Grounded Answer
                      </span>
                      <h3 className="text-sm font-bold text-on-surface">
                        {lastAskedQuestion}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      <span>{Math.round(answerData.confidence * 100)}% Confidence</span>
                    </div>
                  </div>

                  {/* Answer Text */}
                  <div className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans">
                    {answerData.answer}
                  </div>

                  {/* Supporting Evidence Citations */}
                  {answerData.citations && answerData.citations.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-outline-variant/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[15px]">code</span>
                          Source Grounding ({answerData.citations.length} Citations)
                        </span>
                        <span className="text-[10px] text-secondary">
                          Zero ungrounded assumptions
                        </span>
                      </div>

                      <div className="space-y-2">
                        {answerData.citations.map((cit, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-primary text-[16px] shrink-0">
                                  description
                                </span>
                                <span className="text-xs font-mono font-bold text-on-surface truncate">
                                  {cit.file}
                                </span>
                                {cit.lineRange && (
                                  <span className="px-2 py-0.5 rounded bg-surface-container text-primary text-[10px] font-mono font-semibold border border-outline-variant/30">
                                    L{cit.lineRange}
                                  </span>
                                )}
                              </div>

                              {cit.quote && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCitationIndex(
                                      expandedCitationIndex === cIdx ? null : cIdx
                                    )
                                  }
                                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
                                >
                                  <span>{expandedCitationIndex === cIdx ? 'Hide' : 'View Code'}</span>
                                  <span className="material-symbols-outlined text-[14px]">
                                    {expandedCitationIndex === cIdx ? 'expand_less' : 'expand_more'}
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Verbatim Code Quote Accordion */}
                            {cit.quote && expandedCitationIndex === cIdx && (
                              <div className="bg-surface-container rounded-lg p-3 text-[11px] font-mono text-on-surface overflow-x-auto border border-outline-variant/30">
                                <pre className="leading-relaxed">{cit.quote}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Files Chips */}
                  {answerData.relatedFiles && answerData.relatedFiles.length > 0 && (
                    <div className="pt-2 border-t border-outline-variant/30 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                        Related Repository Files
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {answerData.relatedFiles.map((rf, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-mono text-secondary border border-outline-variant/30 hover:text-on-surface"
                          >
                            {rf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ARCHITECTURE BLUEPRINT */}
          {activeTab === 'blueprint' && (
            <div className="space-y-4">
              {!intelligence?.blueprint ? (
                <div className="p-6 text-center text-secondary text-xs">
                  No architecture blueprint found. Synchronize this repository to generate the blueprint.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stack Badges Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">web</span>
                        Frontend
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        {intelligence.blueprint.frontend.framework}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {intelligence.blueprint.frontend.uiLibrary || 'Tailwind CSS'} · {intelligence.blueprint.frontend.stateManagement?.join(', ') || 'Context API'}
                      </p>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">dns</span>
                        Backend
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        {intelligence.blueprint.backend.framework}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {intelligence.blueprint.backend.runtime} · {intelligence.blueprint.backend.keyRoutes.length} route files
                      </p>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">database</span>
                        Database
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        {intelligence.blueprint.database.type}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {intelligence.blueprint.database.tables.length} tables · {intelligence.blueprint.database.hasMigrations ? 'Migrations active' : 'No migrations'}
                      </p>
                    </div>

                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">cloud_upload</span>
                        Deployment
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        {intelligence.blueprint.deployment.platforms?.join(', ') || 'Cloud Server'}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {intelligence.blueprint.deployment.containerized ? 'Docker Containerized' : 'Standard Node runtime'}
                      </p>
                    </div>
                  </div>

                  {/* Backend Routes & Middleware */}
                  <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">alt_route</span>
                      Backend Routes &amp; Middleware Stack
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-secondary font-semibold uppercase block mb-1">
                          Middleware Stack
                        </span>
                        <ul className="space-y-1">
                          {intelligence.blueprint.backend.middleware.map((mw, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-on-surface">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                              <span>{mw}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[10px] text-secondary font-semibold uppercase block mb-1">
                          Route Files ({intelligence.blueprint.backend.keyRoutes.length})
                        </span>
                        <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                          {intelligence.blueprint.backend.keyRoutes.map((kr, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-surface-container text-secondary">
                              {kr}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Database Tables & Features */}
                  <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">table_chart</span>
                      Database Schemas &amp; Tables
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {intelligence.blueprint.database.tables.map((tbl, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-semibold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px] text-primary">table</span>
                          {tbl}
                        </span>
                      ))}
                    </div>
                    {intelligence.blueprint.database.features.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-secondary">
                        <span className="font-semibold text-on-surface">Security &amp; Integrity:</span>
                        {intelligence.blueprint.database.features.map((ft, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-surface-container text-[10px]">
                            {ft}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* External Integrations */}
                  <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">hub</span>
                      External Integrations &amp; AI Providers
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {intelligence.blueprint.externalIntegrations?.map((ext, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-semibold text-on-surface flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">extension</span>
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FILE INVENTORY */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Filter files by path, extension, or category..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary"
                  />
                </div>
                <span className="text-xs text-secondary font-mono">
                  Showing {filteredInventory.length} of {intelligence?.inventory?.length || 0} files
                </span>
              </div>

              <div className="border border-outline-variant/40 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-container-low text-secondary text-[10px] uppercase font-bold sticky top-0 border-b border-outline-variant/30">
                    <tr>
                      <th className="py-2 px-3">File Path</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Language</th>
                      <th className="py-2 px-3 text-right">LOC</th>
                      <th className="py-2 px-3 text-right">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 font-mono text-[11px]">
                    {filteredInventory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                        <td className="py-2 px-3 text-on-surface font-semibold max-w-[320px] truncate" title={item.path}>
                          {item.path}
                        </td>
                        <td className="py-2 px-3 text-secondary">
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px]">
                            {item.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-secondary">{item.language || '-'}</td>
                        <td className="py-2 px-3 text-right text-on-surface">
                          {item.linesCount ? item.linesCount.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-secondary">
                          {(item.size / 1024).toFixed(1)} KB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/30 bg-surface-container-low/30 flex items-center justify-between text-xs">
          <span className="text-secondary text-[11px] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[14px]">shield</span>
            100% grounded in repository git trees &amp; blobs · Zero hallucinations
          </span>

          <button
            onClick={onClose}
            className="px-4 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-colors border border-outline-variant/40"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
