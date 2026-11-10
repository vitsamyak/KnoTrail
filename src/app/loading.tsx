import React from 'react';
import { KnowledgeTrailLoader } from '../components/ui/KnowledgeTrailLoader';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <KnowledgeTrailLoader
        variant="page"
        message="Preparing your workspace..."
        submessage="Connecting workspace sources and verifying knowledge integrity..."
        step={1}
      />
    </div>
  );
}

