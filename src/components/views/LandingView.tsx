'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

export function LandingView() {
  const { setActiveView } = useProject();

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-space-md bg-background text-on-surface antialiased">
      <div className="flex flex-col w-full max-w-7xl mx-auto py-space-xl">
        {/* Top Global Announcement Pill */}
        <div className="w-full px-gutter mb-space-xl flex justify-center">
          <div className="inline-flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-2xs rounded-full shadow-sm border border-outline-variant/30">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-secondary tracking-wide uppercase font-semibold">
              Deployed by Team Deploy_or_Die
            </span>
            <span className="font-body-sm text-body-sm text-outline">•</span>
            <span className="font-label-sm text-label-sm text-primary font-medium">
              100% Free Public Demo (Zero Auth)
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="w-full px-gutter mb-space-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 flex flex-col space-y-space-md pr-0 lg:pr-space-lg">
              <div className="space-y-space-xs">
                <p className="font-label-md text-label-md text-secondary tracking-wider uppercase font-semibold">
                  Project Knowledge Continuity
                </p>
                <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight leading-tight">
                  Never Lose the Knowledge Behind Your Projects.
                </h1>
              </div>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                KnoTrail turns scattered project information into clear, evidence-backed knowledge handovers when engineers and key contributors transition.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-primary hover:bg-inverse-surface text-on-primary rounded-lg shadow-sm transition-all duration-200 active:scale-95 group"
                  id="cta-explore"
                >
                  <span className="font-headline-sm text-headline-sm font-semibold">Explore Demo</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm border border-outline-variant/30 transition-all duration-200"
                >
                  <span className="font-headline-sm text-headline-sm">How It Works</span>
                  <span className="material-symbols-outlined text-lg text-outline">schema</span>
                </button>
              </div>

              {/* Zero-Auth Frictionless Reassurance */}
              <div className="flex items-center gap-space-xs pt-space-2xs">
                <span className="material-symbols-outlined text-base text-primary">verified_user</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  No sign-up, registration, or credit card required. Jump straight into the interactive workspace.
                </span>
              </div>
            </div>

            {/* Right Column: Code/Artifact Live Inspection Mockup */}
            <div className="lg:col-span-5 relative mt-space-lg lg:mt-0">
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-md border border-outline-variant/40 relative overflow-hidden">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-space-2xs rounded-lg border border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-3 h-3 rounded-full bg-error"></span>
                    <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant ml-space-2xs font-mono">
                      session-log_handover_v2.kt
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary font-medium bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant/30">
                    Live Stream
                  </span>
                </div>

                {/* Simulated Findings Stream */}
                <div className="space-y-space-xs font-mono text-body-sm">
                  <div className="p-space-xs bg-surface-container-low rounded-lg flex items-start gap-space-xs border border-outline-variant/20">
                    <span className="material-symbols-outlined text-primary text-base mt-0.5">commit</span>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface font-semibold">
                        Commit: 9f12ab7 — Auth Architecture Switch
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant font-sans text-xs">
                        Auth0 token exchange swapped for internal JWT service.
                      </p>
                    </div>
                  </div>
                  <div className="p-space-xs bg-surface-container-low rounded-lg flex items-start gap-space-xs border border-outline-variant/20">
                    <span className="material-symbols-outlined text-secondary text-base mt-0.5">forum</span>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface font-semibold">
                        PR Discussion: #142 (Merged 8d ago)
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant font-sans text-xs">
                        &quot;DB migrations require manual rollback key in production.&quot;
                      </p>
                    </div>
                  </div>
                  <div className="p-space-xs bg-surface-container rounded-lg flex items-center justify-between border border-outline-variant/20">
                    <div className="flex items-center gap-space-2xs">
                      <span className="material-symbols-outlined text-tertiary text-base">warning</span>
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold font-sans">
                        Implicit Assumption Detected
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full font-sans font-semibold">
                      Flagged for Review
                    </span>
                  </div>
                </div>

                {/* Synthetic Metric Badge */}
                <div className="mt-space-md pt-space-xs border-t border-outline-variant/30 flex items-center justify-between text-xs text-outline">
                  <div className="flex items-center gap-1 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>142 Citations Indexed</span>
                  </div>
                  <span className="font-mono text-primary font-medium">0 Ungrounded Claims</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Part Comparison Grid: The Knowledge Loss Problem */}
        <section className="w-full px-gutter mb-space-2xl">
          <div className="text-center max-w-2xl mx-auto mb-space-lg">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
              The Critical Gap
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
              Why Project Handovers Fail Today
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              When key team members depart, critical architectural rationale and operational risks vanish into thin air.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">scatter_plot</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Fragmented &amp; Stale Documentation
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Confluence wikis rot quickly. True decisions are buried in PR review comments, Slack threads, and uncommitted mental notes.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-error font-medium">
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Average 42% context lost</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">psychology_alt</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Ungrounded AI Hallucinations
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Generic LLMs summarize chat logs by inventing facts and assuming policies that do not match the actual codebase reality.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-tertiary font-medium">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>Unverified assumptions become bugs</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-primary/30 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none"></div>
              <div>
                <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center mb-space-sm">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  The KnoTrail Guarantee
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Every decision, task, and dependency is linked to verifiable Git commits, line numbers, and author timestamps. Sealed by human sign-off.
                </p>
              </div>
              <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-primary font-medium">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>100% Cryptographically Traceable</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works: 4-Stage Workflow */}
        <section id="how-it-works" className="w-full px-gutter mb-space-2xl scroll-mt-8">
          <div className="bg-surface-container-low rounded-2xl p-space-xl border border-outline-variant/30">
            <div className="text-center max-w-2xl mx-auto mb-space-xl">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Operating Cycle
              </span>
              <h2 className="font-display-lg text-display-lg text-on-surface tracking-tight mt-1">
                How KnoTrail Reconstructs Reality
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                An auditable, human-in-the-loop pipeline designed for zero knowledge loss.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm text-outline font-mono">01 / RECONSTRUCT</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Source Ingestion</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Parses git commits, PR discussions, Slack channels, and RFC notes across authorized systems.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm text-outline font-mono">02 / VERIFY</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Evidence Linking</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Attaches file coordinates and SHAs. Flags claims as VERIFIED, UNCERTAIN, CONFLICTING, or MISSING.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm text-outline font-mono">03 / REVIEW</span>
                  <span className="material-symbols-outlined text-secondary text-[20px]">rule</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Human Approval</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Mandatory human review where outgoing and incoming leads resolve conflicts and certify facts.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20 shadow-xs flex flex-col">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm text-outline font-mono">04 / HANDOVER</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">sync_alt</span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">Certified Dossier</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Produces a tamper-evident handover package exportable in Markdown, JSON, and PDF formats.
                </p>
              </div>
            </div>

            {/* Action Callout */}
            <div className="mt-space-xl text-center flex flex-col sm:flex-row items-center justify-center gap-space-sm">
              <button
                onClick={() => setActiveView('dashboard')}
                className="inline-flex items-center gap-2 px-space-xl py-space-sm bg-primary hover:bg-inverse-surface text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-md transition-all active:scale-95"
              >
                <span>Launch Interactive Demo: Project Titan</span>
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full px-gutter pt-space-lg border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-sm text-xs text-outline">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">KnoTrail</span>
            <span>•</span>
            <span>&quot;Knowledge Never Leaves a Trail Behind.&quot;</span>
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
