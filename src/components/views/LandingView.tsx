'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

export function LandingView() {
  const { setActiveView } = useProject();

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-3 sm:px-space-md py-space-md bg-background text-on-surface antialiased">
      <div className="flex flex-col w-full max-w-7xl mx-auto py-space-md sm:py-space-xl">
        {/* Top Global Announcement Pill */}
        <div className="w-full px-2 sm:px-gutter mb-space-lg sm:mb-space-xl flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center text-center gap-1 sm:gap-space-xs bg-surface-container-low px-3 sm:px-space-md py-1 sm:py-space-2xs rounded-full shadow-sm border border-outline-variant/30">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
            <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase font-semibold">
              Built by Team Deploy_or_Die
            </span>
            <span className="font-body-sm text-body-sm text-outline hidden sm:inline">•</span>
            <span className="font-label-sm text-label-sm text-primary font-medium">
              Free Open Access (Zero Login Required)
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="w-full px-2 sm:px-gutter my-space-sm sm:my-space-lg mb-space-xl sm:mb-space-2xl">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-secondary text-xs font-semibold tracking-wider uppercase mb-space-md shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
              <span>PROJECT KNOWLEDGE CONTINUITY</span>
            </div>

            {/* Main Heading */}
            <h1 className="font-display-lg text-3xl sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-[1.14] font-extrabold text-on-surface tracking-tight max-w-4xl">
              KnoTrail: Your Team Moves On.<br className="hidden sm:inline" />{' '}
              <span className="text-primary">Your Knowledge Stays Forever.</span>
            </h1>

            {/* Supporting Description */}
            <p className="mt-space-md font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed text-center sm:text-lg">
              Preserve important decisions, project context and unfinished work. Give every incoming team member the knowledge they need to continue with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-space-sm pt-space-lg w-full sm:w-auto">
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm bg-primary hover:bg-inverse-surface text-on-primary rounded-lg shadow-sm font-headline-sm text-headline-sm font-semibold transition-all duration-200 active:scale-95 group min-h-[44px]"
                id="cta-add-docs"
              >
                <span>Add Project Documents</span>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  upload_file
                </span>
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm border border-outline-variant/30 font-headline-sm text-headline-sm font-medium transition-all duration-200 min-h-[44px]"
              >
                <span>How It Works</span>
                <span className="material-symbols-outlined text-lg text-outline">schema</span>
              </button>
            </div>

            {/* Frictionless Zero-Auth Reassurance */}
            <div className="flex items-center justify-center gap-space-xs pt-space-md text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-base text-primary">verified_user</span>
              <span>No sign-up or registration required. Works immediately in any browser window.</span>
            </div>
          </div>
        </section>

        {/* The 3 Core Pillars */}
        <section className="w-full px-gutter mb-space-2xl">
          <div className="text-center max-w-2xl mx-auto mb-space-lg">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
              The Problem
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
              Why Project Handovers Need Evidence
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              When teammates transition, important decisions and operational context are easily lost or misunderstood.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">description</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Scattered Documents
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Project knowledge is spread across different documents and notes. When someone departs, finding what matters is slow and incomplete.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-outline">
                <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                <span>Centralize project files in one place</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">search</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Hidden Details &amp; Tasks
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Unfinished tasks, architectural decisions, and known risks get forgotten unless they are explicitly extracted and categorized.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-outline">
                <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                <span>Extract decisions, tasks, and risks</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-primary/30 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none"></div>
              <div>
                <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Source-Linked Proof
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Every finding links directly to exact quotes, page numbers, and line ranges in the original files, followed by required human sign-off.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-primary font-medium">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Mandatory human review &amp; sign-off</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works: 3 Simple Steps */}
        <section id="how-it-works" className="w-full px-gutter mb-space-2xl scroll-mt-8">
          <div className="bg-surface-container-low rounded-2xl p-space-xl border border-outline-variant/30">
            <div className="text-center max-w-2xl mx-auto mb-space-xl">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Simple 3-Step Process
              </span>
              <h2 className="font-display-lg text-display-lg text-on-surface tracking-tight mt-1">
                How KnoTrail Works
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                A clear, straightforward workflow designed to ensure complete handover accuracy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 1</span>
                    <span className="material-symbols-outlined text-primary text-[22px]">upload_file</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                    Collect Project Information
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Upload your team&apos;s existing project files—architecture documents, specifications, runbooks, and meeting notes in PDF, Markdown, or text format.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/20 text-xs text-outline">
                  Supports PDF, TXT, and Markdown files
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 2</span>
                    <span className="material-symbols-outlined text-primary text-[22px]">auto_awesome</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                    Find Important Knowledge
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    KnoTrail analyzes the documents to identify critical architectural decisions, pending tasks, known risks, and system dependencies, linking each finding to its original source quote.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/20 text-xs text-outline">
                  Every finding grounded with exact quotes &amp; page/line numbers
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 3</span>
                    <span className="material-symbols-outlined text-secondary text-[22px]">rule</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                    Review and Generate Handover
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Team members review each finding, resolve any conflicting information, approve verified items, and produce a certified handover document ready to share or export.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/20 text-xs text-outline">
                  Exportable to Markdown, JSON, and print-ready formats
                </div>
              </div>
            </div>

            {/* Action Callout */}
            <div className="mt-space-xl text-center flex flex-col sm:flex-row items-center justify-center gap-space-sm">
              <button
                onClick={() => setActiveView('sources')}
                className="inline-flex items-center gap-2 px-space-xl py-space-sm bg-primary hover:bg-inverse-surface text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-md transition-all active:scale-95"
              >
                <span>Add Project Documents</span>
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
              </button>
              <button
                onClick={() => setActiveView('workspace')}
                className="inline-flex items-center gap-2 px-space-xl py-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-lg font-headline-sm text-headline-sm border border-outline-variant/30 transition-all"
              >
                <span>Open Project Workspace</span>
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full px-gutter pt-space-lg border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-sm text-xs text-outline">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">KnoTrail</span>
            <span>•</span>
            <span>Knowledge Handover Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span>CodersInPune Hackathon 2026</span>
            <span>•</span>
            <span className="font-mono text-secondary">Team Deploy_or_Die</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
