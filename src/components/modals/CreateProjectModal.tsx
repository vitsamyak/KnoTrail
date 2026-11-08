'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const { createProject, isSaving } = useProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Software Engineering');
  const [targetExitDate, setTargetExitDate] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadRole, setLeadRole] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setCategory('Software Engineering');
      setTargetExitDate('');
      setLeadName('');
      setLeadRole('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a project name.');
      return;
    }

    try {
      setError(null);
      await createProject({
        name: trimmedName,
        description: description.trim(),
        category,
        targetExitDate: targetExitDate.trim() || 'Flexible',
        leadName: leadName.trim() || 'Project Contributor',
        leadRole: leadRole.trim() || 'Handover Lead',
      });
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create project');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-space-xl flex flex-col gap-space-md animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-outline-variant/20 pb-space-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">create_new_folder</span>
            </div>
            <div>
              <h2 id="create-project-title" className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Create New Project
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Set up a clean project workspace to organize documents and generate verified handovers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-space-sm rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm text-xs">
          <div>
            <label htmlFor="project-name" className="block font-semibold text-on-surface mb-1">
              Project Name <span className="text-error">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. EduTrack Platform or Billing Migration"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors text-on-surface placeholder:text-outline"
            />
          </div>

          <div>
            <label htmlFor="project-desc" className="block font-semibold text-on-surface mb-1">
              Project Description
            </label>
            <textarea
              id="project-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of project purpose, operational scope, and key deliverables..."
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors text-on-surface placeholder:text-outline resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div>
              <label htmlFor="project-category" className="block font-semibold text-on-surface mb-1">
                Domain / Category
              </label>
              <select
                id="project-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors text-on-surface"
              >
                <option value="Software Engineering">Software Engineering</option>
                <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                <option value="Product Operations">Product Operations</option>
                <option value="Data Pipeline">Data Pipeline</option>
                <option value="Security & Compliance">Security & Compliance</option>
                <option value="General Handover">General Handover</option>
              </select>
            </div>

            <div>
              <label htmlFor="project-exit-date" className="block font-semibold text-on-surface mb-1">
                Target Handover Date
              </label>
              <input
                id="project-exit-date"
                type="text"
                value={targetExitDate}
                onChange={(e) => setTargetExitDate(e.target.value)}
                placeholder="e.g. End of Month or Q4 2026"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors text-on-surface placeholder:text-outline"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-1">
            <div>
              <label htmlFor="lead-name" className="block font-semibold text-on-surface mb-1">
                Handover Lead Name
              </label>
              <input
                id="lead-name"
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. Samyak Gedam"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors text-on-surface placeholder:text-outline"
              />
            </div>

            <div>
              <label htmlFor="lead-role" className="block font-semibold text-on-surface mb-1">
                Lead Role
              </label>
              <input
                id="lead-role"
                type="text"
                value={leadRole}
                onChange={(e) => setLeadRole(e.target.value)}
                placeholder="e.g. Technical Lead"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors text-on-surface placeholder:text-outline"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-space-xs pt-space-md border-t border-outline-variant/20 mt-space-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              <span>{isSaving ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

