import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';
import { requireWorkspaceAccess, requireRole } from '../middleware/roleAuth.ts';
import { redactHandoverDocument } from '../../src/server/security/redactor.ts';
import {
  checkHandoverBlockStatus,
  generateHandoverMarkdown,
  generateHandoverJSON,
  exportHandoverMarkdown,
  exportHandoverJson,
  generatePrintableHtml,
} from '../../src/lib/handoverFilter.ts';

export const handoversRouter = Router();

/**
 * GET /api/handovers?workspaceId=...
 * Retrieves current handover, history, block status, and representations.
 */
handoversRouter.get('/', requireWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    const blockStatus = checkHandoverBlockStatus(
      project.findings,
      project.handoverCertified,
      project.conflicts
    );
    let currentHandover = await storage.getHandover(workspaceId);
    let handovers = await storage.getHandoverHistory(workspaceId);

    if (req.workspaceAuth?.role === 'EXTERNAL') {
      if (currentHandover) currentHandover = redactHandoverDocument(currentHandover);
      handovers = handovers.map(redactHandoverDocument);
    }

    const markdown = currentHandover
      ? exportHandoverMarkdown(currentHandover)
      : generateHandoverMarkdown(project);
    const json = currentHandover
      ? currentHandover
      : generateHandoverJSON(project);

    res.status(200).json({
      workspaceId,
      project,
      blockStatus,
      currentHandover,
      handovers,
      markdown,
      json,
      status: 'success',
    });
  } catch (error: any) {
    console.error('API Error in GET /api/handovers:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/handovers/generate
 * Generates and saves a formal 12-section handover package.
 * Requires MANAGER or DEVELOPER permissions.
 */
handoversRouter.post('/generate', requireWorkspaceAccess, requireRole(['MANAGER', 'DEVELOPER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { signerName, version, regenerate } = req.body || {};

    const storage = getStorage();
    const result = await storage.generateAndSaveHandover(workspaceId, signerName, {
      version,
      regenerate: Boolean(regenerate),
    });

    const markdown = exportHandoverMarkdown(result.handover);
    const json = exportHandoverJson(result.handover);

    res.status(200).json({
      project: result.project,
      handover: result.handover,
      markdown,
      json,
      status: 'generated',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/handovers/generate:', error?.message || error);
    res.status(400).json({ error: error?.message || 'Handover generation failed' });
  }
});

/**
 * POST /api/handovers/certify
 * Formally certifies handover after validating all Phase A and F gates.
 * Safeguard: ONLY Managers can certify handovers.
 */
handoversRouter.post('/certify', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { signerName } = req.body || {};

    const storage = getStorage();
    const certifiedProject = await storage.certifyHandover(
      workspaceId,
      signerName || req.workspaceAuth?.email || 'Project Manager'
    );

    const handover = certifiedProject.currentHandover;
    const markdown = generateHandoverMarkdown(certifiedProject);
    const json = generateHandoverJSON(certifiedProject);

    res.status(200).json({
      project: certifiedProject,
      handover,
      markdown,
      json,
      status: 'certified',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/handovers/certify:', error?.message || error);
    res.status(400).json({ error: error?.message || 'Handover certification failed' });
  }
});

/**
 * GET /api/handovers/export?workspaceId=...&format=...&handoverId=...
 * Exports certified handover in Markdown, JSON, or printable HTML format.
 * Safeguard: Redacts confidential evidence citations when accessed by EXTERNAL role.
 */
handoversRouter.get('/export', requireWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const format = (req.query.format as string) || 'markdown';
    const handoverId = (req.query.handoverId as string) || undefined;

    const storage = getStorage();
    let handover = await storage.getHandover(workspaceId, handoverId);

    if (!handover) {
      res.status(404).json({ error: 'No certified handover found. Generate a handover first.' });
      return;
    }

    // Redact for EXTERNAL role
    if (req.workspaceAuth?.role === 'EXTERNAL') {
      handover = redactHandoverDocument(handover);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="KnoTrail-Handover-${handover.metadata.projectCode}.json"`
      );
      res.status(200).send(exportHandoverJson(handover));
      return;
    }

    if (format === 'html' || format === 'pdf') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(generatePrintableHtml(handover));
      return;
    }

    // Default: markdown
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="KnoTrail-Handover-${handover.metadata.projectCode}.md"`
    );
    res.status(200).send(exportHandoverMarkdown(handover));
  } catch (error: any) {
    console.error('API Error in GET /api/handovers/export:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Export failed' });
  }
});

/**
 * POST /api/handovers/share
 * Generates an active, high-entropy public share token for a certified handover.
 * Safeguard: ONLY Managers can generate public share links.
 */
handoversRouter.post('/share', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { handoverId } = req.body || {};

    const storage = getStorage();
    const shareRecord = await storage.createShareToken(workspaceId, handoverId);

    res.status(200).json({
      shareRecord,
      shareUrl: `/share/${shareRecord.token}`,
      status: 'created',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/handovers/share:', error?.message || error);
    res.status(400).json({ error: error?.message || 'Failed to create share token' });
  }
});

/**
 * DELETE /api/handovers/share
 * Revokes a public share link immediately.
 * Safeguard: ONLY Managers can revoke public share links.
 */
handoversRouter.delete('/share', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { token } = req.body || {};

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const storage = getStorage();
    await storage.revokeShareToken(workspaceId, token);

    res.status(200).json({ status: 'revoked' });
  } catch (error: any) {
    console.error('API Error in DELETE /api/handovers/share:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to revoke share token' });
  }
});

/**
 * GET /api/handovers/share/:token
 * Public read-only endpoint for retrieving shared handover without authentication.
 * Safeguard: Independently enforces clearance-based redaction so CONFIDENTIAL data is never leaked.
 */
handoversRouter.get('/share/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    if (!token) {
      res.status(400).json({ error: 'Share token is required' });
      return;
    }

    const storage = getStorage();
    const { handover, projectName } = await storage.getSharedHandover(token);

    // Safeguard: Redact all confidential evidence from public shares
    const sanitizedHandover = redactHandoverDocument(handover);
    const markdown = exportHandoverMarkdown(sanitizedHandover);

    res.status(200).json({
      handover: sanitizedHandover,
      projectName,
      markdown,
      status: 'success',
    });
  } catch (error: any) {
    console.error('API Error in GET /api/handovers/share/:token:', error?.message || error);
    const isRevoked = error?.message?.includes('revoked');
    const status = isRevoked ? 403 : 404;
    res.status(status).json({
      error: error?.message || 'Handover not found or link has expired',
    });
  }
});
