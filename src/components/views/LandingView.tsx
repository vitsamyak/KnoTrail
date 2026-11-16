'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { GitHubLogo } from '../ui/GitHubLogo';

export function LandingView() {
  const { setActiveView, setShowLoginModal, isAuthenticated, currentUser } = useProject();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-on-surface antialiased flex flex-col">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. HEADER & NAVIGATION (Highest Priority: Balanced 3-Part Structure)
      ───────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-md border-b border-outline-variant/40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Compact Brand & Tagline */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => scrollTo('hero')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              aria-label="KnoTrail Home"
            >
              <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-2xs group-hover:bg-primary-hover transition-colors shrink-0">
                <span className="material-symbols-outlined text-[18px]">hub</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-on-surface leading-none">
                  KnoTrail
                </span>
                <span className="text-[11px] text-secondary font-normal tracking-normal leading-tight mt-0.5 hidden sm:block">
                  Knowledge Never Leaves a Trail Behind
                </span>
              </div>
            </button>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium text-secondary">
            <button
              onClick={() => scrollTo('how-it-works')}
              className="hover:text-on-surface transition-colors focus:outline-none whitespace-nowrap"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo('round-3-updates')}
              className="hover:text-on-surface transition-colors focus:outline-none whitespace-nowrap"
            >
              Round 3 Updates
            </button>
            <button
              onClick={() => scrollTo('capabilities')}
              className="hover:text-on-surface transition-colors focus:outline-none whitespace-nowrap"
            >
              Capabilities
            </button>
            <button
              onClick={() => scrollTo('workflow')}
              className="hover:text-on-surface transition-colors focus:outline-none whitespace-nowrap"
            >
              Workflow
            </button>
            <button
              onClick={() => scrollTo('mission')}
              className="hover:text-on-surface transition-colors focus:outline-none whitespace-nowrap"
            >
              Our Mission
            </button>
          </nav>

          {/* Right: Actions (GitHub subtle, Sign In secondary, Demo primary) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* GitHub subtle secondary action */}
            <a
              href="https://github.com/vitsamyak/KnoTrail"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
              title="View Source on GitHub"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>

            {isAuthenticated ? (
              <button
                onClick={() => setActiveView('workspace')}
                className="inline-flex items-center gap-1.5 px-3.5 h-8 sm:h-9 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-medium shadow-2xs transition-colors"
              >
                <span>Workspace ({currentUser?.role || 'Manager'})</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 sm:h-9 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-secondary">login</span>
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => setActiveView('workspace')}
                  className="inline-flex items-center gap-1.5 px-3.5 h-8 sm:h-9 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-medium shadow-2xs transition-colors"
                  id="nav-explore-demo"
                >
                  <span>Explore Live Demo</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </>
            )}

            {/* Mobile Navigation Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <span className="material-symbols-outlined text-[20px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-outline-variant/30 bg-surface px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-secondary">
              <button
                onClick={() => scrollTo('how-it-works')}
                className="text-left py-1.5 hover:text-on-surface transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollTo('round-3-updates')}
                className="text-left py-1.5 hover:text-on-surface transition-colors"
              >
                Round 3 Updates
              </button>
              <button
                onClick={() => scrollTo('capabilities')}
                className="text-left py-1.5 hover:text-on-surface transition-colors"
              >
                Capabilities
              </button>
              <button
                onClick={() => scrollTo('workflow')}
                className="text-left py-1.5 hover:text-on-surface transition-colors"
              >
                Product Workflow
              </button>
              <button
                onClick={() => scrollTo('mission')}
                className="text-left py-1.5 hover:text-on-surface transition-colors"
              >
                Our Mission
              </button>
              <a
                href="https://github.com/vitsamyak/KnoTrail"
                target="_blank"
                rel="noopener noreferrer"
                className="text-left py-1.5 flex items-center gap-1.5 hover:text-on-surface transition-colors"
              >
                <span>GitHub Repository</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </nav>
            <div className="pt-3 border-t border-outline-variant/30 flex flex-col gap-2">
              {!isAuthenticated && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLoginModal(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-9 bg-surface-container-low text-on-surface rounded-lg text-xs font-medium border border-outline-variant/40"
                >
                  <span className="material-symbols-outlined text-[15px]">login</span>
                  <span>Sign In as Manager</span>
                </button>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveView('workspace');
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 bg-primary text-on-primary rounded-lg text-xs font-medium"
              >
                <span>Explore Live Demo</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 flex flex-col w-full">
        {/* ─────────────────────────────────────────────────────────────────────────
            2. HERO SECTION
        ───────────────────────────────────────────────────────────────────────── */}
        <section id="hero" className="w-full py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 border-b border-outline-variant/30">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline, Description, and CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Context Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/40 text-secondary text-xs font-medium mb-4">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                <span className="font-semibold text-on-surface">KnoTrail</span>
                <span className="text-secondary">•</span>
                <span>CodersInPune Hackathon 2026</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-[1.15]">
                Turn Team Knowledge Into Your Next{' '}
                <span className="text-primary">Competitive Advantage.</span>
              </h1>

              {/* Supporting Description */}
              <p className="mt-4 text-sm sm:text-base text-secondary leading-relaxed max-w-2xl">
                KnoTrail transforms repositories, project documents, discussions, and technical decisions into verified, structured knowledge that teams can trust and hand over confidently.
              </p>

              {/* Action Buttons */}
              <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveView('workspace')}
                  className="inline-flex items-center justify-center gap-2 px-5 h-10 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-medium text-xs sm:text-sm shadow-2xs transition-colors group"
                  id="hero-explore-demo"
                >
                  <span>Explore Live Demo</span>
                  <span className="material-symbols-outlined text-[17px] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center justify-center gap-2 px-5 h-10 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs sm:text-sm border border-outline-variant/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px] text-secondary">
                    schema
                  </span>
                  <span>Discover How It Works</span>
                </button>
              </div>

              {/* Frictionless Trust Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
                  <span>Zero sign-up required</span>
                </div>
                <span className="hidden sm:inline text-outline/50">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                  <span>Incognito ready</span>
                </div>
                <span className="hidden sm:inline text-outline/50">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">gavel</span>
                  <span>Mandatory human sign-off</span>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Product Preview Visual */}
            <div className="lg:col-span-5 w-full flex justify-center">
              <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-xs overflow-hidden flex flex-col">
                {/* Mock Window Header */}
                <div className="px-4 py-2.5 bg-surface-container-low/60 border-b border-outline-variant/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-error/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-tertiary/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
                    <span className="ml-2 text-xs font-mono text-secondary">
                      knotrail-workspace-preview
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-primary font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Live Sync
                  </span>
                </div>

                {/* Body Cards */}
                <div className="p-4 space-y-3 text-left">
                  {/* Connected Repository Card */}
                  <div className="p-3 rounded-lg bg-surface-container-low/40 border border-outline-variant/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-surface-container text-on-surface flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        GH
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-on-surface truncate">vitsamyak/KnoTrail</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-primary/10 text-primary font-mono font-medium shrink-0">
                            main
                          </span>
                        </div>
                        <p className="text-[10px] text-secondary truncate">Commits, PRs, issues &amp; documentation</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      <span>Synced</span>
                    </span>
                  </div>

                  {/* Extracted Finding Preview */}
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary tracking-wider uppercase font-mono">
                        DECISION
                      </span>
                      <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>100% Grounded</span>
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-on-surface">
                      Storage Adapter Fail-Fast Initialization in Phase H
                    </div>
                    <p className="p-2 rounded bg-surface-container-low/40 border-l-2 border-primary text-[10px] text-secondary font-mono leading-relaxed">
                      &quot;StorageAdapter must reject invalid configuration during bootstrap rather than deferring to runtime query execution.&quot;
                    </p>
                    <div className="flex items-center justify-between pt-0.5 text-[10px] text-secondary font-mono">
                      <span>src/server/db/storage.ts#L45</span>
                      <span className="text-primary font-medium">commit 7a9b1c2</span>
                    </div>
                  </div>

                  {/* Continuous Update Drift Alert (Round 3 Feature) */}
                  <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-800 tracking-wider uppercase font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        <span>NEEDS RE-REVIEW (DRIFT DETECTED)</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-700 font-semibold">Round 3</span>
                    </div>
                    <div className="text-xs font-semibold text-on-surface">
                      Webhook Secret Signature Validation Middleware
                    </div>
                    <p className="text-[10px] text-secondary leading-snug">
                      Source commit <code className="font-mono text-on-surface">c0ffee1</code> updated HMAC headers. Handover approval revoked pending Manager re-review.
                    </p>
                  </div>

                  {/* Handover Dossier Readiness */}
                  <div className="p-2.5 rounded-lg bg-surface-container-low/50 border border-outline-variant/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">
                        assignment_turned_in
                      </span>
                      <div>
                        <div className="font-semibold text-on-surface text-[11px]">Certified Handover Dossier</div>
                        <div className="text-[10px] text-secondary">12 Standardized Sections • v1.2</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveView('handover')}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-primary font-medium text-[10px] transition-colors border border-outline-variant/30"
                    >
                      View Dossier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────
            3. HOW KNOTRAIL WORKS (4-STEP WORKFLOW)
        ───────────────────────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-8 bg-surface-container-low/20 scroll-mt-16">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                Deterministic Pipeline
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
                How KnoTrail Works
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
                A structured four-step process transforming scattered repositories and documents into verified, certified handover packages.
              </p>
            </div>

            {/* 4 Steps Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold text-primary tracking-wider uppercase px-2 py-0.5 rounded bg-primary/10">
                      Step 1
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">folder_open</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1.5">
                    Connect Sources
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Import GitHub repositories, documentation, and project notes via direct API connector or file upload.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-secondary font-mono">
                  GitHub, Markdown, PDF, TXT
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold text-primary tracking-wider uppercase px-2 py-0.5 rounded bg-primary/10">
                      Step 2
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1.5">
                    Extract Knowledge
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    AI synthesizes critical architectural decisions, operational tasks, active risks, and ownership assignments.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-secondary font-mono">
                  Google Gemini 2.5 Flash
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold text-primary tracking-wider uppercase px-2 py-0.5 rounded bg-primary/10">
                      Step 3
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">fact_check</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1.5">
                    Verify Evidence
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Review extracted findings against exact line numbers and commit SHAs. Inspect supporting quotes before approval.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-secondary font-mono">
                  Mandatory Human Sign-off
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold text-primary tracking-wider uppercase px-2 py-0.5 rounded bg-primary/10">
                      Step 4
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1.5">
                    Generate Handovers
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Compile a certified 12-section dossier ready to share online, export as Markdown/JSON, or print directly.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-secondary font-mono">
                  Markdown, JSON &amp; Print
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────
            4. WHAT'S NEW IN ROUND 3 (PROMINENT & COMPREHENSIVE)
        ───────────────────────────────────────────────────────────────────────── */}
        <section id="round-3-updates" className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-8 border-y border-outline-variant/30 bg-surface scroll-mt-16">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="max-w-3xl mx-auto text-center mb-10">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Round 3 Deliverables
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
                What&apos;s New in Round 3?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
                Engineered during Round 3 to bring direct codebase integration, enterprise-ready role security, and autonomous continuous knowledge synchronization.
              </p>
            </div>

            {/* Three Distinct Feature Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Feature A: GitHub Integration */}
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-[10px] font-mono font-bold text-on-surface uppercase tracking-wider border border-outline-variant/30">
                      Improvement 1
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[#24292f] text-white flex items-center justify-center shadow-xs">
                      <GitHubLogo className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    GitHub Integration
                  </h3>

                  <p className="text-xs text-secondary leading-relaxed mb-3">
                    Connect GitHub repositories directly to extract operational context straight from active commits, PRs, and discussions.
                  </p>

                  <ul className="space-y-2 text-xs text-on-surface">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Direct Repository Connect:</strong> Ingest commits, diffs, pull requests, reviews, and issues.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Cryptographic Provenance:</strong> Every finding links to commit SHAs and exact file coordinates.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Secure GitHub Webhooks:</strong> HMAC SHA-256 signed triggers update knowledge on push and PR merges.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-secondary">
                  <span>REST API &amp; Webhooks</span>
                  <span className="text-primary font-semibold">100% Provenance</span>
                </div>
              </div>

              {/* Feature B: Role-Based Security */}
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-[10px] font-mono font-bold text-on-surface uppercase tracking-wider border border-outline-variant/30">
                      Improvement 2
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    Role-Based Security
                  </h3>

                  <p className="text-xs text-secondary leading-relaxed mb-3">
                    Hardened access governance and automatic redaction ensuring strict separation across organizational roles.
                  </p>

                  <ul className="space-y-2 text-xs text-on-surface">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Manager-Only Governance:</strong> Finding approval, rejection, and handover certification restricted to Managers.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Developer Workspace:</strong> Developers can add project sources, trigger syncs, and contribute technical knowledge.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>External Redaction:</strong> External viewers receive sanitized snippets with internal paths stripped.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-secondary">
                  <span>Server-Verified RBAC</span>
                  <span className="text-primary font-semibold">Zero Sensitive Leakage</span>
                </div>
              </div>

              {/* Feature C: Continuous Knowledge Updates */}
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-[10px] font-mono font-bold text-on-surface uppercase tracking-wider border border-outline-variant/30">
                      Improvement 3
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">sync_saved_locally</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    Continuous Knowledge Updates
                  </h3>

                  <p className="text-xs text-secondary leading-relaxed mb-3">
                    Autonomous synchronization detects repository changes, scans for evidence drift, and flags outdated knowledge.
                  </p>

                  <ul className="space-y-2 text-xs text-on-surface">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Precision Drift Scanning:</strong> Only invalidates approvals when underlying citations are materially altered.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Handover De-Certification:</strong> When evidence drifts, certified handovers are automatically flagged outdated.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[15px] text-primary shrink-0 mt-0.5">check</span>
                      <span><strong>Update Audit History:</strong> Chronological log of synchronization events with durable retry support.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-secondary">
                  <span>Drift Detection Engine</span>
                  <span className="text-primary font-semibold">Automatic Invalidation</span>
                </div>
              </div>
            </div>

            {/* Mandatory Human Review Invariant */}
            <div className="mt-6 p-4 rounded-xl bg-surface-container-low/70 border border-outline-variant/40 flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
              <span className="material-symbols-outlined text-[22px] text-primary shrink-0">verified_user</span>
              <div className="flex-1 text-xs">
                <span className="font-bold text-on-surface">Mandatory Human Approval Invariant: </span>
                <span className="text-secondary">
                  While continuous updates detect repository drift and revoke outdated approvals automatically, <strong>no update is ever auto-approved</strong>. Human managers retain final authority over every handover.
                </span>
              </div>
              <button
                onClick={() => setActiveView('sources')}
                className="shrink-0 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs rounded-lg border border-outline-variant/40 transition-colors"
              >
                Inspect Sources UI
              </button>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────
            5. CORE CAPABILITIES (6-GRID SECTION)
        ───────────────────────────────────────────────────────────────────────── */}
        <section id="capabilities" className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-8 bg-surface-container-low/20 scroll-mt-16">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                Platform Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
                Core Capabilities
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
                Engineered from first principles to ensure knowledge handover is traceable, verifiable, and permanent.
              </p>
            </div>

            {/* 6 Capabilities Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    AI-Powered Extraction
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Uses Google Gemini 2.5 Flash with structured schemas to extract architecture decisions, tasks, and risks from project sources.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                  <span>Structured JSON schemas</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    Evidence-Backed Findings
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Every finding cites immutable source coordinates—file paths, line ranges, and verbatim quotes. Zero fabricated facts.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                  <span>Verbatim citation proof</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    Human-in-the-Loop Review
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Managers review, edit, reject, and certify findings in a dedicated Review Center. Cross-document conflicts are flagged for resolution.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                  <span>Mandatory human sign-off</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">account_tree</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    Source Provenance
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Deep bi-directional links connect each claim directly to its underlying GitHub commit, PR diff, or markdown source file.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                  <span>Direct GitHub deep links</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    Reliable Handover Generation
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Compiles comprehensive 12-section handover dossiers covering architecture, contacts, runbooks, and risks.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                  <span>Markdown, JSON &amp; Print</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    Update Audit History
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Maintains an immutable chronological audit trail of all webhook syncs, drift invalidations, commit updates, and retries.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-outline-variant/20 text-[10px] text-primary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                  <span>Continuous history log</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────
            6. PRODUCT WORKFLOW (4-PILLAR RECONSTRUCT -> VERIFY -> REVIEW -> HANDOVER)
        ───────────────────────────────────────────────────────────────────────── */}
        <section id="workflow" className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-8 bg-surface border-t border-outline-variant/30 scroll-mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                Core Governance Cycle
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
                The KnoTrail Workflow
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
                Operating continuously across four rigorous phases to guarantee zero ungrounded claims and total context preservation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-primary uppercase mb-1">Phase 1</div>
                  <h4 className="text-sm font-bold text-on-surface mb-1">RECONSTRUCT</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Synthesizes operational reality across code repositories, pull requests, issues, and specification documents.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-primary font-mono font-medium">Repository Ingestion</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-primary uppercase mb-1">Phase 2</div>
                  <h4 className="text-sm font-bold text-on-surface mb-1">VERIFY</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Calculates lexical grounding and anchors claims to exact line ranges, page numbers, and commit SHAs.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-primary font-mono font-medium">Evidence Grounding</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-primary uppercase mb-1">Phase 3</div>
                  <h4 className="text-sm font-bold text-on-surface mb-1">REVIEW</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Managers review, resolve cross-document contradictions, edit claims, and reject uncertain findings.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-primary font-mono font-medium">Human Sign-Off</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono font-bold text-primary uppercase mb-1">Phase 4</div>
                  <h4 className="text-sm font-bold text-on-surface mb-1">HANDOVER</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Compiles a formalized 12-section dossier ready for outgoing leads, incoming hires, and audit compliance.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-primary font-mono font-medium">Certified Dossier</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────
            7. OUR MISSION
        ───────────────────────────────────────────────────────────────────────── */}
        <section id="mission" className="w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-outline-variant/30 bg-surface-container-low/20 scroll-mt-16">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[24px]">format_quote</span>
            </div>

            <blockquote className="text-xl sm:text-2xl md:text-3xl font-bold text-on-surface tracking-tight leading-snug max-w-2xl">
              &ldquo;Knowledge should never disappear when people move on.&rdquo;
            </blockquote>

            <p className="mt-4 text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
              When key engineers, student volunteers, or team leads leave a project, their undocumented context typically vanishes with them. KnoTrail eliminates offboarding friction by continuously reconstructing verified operational state directly from authorized source history.
            </p>

            {/* Action CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setActiveView('workspace')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-medium text-xs sm:text-sm shadow-2xs transition-colors"
                id="cta-mission-workspace"
              >
                <span>Launch Live Workspace</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-10 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs sm:text-sm border border-outline-variant/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">upload_file</span>
                <span>Upload Project Documents</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────
          8. FOOTER
      ───────────────────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Column 1: Brand & Tagline */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">hub</span>
                </div>
                <span className="font-bold text-sm text-on-surface">KnoTrail</span>
              </div>
              <p className="text-xs font-semibold text-primary">
                Knowledge Never Leaves a Trail Behind.
              </p>
              <p className="text-xs text-secondary leading-relaxed max-w-sm">
                Intelligent knowledge handover platform reconstructing verifiable operational context through RECONSTRUCT → VERIFY → REVIEW → HANDOVER.
              </p>
            </div>

            {/* Column 2: Product Navigation */}
            <div className="md:col-span-3 space-y-1.5">
              <div className="text-xs font-bold text-on-surface uppercase tracking-wider">Product Navigation</div>
              <ul className="space-y-1 text-xs text-secondary">
                <li>
                  <button onClick={() => setActiveView('workspace')} className="hover:text-on-surface transition-colors">
                    Project Workspace
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('sources')} className="hover:text-on-surface transition-colors">
                    Source Manager &amp; GitHub
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('analysis')} className="hover:text-on-surface transition-colors">
                    AI Project Analysis
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('evidence')} className="hover:text-on-surface transition-colors">
                    Evidence Explorer
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('review')} className="hover:text-on-surface transition-colors">
                    Human Review Center
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('handover')} className="hover:text-on-surface transition-colors">
                    Handover Dossier
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Submission Metadata & GitHub */}
            <div className="md:col-span-4 space-y-1.5">
              <div className="text-xs font-bold text-on-surface uppercase tracking-wider">Submission Details</div>
              <div className="text-xs text-secondary space-y-0.5 leading-relaxed">
                <div><strong>Hackathon:</strong> CodersInPune Hackathon 2026 (Round 2 &amp; Round 3)</div>
                <div><strong>Team:</strong> Deploy_or_Die (2 Members)</div>
                <div><strong>Representative:</strong> Samyak Gedam (samyakgedam69@gmail.com)</div>
                <div><strong>Core Engineer:</strong> Sanshrey Sanagar (sanshrey7273@gmail.com)</div>
              </div>
              <div className="pt-2">
                <a
                  href="https://github.com/vitsamyak/KnoTrail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface border border-outline-variant/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">code</span>
                  <span>View GitHub Repository</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Guarantees */}
          <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary">
            <div>
              &copy; 2026 KnoTrail • Team Deploy_or_Die. All rights reserved.
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span>Zero-Auth Demo</span>
              <span>•</span>
              <span>Incognito Ready</span>
              <span>•</span>
              <span>100% Grounded</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
