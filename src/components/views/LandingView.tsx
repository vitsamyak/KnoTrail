'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';

export function LandingView() {
  const { setActiveView } = useProject();
  const [samyakImgFailed, setSamyakImgFailed] = useState(false);
  const [sanshreyImgFailed, setSanshreyImgFailed] = useState(false);

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-3 sm:px-space-md py-space-md bg-background text-on-surface antialiased">
      <div className="flex flex-col w-full max-w-7xl mx-auto py-space-md sm:py-space-xl">
        {/* Top Global Announcement Pill */}
        <div className="w-full px-2 sm:px-gutter mb-space-lg sm:mb-space-xl flex justify-center">
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
        <section className="w-full px-2 sm:px-gutter my-space-sm sm:my-space-lg mb-space-xl sm:mb-space-2xl">
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
              <span>Free to try • No sign-up or login required • Works immediately in your browser</span>
            </div>
          </div>
        </section>

        {/* 2. HOW KNOTRAIL WORKS */}
        <section id="how-it-works" className="w-full px-gutter mb-space-2xl scroll-mt-8">
          <div className="bg-surface-container-low rounded-2xl p-4 sm:p-space-xl border border-outline-variant/30">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 1</span>
                    <span className="material-symbols-outlined text-primary text-[22px]">upload_file</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">
                    Upload Sources
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Upload your project documents—specifications, architecture notes, and runbooks in PDF, Markdown, or text format.
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
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">
                    Analyse Information
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    KnoTrail reads your documents to find important decisions, pending tasks, risks, and who is responsible, linking each item to its original source.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/20 text-xs text-outline">
                  Powered by Google Gemini 2.5 Flash
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 3</span>
                    <span className="material-symbols-outlined text-secondary text-[22px]">rule</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">
                    Review Findings
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Team members review each finding, resolve differences between documents, and approve verified items before anything is final.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/20 text-xs text-outline">
                  Human review before anything is final
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/20 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="font-label-sm text-label-sm text-outline font-mono">STEP 4</span>
                    <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-semibold">
                    Generate Handover
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Create a clean, complete handover document ready to share online, download as Markdown or JSON, or print.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-outline-variant/20 text-xs text-outline">
                  Export as Markdown, JSON, or print-ready view
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ROUND 3 IMPROVEMENTS (WHAT'S NEW IN KNOTRAIL?) */}
        <section className="w-full px-gutter mb-space-2xl">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Card 1: GitHub Integration */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between relative group hover:border-primary/40 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">merge_type</span>
                  </div>
                  <span className="text-[11px] font-semibold font-mono uppercase bg-surface-container px-2.5 py-0.5 rounded-full text-outline">
                    Coming in Final Build
                  </span>
                </div>
                <span className="text-[11px] font-semibold uppercase text-secondary tracking-wider block mb-1">
                  GitHub Integration
                </span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                  Connect Your GitHub Projects
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Connect your GitHub repository and let KnoTrail understand your project through commits, pull requests and issues.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Read project activity.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Find completed and pending work.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Connect findings to their original sources.</span>
                  </div>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                <span>Status: In Development</span>
                <span className="font-medium text-secondary">Round 3 Feature</span>
              </div>
            </div>

            {/* Card 2: Role-Based Access */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between relative group hover:border-primary/40 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">badge</span>
                  </div>
                  <span className="text-[11px] font-semibold font-mono uppercase bg-surface-container px-2.5 py-0.5 rounded-full text-outline">
                    Coming in Final Build
                  </span>
                </div>
                <span className="text-[11px] font-semibold uppercase text-secondary tracking-wider block mb-1">
                  Role-Based Access
                </span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                  The Right Access for Everyone
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Give Managers, Developers and External members the right level of access to project information.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Separate user roles.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Control who can view and review information.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Protect private project details.</span>
                  </div>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                <span>Status: In Development</span>
                <span className="font-medium text-secondary">Round 3 Feature</span>
              </div>
            </div>

            {/* Card 3: Continuous Knowledge Updates */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between relative group hover:border-primary/40 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">update</span>
                  </div>
                  <span className="text-[11px] font-semibold font-mono uppercase bg-surface-container px-2.5 py-0.5 rounded-full text-outline">
                    Coming in Final Build
                  </span>
                </div>
                <span className="text-[11px] font-semibold uppercase text-secondary tracking-wider block mb-1">
                  Continuous Updates
                </span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                  Keep Project Knowledge Updated
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  KnoTrail detects changes in project sources and helps teams update outdated information.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Detect source changes.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Find affected project information.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0">check</span>
                    <span>Review updated findings before approval.</span>
                  </div>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
                <span>Status: In Development</span>
                <span className="font-medium text-secondary">Round 3 Feature</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. WHY KNOTRAIL? */}
        <section className="w-full px-gutter mb-space-2xl">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/* Benefit 1 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">folder_special</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-semibold">
                  Keep Knowledge in One Place
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  No more searching across chat apps, emails, and random folders. Bring all project context together in a clean workspace.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 text-xs text-primary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>One shared source of truth</span>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">checklist</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-semibold">
                  Find Decisions &amp; Tasks
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Easily see what decisions were made, why they were made, and what tasks still need to be completed.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 text-xs text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Track decisions and owners</span>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">fact_check</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-semibold">
                  Check Original Sources
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Every claim points directly to quotes and line numbers in your original files, so you can always verify the truth.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 text-xs text-primary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Exact quotes &amp; page numbers</span>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">sync_alt</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-semibold">
                  Make Handovers Easier
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  New team members can start contributing quickly without waiting weeks for someone to explain the system.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 text-xs text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Smooth team transitions</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. MEET THE TEAM / CONTRIBUTORS SECTION */}
        <section className="w-full px-gutter mb-space-2xl">
          <div className="text-center max-w-2xl mx-auto mb-space-lg">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
              Team Deploy_or_Die
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface tracking-tight font-bold mt-1">
              Meet the Team Behind KnoTrail
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
              Built with teamwork, curiosity and a shared goal of making project knowledge easier to manage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg max-w-4xl mx-auto">
            {/* Member 1: Samyak Gedam */}
            <div className="bg-surface-container-lowest p-space-xl rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-center sm:items-start gap-space-lg group">
              {/* Portrait / Designed Avatar Placeholder */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-xs group-hover:border-primary/60 transition-colors">
                  {!samyakImgFailed && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src="/team/samyak-gedam.jpg"
                      alt="Samyak Gedam"
                      className="w-full h-full object-cover"
                      onError={() => setSamyakImgFailed(true)}
                    />
                  )}
                  {samyakImgFailed && (
                    <div className="flex flex-col items-center justify-center text-primary select-none">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">SG</span>
                      <span className="text-[10px] text-outline mt-0.5 font-medium">Samyak</span>
                    </div>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xs"
                  title="Team Leader"
                >
                  <span className="material-symbols-outlined text-[16px]">stars</span>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="flex flex-col text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h3 className="font-headline-sm text-xl font-bold text-on-surface">
                    Samyak Gedam
                  </h3>
                  <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container self-center sm:self-auto">
                    Team Leader
                  </span>
                </div>

                <p className="font-label-md text-label-md text-primary font-semibold">
                  Frontend Development &amp; Product Design
                </p>

                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                  Crafting the user experience, component architecture, and responsive layouts across all 8 screens of KnoTrail.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                  <a
                    href="mailto:samyakgedam69@gmail.com"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors font-medium"
                    title="Send email to Samyak Gedam"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
                    <span>samyakgedam69@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Member 2: Sanshrey Sanagar */}
            <div className="bg-surface-container-lowest p-space-xl rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-center sm:items-start gap-space-lg group">
              {/* Portrait / Designed Avatar Placeholder */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-xs group-hover:border-primary/60 transition-colors">
                  {!sanshreyImgFailed && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src="/team/sanshrey-sanagar.jpg"
                      alt="Sanshrey Sanagar"
                      className="w-full h-full object-cover"
                      onError={() => setSanshreyImgFailed(true)}
                    />
                  )}
                  {sanshreyImgFailed && (
                    <div className="flex flex-col items-center justify-center text-primary select-none">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">SS</span>
                      <span className="text-[10px] text-outline mt-0.5 font-medium">Sanshrey</span>
                    </div>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs"
                  title="Core Engineer"
                >
                  <span className="material-symbols-outlined text-[16px]">code</span>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="flex flex-col text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h3 className="font-headline-sm text-xl font-bold text-on-surface">
                    Sanshrey Sanagar
                  </h3>
                  <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-surface-container text-outline self-center sm:self-auto font-mono">
                    Core Engineer
                  </span>
                </div>

                <p className="font-label-md text-label-md text-primary font-semibold">
                  Backend Development &amp; Database Integration
                </p>

                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                  Building the standalone Express backend, PostgreSQL database schemas on Supabase, and cloud deployment pipelines on Render.
                </p>

                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                  <a
                    href="mailto:sanshrey7273@gmail.com"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors font-medium"
                    title="Send email to Sanshrey Sanagar"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
                    <span>sanshrey7273@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FINAL CALL-TO-ACTION */}
        <section className="w-full px-gutter mb-space-xl">
          <div className="bg-surface-container-low rounded-2xl p-6 sm:p-space-2xl border border-outline-variant/30 text-center max-w-4xl mx-auto flex flex-col items-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-space-sm">
              <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
            </div>

            <h2 className="font-display-lg text-2xl sm:text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
              Ready to Explore KnoTrail?
            </h2>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mt-2 leading-relaxed">
              Explore the working platform right now. Upload your documents, find key insights with Google Gemini AI, and review real project handovers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-space-sm mt-space-lg w-full sm:w-auto">
              <button
                onClick={() => setActiveView('workspace')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-xl py-space-sm bg-primary hover:bg-inverse-surface text-on-primary rounded-lg shadow-sm font-headline-sm text-headline-sm font-semibold transition-all min-h-[44px]"
              >
                <span>Open Project Workspace</span>
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
              </button>
              <button
                onClick={() => setActiveView('sources')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-xl py-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-lg font-headline-sm text-headline-sm border border-outline-variant/30 transition-all min-h-[44px]"
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
