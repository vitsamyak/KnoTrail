import React from 'react';
import { KnowledgeTrailLoader } from '../../../components/ui/KnowledgeTrailLoader';

export default function SharedHandoverLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <KnowledgeTrailLoader
        variant="page"
        message="Retrieving certified handover..."
        submessage="Loading verified operational state and human review records..."
        step={4}
      />
    </div>
  );
}

