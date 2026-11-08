import { GoogleGenAI } from '@google/genai';
import type { RawExtractedFinding, ExtractionOptions } from './types.ts';

export class GeminiConfigError extends Error {
  constructor(message = 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment or .env.local file to perform live AI knowledge extraction.') {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

export function buildExtractionPrompt(documentName: string, text: string, chunkInfo?: string): string {
  return `You are KnoTrail's Project Knowledge Extraction Agent.
Your mission is to perform deep operational knowledge reconstruction from this authentic project document: "${documentName}"${chunkInfo ? ` (${chunkInfo})` : ''}.
This knowledge is critical for team member handover to prevent critical operational knowledge loss.

GROUNDING RULES (MANDATORY):
1. ZERO FABRICATION: Only extract facts, decisions, and tasks directly substantiated by the text.
2. EXACT QUOTES: For EVERY finding, you MUST provide "supportingQuote", which must be an EXACT, VERBATIM substring copied directly from the document text. Do NOT rephrase or extrapolate quotes.
3. If an owner is not mentioned, use "Unassigned" or infer team role if explicitly stated.
4. For every "decision", you MUST extract "reasoning" (why it was made) and "impact" (operational effect).
5. If contradictory statements exist within the text, mark "isConflict": true and provide conflict details.

CATEGORIES TO EXTRACT (7 Operational Types):
- "decision": Architectural, infrastructure, design, or policy decisions.
- "task": Pending, active, or unfinished tasks and runbook items.
- "risk": Operational, architectural, security, or financial risks.
- "dependency": External services, libraries, cloud infrastructure, or team dependencies.
- "contact": Key domain owners, roles, and operational contacts explicitly mentioned.
- "unresolved_question": Ambiguities, open RFCs, unresolved questions, or unverified assumptions.
- "next_action": Immediate tactical next actions required by incoming engineers.

DOCUMENT TEXT:
"""
${text}
"""

OUTPUT FORMAT:
Return a JSON array of objects conforming to this schema:
[
  {
    "type": "decision" | "task" | "risk" | "dependency" | "contact" | "unresolved_question" | "next_action",
    "title": "Clear, concise title",
    "summary": "Detailed, factual summary of the finding",
    "category": "Context tag (e.g. Architecture, Database, Security, Infrastructure, Runbook)",
    "urgency": "critical" | "high" | "medium" | "low",
    "owner": "Name or role of person/team responsible (or 'Unassigned')",
    "reasoning": "Reasoning context (why this was done - required for decisions)",
    "impact": "Operational impact and consequences (required for decisions)",
    "supportingQuote": "EXACT verbatim quote from the text above",
    "claimedConfidence": 95,
    "isConflict": false
  }
]
`;
}

/**
 * Extracts raw findings from text using Gemini 2.5 Flash.
 */
export async function extractWithGemini(
  documentName: string,
  text: string,
  options: ExtractionOptions = {},
  customClient?: any
): Promise<RawExtractedFinding[]> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  if (!customClient && (!apiKey || apiKey.trim().length === 0)) {
    throw new GeminiConfigError();
  }

  const prompt = buildExtractionPrompt(documentName, text);
  const modelName = options.model || 'gemini-2.5-flash';

  let rawResponseText = '';

  if (customClient) {
    // Custom client or test mock
    const res = await customClient.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    rawResponseText = res.text || (typeof res === 'string' ? res : JSON.stringify(res));
  } else {
    // Official GoogleGenAI SDK call
    const ai = new GoogleGenAI({ apiKey: apiKey! });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.1,
      },
    });
    rawResponseText = response.text || '';
  }

  if (!rawResponseText || rawResponseText.trim().length === 0) {
    return [];
  }

  // Clean JSON output (strip markdown fences if present)
  let cleanJson = rawResponseText.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleanJson);
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === 'object') {
        // Maybe wrapped in { findings: [...] } or { results: [...] }
        const candidate = (parsed as any).findings || (parsed as any).results || (parsed as any).items;
        if (Array.isArray(candidate)) {
          return candidate as RawExtractedFinding[];
        }
      }
      return [];
    }
    return parsed as RawExtractedFinding[];
  } catch (err) {
    console.warn('Failed to parse Gemini JSON response:', err, '\nRaw text:', rawResponseText);
    return [];
  }
}
