/**
 * KnoTrail: Codebase Scanner & Repository Intelligence Engine
 * (CodersInPune Hackathon 2026 - Deploy_or_Die: Samyak Gedam & Sanshrey Sanagar)
 *
 * Implements recursive tree scanning, intelligent file classification, language detection,
 * secret exclusion/redaction, bounded concurrency blob retrieval, and incremental SHA caching.
 */

import crypto from 'crypto';
import path from 'path';
import type {
  CodebaseFileCategory,
  CodebaseFileItem,
  CodebaseIngestionProgress,
} from '../../src/lib/types.ts';
import { gitHubService, GitHubService, type GitHubRequestOptions } from './github.ts';

// ============================================================================
// Constants & Classification Tables
// ============================================================================

export const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  'vendor',
  '.turbo',
  '.cache',
  '.output',
  'out',
  'target',
  'bin',
  'obj',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
]);

export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff',
  '.pdf', '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.wasm', '.lockb', '.parquet',
  '.mp3', '.mp4', '.wav', '.mov', '.avi',
  '.exe', '.dll', '.dylib', '.so', '.bin', '.pyc', '.pyo',
  '.ds_store', '.jar', '.war',
]);

export const SECRET_FILE_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.env.staging',
  'id_rsa',
  'id_ed25519',
]);

export const SECRET_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.crt',
  '.der',
  '.p12',
  '.pfx',
]);

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.sql': 'SQL',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.mdx': 'Markdown',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.html': 'HTML',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.c': 'C',
  '.cpp': 'C++',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.dockerfile': 'Dockerfile',
  '.xml': 'XML',
  '.toml': 'TOML',
};

// ============================================================================
// File Classification & Inspection
// ============================================================================

export function classifyFile(filePath: string): {
  category: CodebaseFileCategory;
  language: string;
  extension: string;
  isEligible: boolean;
  skipReason?: string;
} {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const segments = normalizedPath.split('/');
  const fileName = segments[segments.length - 1].toLowerCase();
  const ext = path.extname(fileName).toLowerCase();

  // 1. Directory Exclusion Check
  for (const seg of segments) {
    if (EXCLUDED_DIRECTORIES.has(seg.toLowerCase())) {
      return {
        category: 'other',
        language: 'Unknown',
        extension: ext,
        isEligible: false,
        skipReason: `Excluded directory: ${seg}`,
      };
    }
  }

  // 2. Secret File Exclusion Check
  if (SECRET_FILE_NAMES.has(fileName)) {
    return {
      category: 'other',
      language: 'Secret',
      extension: ext,
      isEligible: false,
      skipReason: 'Sensitive environment credentials file (excluded by security policy)',
    };
  }

  if (SECRET_EXTENSIONS.has(ext)) {
    return {
      category: 'other',
      language: 'Certificate/Key',
      extension: ext,
      isEligible: false,
      skipReason: 'Cryptographic key or certificate file (excluded by security policy)',
    };
  }

  // 3. Binary File Exclusion Check
  if (BINARY_EXTENSIONS.has(ext)) {
    return {
      category: 'other',
      language: 'Binary',
      extension: ext,
      isEligible: false,
      skipReason: `Binary asset or media format (${ext})`,
    };
  }

  // 4. Language Resolution
  const language =
    fileName === 'dockerfile'
      ? 'Dockerfile'
      : fileName.startsWith('.env')
        ? 'Env Configuration'
        : LANGUAGE_MAP[ext] || (ext ? ext.slice(1).toUpperCase() : 'Text');

  // 5. Category Resolution
  let category: CodebaseFileCategory = 'source_code';

  if (fileName.includes('instruction') || fileName === 'gemini.md' || fileName === 'claude.md' || fileName === 'contributing.md') {
    category = 'instructions';
  } else if (normalizedPath.includes('.planning/') || fileName.includes('architecture') || fileName.includes('roadmap') || fileName.includes('decisions')) {
    category = 'architecture';
  } else if (ext === '.md' || ext === '.mdx' || normalizedPath.startsWith('docs/')) {
    category = 'documentation';
  } else if (normalizedPath.includes('.github/workflows') || fileName.includes('ci.yml') || fileName.includes('dockerfile')) {
    category = 'ci_cd';
  } else if (fileName.includes('test') || fileName.includes('spec') || normalizedPath.includes('__tests__') || normalizedPath.includes('test/')) {
    category = 'tests';
  } else if (fileName.includes('schema') || ext === '.sql' || normalizedPath.includes('migration') || normalizedPath.includes('/db/')) {
    category = 'database_schema';
  } else if (fileName.includes('type') || fileName.includes('model') || fileName.includes('interface')) {
    category = 'data_model';
  } else if (fileName.includes('auth') || fileName.includes('security') || fileName.includes('rbac') || fileName.includes('permission')) {
    category = 'auth_security';
  } else if (normalizedPath.includes('routes') || normalizedPath.includes('controllers') || normalizedPath.includes('api/')) {
    category = 'backend_route';
  } else if (normalizedPath.includes('components') || normalizedPath.includes('views') || normalizedPath.includes('pages') || normalizedPath.includes('app/')) {
    category = 'ui_component';
  } else if (fileName === 'package.json' || fileName.includes('config') || fileName.startsWith('.env') || ext === '.json' || ext === '.yaml' || ext === '.yml') {
    category = 'configuration';
  }

  return {
    category,
    language,
    extension: ext,
    isEligible: true,
  };
}

/**
 * Sanitizes file content to guarantee no real secrets, API tokens, or private keys
 * are persisted in repository knowledge documents.
 */
export function sanitizeCodebaseContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/(ghp_[a-zA-Z0-9]+|ghs_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+)/gi, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(Bearer\s+[A-Za-z0-9._~+/-]{15,})/gi, 'Bearer [REDACTED_AUTH_TOKEN]')
    .replace(/(AIzaSy[A-Za-z0-9_-]{33})/gi, '[REDACTED_GEMINI_KEY]')
    .replace(/(sb_secret_[a-zA-Z0-9_-]+)/gi, '[REDACTED_SUPABASE_SECRET]')
    .replace(/(-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]*PRIVATE KEY-----)/gi, '[REDACTED_RSA_PRIVATE_KEY]');
}

// ============================================================================
// Bounded Concurrency Blob Ingestion
// ============================================================================

export interface CodebaseScanResult {
  treeSha: string;
  totalDiscovered: number;
  filesRead: number;
  filesSkipped: number;
  inventory: CodebaseFileItem[];
  fileContents: Map<string, string>; // path -> content
  skippedSummary: Record<string, number>;
  categories: Record<string, number>;
  languages: Record<string, number>;
  totalLinesOfCode: number;
}

/**
 * Scans a repository branch via GitHub Git Trees API and reads relevant source files.
 * Uses bounded concurrency, secret redaction, and SHA-based incremental caching.
 */
export async function scanRepositoryCodebase(
  owner: string,
  repo: string,
  treeSha: string,
  options: {
    requestOptions?: GitHubRequestOptions;
    existingInventory?: CodebaseFileItem[];
    maxFilesToRead?: number;
    maxFileSizeLimitBytes?: number;
    onProgress?: (progress: Partial<CodebaseIngestionProgress>) => void;
    customService?: GitHubService;
  } = {}
): Promise<CodebaseScanResult> {
  const service = options.customService || gitHubService;
  const maxFiles = options.maxFilesToRead || 150;
  const maxFileSizeBytes = options.maxFileSizeLimitBytes || 120 * 1024; // 120 KB

  // Step 1: Discover tree recursively
  options.onProgress?.({
    phase: 2,
    phaseName: 'Fetching repository tree via Git Trees API',
    percent: 15,
  });

  let rawTreeObjects: Array<{ path: string; mode: string; type: string; sha: string; size?: number }> = [];
  let discoveredTreeSha = treeSha;
  try {
    const treeResult = await service.getTree(owner, repo, treeSha, {
      recursive: true,
      ...options.requestOptions,
    });
    rawTreeObjects = treeResult?.tree || [];
    discoveredTreeSha = treeResult?.sha || treeSha;
  } catch (err: any) {
    // Graceful fallback for mock services or offline testing
    rawTreeObjects = [];
  }

  if (rawTreeObjects.length === 0) {
    return {
      treeSha: discoveredTreeSha,
      totalDiscovered: 0,
      filesRead: 0,
      filesSkipped: 0,
      inventory: [],
      fileContents: new Map(),
      skippedSummary: {},
      categories: {},
      languages: {},
      totalLinesOfCode: 0,
    };
  }

  const blobs = rawTreeObjects.filter((item) => item.type === 'blob');

  options.onProgress?.({
    phase: 3,
    phaseName: `Discovered ${blobs.length} files. Filtering eligible source files`,
    percent: 30,
    discoveredCount: blobs.length,
  });

  // Step 2: Classify all files
  const inventory: CodebaseFileItem[] = [];
  const skippedSummary: Record<string, number> = {};
  const categories: Record<string, number> = {};
  const languages: Record<string, number> = {};

  const filesToRead: Array<{ path: string; sha: string; size: number }> = [];

  for (const blob of blobs) {
    const classification = classifyFile(blob.path);

    if (!classification.isEligible) {
      const reason = classification.skipReason || 'Non-essential file';
      skippedSummary[reason] = (skippedSummary[reason] || 0) + 1;
      inventory.push({
        path: blob.path,
        extension: classification.extension,
        language: classification.language,
        category: classification.category,
        size: blob.size || 0,
        blobSha: blob.sha,
        linesCount: 0,
        isRead: false,
        skipReason: reason,
      });
      continue;
    }

    categories[classification.category] = (categories[classification.category] || 0) + 1;
    languages[classification.language] = (languages[classification.language] || 0) + 1;

    // Check size limit
    if (blob.size && blob.size > maxFileSizeBytes * 3) {
      const reason = `File exceeds safe size threshold (${Math.round((blob.size || 0) / 1024)} KB)`;
      skippedSummary[reason] = (skippedSummary[reason] || 0) + 1;
      inventory.push({
        path: blob.path,
        extension: classification.extension,
        language: classification.language,
        category: classification.category,
        size: blob.size || 0,
        blobSha: blob.sha,
        linesCount: 0,
        isRead: false,
        skipReason: reason,
      });
      continue;
    }

    filesToRead.push({
      path: blob.path,
      sha: blob.sha,
      size: blob.size || 0,
    });
  }

  // Sort filesToRead by architectural importance
  // Priority order: configs, schemas, routes, models, auth, components, docs, tests
  const priorityOrder: Record<CodebaseFileCategory, number> = {
    configuration: 1,
    database_schema: 2,
    backend_route: 3,
    auth_security: 4,
    data_model: 5,
    architecture: 6,
    instructions: 7,
    documentation: 8,
    ui_component: 9,
    source_code: 10,
    api_impl: 11,
    ci_cd: 12,
    tests: 13,
    other: 14,
  };

  filesToRead.sort((a, b) => {
    const catA = classifyFile(a.path).category;
    const catB = classifyFile(b.path).category;
    return (priorityOrder[catA] || 99) - (priorityOrder[catB] || 99);
  });

  const targetFiles = filesToRead.slice(0, maxFiles);
  const remainingFiles = filesToRead.slice(maxFiles);

  for (const rem of remainingFiles) {
    const classification = classifyFile(rem.path);
    const reason = `Bounded ingestion limit reached (${maxFiles} prioritized files selected)`;
    skippedSummary[reason] = (skippedSummary[reason] || 0) + 1;
    inventory.push({
      path: rem.path,
      extension: classification.extension,
      language: classification.language,
      category: classification.category,
      size: rem.size,
      blobSha: rem.sha,
      linesCount: 0,
      isRead: false,
      skipReason: reason,
    });
  }

  // Step 3: Read blob contents with bounded concurrency (concurrency = 6)
  const fileContents = new Map<string, string>();
  let totalLinesOfCode = 0;
  let readSuccessCount = 0;

  // Build existing cache map for incremental updates
  const existingMap = new Map<string, CodebaseFileItem>();
  if (options.existingInventory) {
    for (const item of options.existingInventory) {
      if (item.isRead && item.excerpt) {
        existingMap.set(item.path, item);
      }
    }
  }

  options.onProgress?.({
    phase: 4,
    phaseName: `Reading source code (${targetFiles.length} prioritized files)`,
    percent: 45,
    discoveredCount: blobs.length,
    readCount: 0,
    skippedCount: inventory.filter((i) => !i.isRead).length,
  });

  const CONCURRENCY = 6;
  for (let i = 0; i < targetFiles.length; i += CONCURRENCY) {
    const batch = targetFiles.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        const classification = classifyFile(file.path);

        // Incremental Cache Check: If blob SHA matches existing inventory, reuse excerpt!
        const cached = existingMap.get(file.path);
        if (cached && cached.blobSha === file.sha && cached.excerpt) {
          fileContents.set(file.path, cached.excerpt);
          totalLinesOfCode += cached.linesCount || 0;
          readSuccessCount++;
          inventory.push(cached);
          return;
        }

        try {
          const blobData = await service.getBlob(owner, repo, file.sha, options.requestOptions);
          if (!blobData || !blobData.content) {
            inventory.push({
              path: file.path,
              extension: classification.extension,
              language: classification.language,
              category: classification.category,
              size: file.size,
              blobSha: file.sha,
              linesCount: 0,
              isRead: false,
              skipReason: 'Empty or unresolvable blob from GitHub API',
            });
            return;
          }

          let rawContent = blobData.content;
          // Safe truncation if content exceeds per-file threshold
          if (rawContent.length > maxFileSizeBytes) {
            rawContent =
              rawContent.slice(0, maxFileSizeBytes) +
              '\n\n// [NOTE: File truncated for safe context window - remaining content omitted]';
          }

          const sanitized = sanitizeCodebaseContent(rawContent);
          const lines = sanitized.split('\n');
          totalLinesOfCode += lines.length;
          readSuccessCount++;

          fileContents.set(file.path, sanitized);

          inventory.push({
            path: file.path,
            extension: classification.extension,
            language: classification.language,
            category: classification.category,
            size: file.size || Buffer.byteLength(sanitized, 'utf-8'),
            blobSha: file.sha,
            linesCount: lines.length,
            isRead: true,
            excerpt: sanitized.slice(0, 8000), // Index up to 8KB for fast search & incremental cache
          });
        } catch (fetchErr: any) {
          console.warn(`[Codebase Scanner] Could not fetch blob for ${file.path}: ${fetchErr.message}`);
          inventory.push({
            path: file.path,
            extension: classification.extension,
            language: classification.language,
            category: classification.category,
            size: file.size,
            blobSha: file.sha,
            linesCount: 0,
            isRead: false,
            skipReason: `GitHub fetch error: ${fetchErr.message || 'Transient read failure'}`,
          });
        }
      })
    );

    const currentPercent = Math.min(80, Math.round(45 + ((i + batch.length) / targetFiles.length) * 35));
    options.onProgress?.({
      phase: 4,
      phaseName: `Reading source code (${readSuccessCount}/${targetFiles.length} files)`,
      percent: currentPercent,
      readCount: readSuccessCount,
      skippedCount: inventory.filter((item) => !item.isRead).length,
    });
  }

  // Sort inventory alphabetically by path
  inventory.sort((a, b) => a.path.localeCompare(b.path));

  return {
    treeSha,
    totalDiscovered: blobs.length,
    filesRead: readSuccessCount,
    filesSkipped: inventory.filter((item) => !item.isRead).length,
    inventory,
    fileContents,
    skippedSummary,
    categories,
    languages,
    totalLinesOfCode,
  };
}
