'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

export function LandingView() {
  const { setActiveView, setShowLoginModal, isAuthenticated } = useProject();

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-3 sm:px-space-md py-space-md bg-background text-on-surface antialiased">
      <div className="flex flex-col w-full max-w-7xl mx-auto py-space-md sm:py-space-xl space-y-space-2xl">
        {/* Top Global Announcement Pill */}
        <div className="w-full px-2 sm:px-gutter flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center text-center gap-1.5 sm:gap-space-xs bg-surface-container-low px-3.5 sm:px-space-md py-1.5 sm:py-space-2xs rounded-full shadow-xs border border-outline-variant/30">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
            <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase font-semibold">
              CodersInPune Hackathon 2026 • Final Round
            </span>
            <span className="font-body-sm text-body-sm text-outline hidden sm:inline">•</span>
            <span className="font-label-sm text-label-sm text-primary font-medium">
              Team Deploy_or_Die
            </span>
          </div>
        </div>

        {/* 1. HERO SECTION */}
        <section className="w-full px-2 sm:px-gutter my-space-sm sm:my-space-md">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-secondary text-xs font-semibold tracking-wider uppercase mb-space-md shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
              <span>PROJECT KNOWLEDGE CONTINUITY</span>
            </div>

            {/* Main Heading */}
            <h1 className="font-display-lg text-3xl sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-[1.14] font-extrabold text-on-surface tracking-tight max-w-4xl">
              Your Team Moves On.<br className="hidden sm:inline" />{' '}
              <span className="text-primary">Your Knowledge Stays Forever.</span>
            </h1>

            {/* Supporting Description */}
            <p className="mt-space-md font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed text-center sm:text-lg">
              KnoTrail brings project information together, finds important decisions and pending tasks, and creates clear handover documents so new members can take over with ease.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-space-lg w-full sm:w-auto">
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-inverse-surface text-on-primary rounded-xl shadow-sm font-headline-sm text-sm font-semibold transition-all duration-200 active:scale-95 group min-h-[46px]"
                id="cta-add-docs"
              >
                <span>Add Project Documents</span>
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-xl shadow-xs border border-outline-variant/30 font-headline-sm text-sm font-semibold transition-all duration-200 min-h-[46px]"
              >
                <span className="material-symbols-outlined text-lg text-primary">
                  {isAuthenticated ? 'verified_user' : 'login'}
                </span>
                <span>{isAuthenticated ? 'Open Manager Workspace' : 'Sign In as Manager'}</span>
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-xl shadow-xs border border-outline-variant/30 font-headline-sm text-sm font-medium transition-all duration-200 min-h-[46px]"
              >
                <span>How It Works</span>
                <span className="material-symbols-outlined text-lg text-outline">schema</span>
              </button>
            </div>

            {/* Frictionless Zero-Auth Reassurance */}
            <div className="flex items-center justify-center gap-1.5 pt-space-md text-xs text-on-surface-variant flex-wrap text-center">
              <span className="material-symbols-outlined text-base text-primary">verified_user</span>
              <span>Free Public Demo • No sign-up or login required • Sign in with Demo Manager account for protected RBAC</span>
            </div>
          </div>
        </section>

        {/* 2. HOW KNOTRAIL WORKS */}
        <section id="how-it-works" className="w-full px-gutter scroll-mt-8">
          <div className="bg-surface-container-low rounded-3xl p-6 sm:p-space-xl border border-outline-variant/30">
            <div className="text-center max-w-2xl mx-auto mb-space-xl">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Simple 4-Step Process
              </span>
              <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-display-lg text-on-surface tracking-tight mt-1 font-bold">
                How KnoTrail Works
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                A simple, clear workflow to turn scattered project files into a verified handover document.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 1</span>
                    <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface mb-2 h-7 flex items-center">
                    Upload Sources
                  </h3>
                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                    Upload your project documents—specifications, architecture notes, and runbooks in PDF, Markdown, or text format.
                  </p>
                </div>
                <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-outline">
                  Supports PDF, TXT, and Markdown files
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 2</span>
                    <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface mb-2 h-7 flex items-center">
                    Analyse Information
                  </h3>
                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                    KnoTrail reads your documents to find important decisions, pending tasks, risks, and who is responsible.
                  </p>
                </div>
                <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-outline">
                  Powered by Google Gemini 2.5 Flash
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 3</span>
                    <div className="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">rule</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface mb-2 h-7 flex items-center">
                    Review Findings
                  </h3>
                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                    Team members review each finding, resolve differences between documents, and approve verified items before anything is final.
                  </p>
                </div>
                <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-outline">
                  Human review before anything is final
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-xs flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 4</span>
                    <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </div>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface mb-2 h-7 flex items-center">
                    Generate Handover
                  </h3>
                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                    Create a clean, complete handover document ready to share online, download as Markdown or JSON, or print.
                  </p>
                </div>
                <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-outline">
                  Export as Markdown, JSON, or printable document
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ROUND 3 IMPROVEMENTS (WHAT'S NEW IN KNOTRAIL?) */}
        <section className="w-full px-gutter">
          <div className="text-center max-w-2xl mx-auto mb-space-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-[15px]">flag</span>
              <span>Round 3 Improvements</span>
            </div>
            <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface tracking-tight font-bold">
              What&apos;s New in KnoTrail?
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Major improvements being developed for Round 3, the Final Round of CodersInPune Hackathon 2026.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
            {/* Card 1: GitHub Integration */}
            <div className="bg-surface-container-lowest p-6 sm:p-7 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full hover:border-primary/40 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center group-hover:bg-primary-container transition-colors">
                    <span className="material-symbols-outlined text-[22px]">merge_type</span>
                  </div>
                  <span className="text-[11px] font-semibold font-mono uppercase bg-surface-container px-2.5 py-0.5 rounded-full text-outline">
                    Coming in Final Build
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase text-secondary tracking-wider block mb-1">
                  GitHub Integration
                </span>
                <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface mb-2 min-h-[56px] flex items-center">
                  Connect Your GitHub Projects
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[44px]">
                  Connect your GitHub repository and let KnoTrail understand your project through commits, pull requests and issues.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Read project activity.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Find completed and pending work.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Connect findings to their original sources.</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                <span>Status: In Development</span>
                <span className="font-medium text-secondary">Round 3 Feature</span>
              </div>
            </div>

            {/* Card 2: Role-Based Access */}
            <div className="bg-surface-container-lowest p-6 sm:p-7 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full hover:border-primary/40 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center group-hover:bg-secondary-container transition-colors">
                    <span className="material-symbols-outlined text-[22px]">badge</span>
                  </div>
                  <span className="text-[11px] font-semibold font-mono uppercase bg-surface-container px-2.5 py-0.5 rounded-full text-outline">
                    Coming in Final Build
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase text-secondary tracking-wider block mb-1">
                  Role-Based Access
                </span>
                <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface mb-2 min-h-[56px] flex items-center">
                  The Right Access for Everyone
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[44px]">
                  Give Managers, Developers and External members the right level of access to project information.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Separate user roles.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Control who can view and review information.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Protect private project details.</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                <span>Status: In Development</span>
                <span className="font-medium text-secondary">Round 3 Feature</span>
              </div>
            </div>

            {/* Card 3: Continuous Knowledge Updates */}
            <div className="bg-surface-container-lowest p-6 sm:p-7 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full hover:border-primary/40 transition-all duration-200 group">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center group-hover:bg-primary-container transition-colors">
                    <span className="material-symbols-outlined text-[22px]">update</span>
                  </div>
                  <span className="text-[11px] font-semibold font-mono uppercase bg-surface-container px-2.5 py-0.5 rounded-full text-outline">
                    Coming in Final Build
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase text-secondary tracking-wider block mb-1">
                  Continuous Updates
                </span>
                <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface mb-2 min-h-[56px] flex items-center">
                  Keep Project Knowledge Updated
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[44px]">
                  KnoTrail detects changes in project sources and helps teams update outdated information.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Detect source changes.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Find affected project information.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>Review updated findings before approval.</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                <span>Status: In Development</span>
                <span className="font-medium text-secondary">Round 3 Feature</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. WHY KNOTRAIL? */}
        <section className="w-full px-gutter">
          <div className="text-center max-w-2xl mx-auto mb-space-lg">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
              Built for Teams
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface tracking-tight font-bold mt-1">
              Why KnoTrail?
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Handing over a software project shouldn&apos;t mean lost context or endless meetings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {/* Benefit 1 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">folder_special</span>
                </div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1 h-7 flex items-center">
                  Knowledge in One Place
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                  No more searching across chat apps, emails, and random folders. Bring all project context together in a clean workspace.
                </p>
              </div>
              <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-primary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>One shared source of truth</span>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">checklist</span>
                </div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1 h-7 flex items-center">
                  Find Decisions &amp; Tasks
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                  Easily see what decisions were made, why they were made, and what tasks still need to be completed.
                </p>
              </div>
              <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Track decisions and owners</span>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">fact_check</span>
                </div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1 h-7 flex items-center">
                  Check Original Sources
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                  Every claim points directly to quotes and line numbers in your original files, so you can always verify the truth.
                </p>
              </div>
              <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-primary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Exact quotes &amp; page numbers</span>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-secondary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">sync_alt</span>
                </div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1 h-7 flex items-center">
                  Make Handovers Easier
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed min-h-[64px]">
                  New team members can start contributing quickly without waiting weeks for someone to explain the system.
                </p>
              </div>
              <div className="mt-auto pt-3 border-t border-outline-variant/20 text-xs text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Smooth team transitions</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FINAL CALL-TO-ACTION */}
        <section className="w-full px-gutter">
          <div className="bg-surface-container-low rounded-3xl p-6 sm:p-space-2xl border border-outline-variant/30 text-center max-w-4xl mx-auto flex flex-col items-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mb-space-sm shadow-xs">
              <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
            </div>

            <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
              Ready to Explore KnoTrail?
            </h2>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mt-2 leading-relaxed">
              Explore the working platform right now. Upload your documents, find key insights with Google Gemini AI, and review real project handovers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-space-lg w-full sm:w-auto">
              <button
                onClick={() => setActiveView('workspace')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-inverse-surface text-on-primary rounded-xl shadow-sm font-headline-sm text-sm font-semibold transition-all min-h-[46px]"
              >
                <span>Open Project Workspace</span>
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setActiveView('workspace');
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-xl font-headline-sm text-sm border border-outline-variant/30 transition-all min-h-[46px]"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  {isAuthenticated ? 'verified_user' : 'login'}
                </span>
                <span>{isAuthenticated ? 'Manager Logged In' : 'Sign In as Manager'}</span>
              </button>
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-xl font-headline-sm text-sm border border-outline-variant/30 transition-all min-h-[46px]"
              >
                <span>Upload Documents</span>
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
              </button>
            </div>

            <p className="text-xs text-outline mt-space-md">
              CodersInPune Hackathon 2026 • Final Round Submission • Team Deploy_or_Die
            </p>
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
