import Anthropic from "@anthropic-ai/sdk";
import { getPlatformDefinition, PlatformId } from "@/lib/platforms/definitions";
import { validateGeneratedFiles, ValidationError } from "@/lib/services/validator";

export interface GenerationInput {
  platform: PlatformId;
  projectName: string;
  description: string;
  targetAudience?: string | null;
  brandStyle?: string | null;
  requiredPages?: string | null;
  features?: string | null;
  referenceImages?: Array<{ mimeType: string; data: string }>; // base64 data
}

export interface GeneratedFile {
  path: string;
  content: string;
}

const MAX_GENERATED_FILES = Number(process.env.MAX_GENERATED_FILES ?? 40);
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 250_000);
const MAX_AI_RETRIES = Number(process.env.MAX_AI_RETRIES ?? 2);

function getClient(): Anthropic {
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI_PROVIDER_API_KEY is not configured on the server. Generation cannot run."
    );
  }
  return new Anthropic({ apiKey });
}

function buildSystemPrompt(platform: PlatformId): string {
  const def = getPlatformDefinition(platform);
  return `You are a senior ${def.label} developer generating a complete, production-quality website.

${def.generationRules}

You MUST respond with ONLY a single JSON object and nothing else — no markdown fences, no preamble, no commentary.
The JSON object must exactly match this shape:
{
  "files": [
    { "path": "relative/file/path.ext", "content": "full file content as a string" }
  ]
}

Rules:
- Every file's "path" must be a relative path (no leading slash, no "..", no drive letters).
- Include ${def.expectedStructure.slice(0, 4).join(", ")} at minimum, plus whatever else is needed.
- Write real, working, complete code for every file — no "TODO" placeholders, no truncated files.
- Keep the total file count reasonable (under ${MAX_GENERATED_FILES}).
- Do not include node_modules, .git, or any build artifacts.`;
}

function buildUserPrompt(input: GenerationInput): string {
  const lines = [
    `Project name: ${input.projectName}`,
    `Description: ${input.description}`,
  ];
  if (input.targetAudience) lines.push(`Target audience: ${input.targetAudience}`);
  if (input.brandStyle) lines.push(`Brand style: ${input.brandStyle}`);
  if (input.requiredPages) lines.push(`Required pages: ${input.requiredPages}`);
  if (input.features) lines.push(`Required features: ${input.features}`);
  lines.push(
    "",
    "Generate the complete website now. Respond with the JSON object only."
  );
  return lines.join("\n");
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();
  return trimmed;
}

/**
 * Calls the configured Anthropic model to generate a full set of website files.
 * Throws on failure — callers are responsible for marking the Generation as FAILED.
 */
export async function generateWebsiteFiles(
  input: GenerationInput
): Promise<GeneratedFile[]> {
  const client = getClient();
  const model = process.env.AI_TEXT_MODEL || "claude-sonnet-4-5-20250929";
  const maxTokens = Number(process.env.AI_MAX_TOKENS ?? 8000);
  const temperature = Number(process.env.AI_TEMPERATURE ?? 0.2);

  const systemPrompt = buildSystemPrompt(input.platform);
  const userPrompt = buildUserPrompt(input);

  const content: Anthropic.MessageParam["content"] = [{ type: "text", text: userPrompt }];

  if (input.referenceImages?.length) {
    for (const img of input.referenceImages.slice(0, 5)) {
      const mediaType = img.mimeType as
        | "image/png"
        | "image/jpeg"
        | "image/webp";
      content.unshift({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: img.data },
      });
    }
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_AI_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("AI response contained no text content.");
      }

      const jsonStr = extractJson(textBlock.text);
      let parsed: { files?: unknown };
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new ValidationError("AI response was not valid JSON.");
      }

      if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new ValidationError('AI response is missing a "files" array.');
      }

      const validated = validateGeneratedFiles(
        parsed.files as Array<{ path: string; content: string }>,
        { maxFiles: MAX_GENERATED_FILES, maxFileSize: MAX_FILE_SIZE }
      );

      return validated;
    } catch (err) {
      lastError = err;
      // Only retry on validation/parse failures or transient API errors, not on config errors.
      if (attempt === MAX_AI_RETRIES) break;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Unknown generation error.";
  throw new Error(`AI generation failed after ${MAX_AI_RETRIES + 1} attempt(s): ${message}`);
}
