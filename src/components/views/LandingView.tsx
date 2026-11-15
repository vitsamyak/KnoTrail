'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

export function LandingView() {
  const { setActiveView, setShowLoginModal, isAuthenticated } = useProject();

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-6 bg-background text-on-surface antialiased">
      <div className="flex flex-col w-full max-w-6xl mx-auto py-6 sm:py-12 space-y-12">
        {/* Top Global Announcement Pill */}
        <div className="w-full flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center text-center gap-2 bg-surface-container-low/60 px-3.5 py-1.5 rounded-full shadow-xs border border-outline-variant/40">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
            <span className="text-xs text-secondary tracking-wide uppercase font-semibold">
              CodersInPune Hackathon 2026 • Final Round
            </span>
            <span className="text-secondary hidden sm:inline">•</span>
            <span className="text-xs text-primary font-medium">
              Team Deploy_or_Die
            </span>
          </div>
        </div>

        {/* 1. HERO SECTION */}
        <section className="w-full my-2 sm:my-4">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/40 text-secondary text-[11px] font-semibold tracking-wider uppercase mb-4 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
              <span>Engineering Knowledge Continuity</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] lg:leading-[1.12] font-bold text-on-surface tracking-tight max-w-3xl">
              Your Team Moves On.<br className="hidden sm:inline" />{' '}
              <span className="text-primary">Your Knowledge Stays Forever.</span>
            </h1>

            {/* Supporting Description */}
            <p className="mt-4 text-xs sm:text-base text-secondary max-w-2xl mx-auto leading-relaxed text-center">
              KnoTrail synthesizes project documentation, reconstructs critical decisions and pending tasks, and compiles certified handover packages anchored to authentic source evidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-6 w-full sm:w-auto">
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 bg-primary hover:bg-primary-hover text-on-primary rounded-lg shadow-xs font-medium text-xs sm:text-sm transition-colors group"
                id="cta-add-docs"
              >
                <span>Add Project Documents</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                  upload_file
                </span>
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setActiveView('workspace');
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg shadow-xs border border-outline-variant/40 font-medium text-xs sm:text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  {isAuthenticated ? 'verified_user' : 'login'}
                </span>
                <span>{isAuthenticated ? 'Open Manager Workspace' : 'Sign In as Manager'}</span>
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 h-10 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-lg shadow-xs border border-outline-variant/40 font-medium text-xs sm:text-sm transition-colors"
              >
                <span>How It Works</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">schema</span>
              </button>
            </div>

            {/* Frictionless Zero-Auth Reassurance */}
            <div className="flex items-center justify-center gap-1.5 pt-4 text-xs text-secondary flex-wrap text-center">
              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
              <span>Free Public Demo • Zero sign-up or registration required • Sign in with Demo Manager for server-verified RBAC</span>
            </div>
          </div>
        </section>

        {/* 2. HOW KNOTRAIL WORKS */}
        <section id="how-it-works" className="w-full scroll-mt-8">
          <div className="bg-surface-container-low/40 rounded-2xl p-6 sm:p-8 border border-outline-variant/40">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">
                Deterministic 4-Step Pipeline
              </span>
              <h2 className="text-xl sm:text-2xl text-on-surface tracking-tight mt-1 font-bold">
                How KnoTrail Works
              </h2>
              <p className="text-xs sm:text-sm text-secondary mt-1">
                A structured, evidence-grounded workflow to transform scattered files into certified handover packages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">STEP 1</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1.5">
                    Upload Sources
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Ingest project documents—architecture specifications, runbooks, and meeting notes in PDF, Markdown, or text format.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-secondary font-mono">
                  PDF, TXT, and Markdown
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">STEP 2</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1.5">
                    Analyse Knowledge
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    KnoTrail extracts decisions, operational tasks, risks, and responsibilities, anchored to verbatim quotations.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-secondary font-mono">
                  Google Gemini 2.5 Flash
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">STEP 3</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">rule</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1.5">
                    Human Review
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Human reviewers validate each claim, resolve cross-document contradictions, and certify verified items.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-secondary font-mono">
                  Mandatory Human Sign-off
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">STEP 4</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">description</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-1.5">
                    Deliver Handover
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Generate the formal 12-section dossier ready to share online, export as Markdown or JSON, or print.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-secondary font-mono">
                  Markdown, JSON &amp; Print
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CORE VALUE PILLARS */}
        <section className="w-full">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">
              Platform Guarantees
            </span>
            <h2 className="text-xl sm:text-2xl text-on-surface tracking-tight font-bold mt-1">
              Why KnoTrail?
            </h2>
            <p className="text-xs sm:text-sm text-secondary mt-1">
              Preventing context loss and eliminating knowledge debt when critical team members depart.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {/* Benefit 1 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[20px]">folder_special</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">
                  Unified Knowledge Hub
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  No more searching across chat threads, email chains, and disconnected docs. All operational context consolidated in one workspace.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-primary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>Single source of truth</span>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[20px]">checklist</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">
                  Decisions &amp; Tasks
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Surface critical architectural rationale, unresolved questions, operational dependencies, and outstanding tasks.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>Track decisions and owners</span>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[20px]">fact_check</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">
                  Verifiable Citations
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Every claim points directly to line numbers and quotes in authentic source files. Zero ungrounded AI hallucinations.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-primary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>Page &amp; line coordinates</span>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                </div>
                <h3 className="text-sm font-semibold text-on-surface mb-1">
                  Frictionless Handover
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Incoming engineers onboard in hours instead of weeks, with complete architectural context and verified contacts.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-outline-variant/30 text-[11px] text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>Smooth team transitions</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FINAL CALL-TO-ACTION */}
        <section className="w-full">
          <div className="bg-surface-container-low/50 rounded-2xl p-6 sm:p-10 border border-outline-variant/40 text-center max-w-3xl mx-auto flex flex-col items-center shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Ready to Explore KnoTrail?
            </h2>

            <p className="text-xs sm:text-sm text-secondary max-w-lg mt-1.5 leading-relaxed">
              Experience the live platform now. Ingest documents, extract operational insights with Gemini, and review certified handovers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-6 w-full sm:w-auto">
              <button
                onClick={() => setActiveView('workspace')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 bg-primary hover:bg-primary-hover text-on-primary rounded-lg shadow-xs font-medium text-xs sm:text-sm transition-colors"
              >
                <span>Open Project Workspace</span>
                <span className="material-symbols-outlined text-[17px]">folder_open</span>
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setActiveView('workspace');
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs sm:text-sm border border-outline-variant/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[17px] text-primary">
                  {isAuthenticated ? 'verified_user' : 'login'}
                </span>
                <span>{isAuthenticated ? 'Manager Logged In' : 'Sign In as Manager'}</span>
              </button>
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs sm:text-sm border border-outline-variant/40 transition-colors"
              >
                <span>Upload Documents</span>
                <span className="material-symbols-outlined text-[17px]">upload_file</span>
              </button>
            </div>

            <p className="text-[11px] text-secondary font-mono mt-4">
              CodersInPune Hackathon 2026 • Final Round Submission • Team Deploy_or_Die
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full pt-6 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">KnoTrail</span>
            <span>•</span>
            <span>Intelligent Knowledge Handover Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span>CodersInPune 2026</span>
            <span>•</span>
            <span className="font-mono text-secondary">Team Deploy_or_Die</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
