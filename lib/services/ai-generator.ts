import { getPlatformDefinition, PlatformId } from "@/lib/platforms/definitions";
import {
  validateGeneratedFiles,
  ValidationError,
} from "@/lib/services/validator";

export interface GenerationInput {
  platform: PlatformId;
  projectName: string;
  description: string;
  targetAudience?: string | null;
  brandStyle?: string | null;
  requiredPages?: string | null;
  features?: string | null;
  referenceImages?: Array<{
    mimeType: string;
    data: string;
  }>;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

const MAX_GENERATED_FILES = Number(
  process.env.MAX_GENERATED_FILES ?? 40
);

const MAX_FILE_SIZE = Number(
  process.env.MAX_FILE_SIZE ?? 250_000
);

const MAX_AI_RETRIES = Number(
  process.env.MAX_AI_RETRIES ?? 2
);

function getApiKey(): string {
  const apiKey = process.env.AI_PROVIDER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI_PROVIDER_API_KEY is not configured on the server. Generation cannot run."
    );
  }

  return apiKey;
}

function buildSystemPrompt(platform: PlatformId): string {
  const def = getPlatformDefinition(platform);

  return `You are a senior ${def.label} developer generating a complete, production-quality website.

${def.generationRules}

You MUST respond with ONLY a single JSON object and nothing else.

The JSON object must exactly match this shape:

{
  "files": [
    {
      "path": "relative/file/path.ext",
      "content": "full file content as a string"
    }
  ]
}

Rules:

- Every file path must be relative.
- Never use leading "/" in file paths.
- Never use ".." in file paths.
- Never use Windows drive letters.
- Include ${def.expectedStructure
    .slice(0, 4)
    .join(", ")} at minimum.
- Include all additional files required for a working website.
- Write real, complete, production-quality code.
- Do not use TODO placeholders.
- Do not truncate files.
- Keep the total file count under ${MAX_GENERATED_FILES}.
- Do not include node_modules.
- Do not include .git.
- Do not include build artifacts.
- Do not invent real customer information.
- Do not invent payment credentials.
- Do not create fake external integrations.
- Make the generated website visually polished.
- Make the generated website responsive.
- Follow accessibility best practices.
- Optimize the generated website for performance.`;
}

function buildUserPrompt(input: GenerationInput): string {
  const lines = [
    `Project name: ${input.projectName}`,
    `Description: ${input.description}`,
  ];

  if (input.targetAudience) {
    lines.push(`Target audience: ${input.targetAudience}`);
  }

  if (input.brandStyle) {
    lines.push(`Brand style: ${input.brandStyle}`);
  }

  if (input.requiredPages) {
    lines.push(`Required pages: ${input.requiredPages}`);
  }

  if (input.features) {
    lines.push(`Required features: ${input.features}`);
  }

  lines.push(
    "",
    "Use the supplied reference images as visual design references when available.",
    "Do not copy copyrighted logos or proprietary assets.",
    "Generate the complete website now.",
    "Return ONLY the JSON object."
  );

  return lines.join("\n");
}

function extractJson(text: string): string {
  const trimmed = text.trim();

  const fencedMatch = trimmed.match(
    /```(?:json)?\s*([\s\S]*?)```/i
  );

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

interface OpenAIResponse {
  output_text?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export async function generateWebsiteFiles(
  input: GenerationInput
): Promise<GeneratedFile[]> {
  const apiKey = getApiKey();

  const model =
    process.env.AI_TEXT_MODEL || "gpt-5.6-luna";

  const maxTokens = Number(
    process.env.AI_MAX_TOKENS ?? 8000
  );

  const systemPrompt = buildSystemPrompt(
    input.platform
  );

  const userPrompt = buildUserPrompt(input);

  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: userPrompt,
    },
  ];

  /*
   * Add reference images.
   *
   * The frontend already converts uploaded images
   * into base64 data, so we send them as data URLs.
   */
  if (input.referenceImages?.length) {
    for (const img of input.referenceImages.slice(0, 5)) {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(
          img.mimeType
        )
      ) {
        continue;
      }

      content.push({
        type: "input_image",
        image_url: `data:${img.mimeType};base64,${img.data}`,
      });
    }
  }

  let lastError: unknown = null;

  for (
    let attempt = 0;
    attempt <= MAX_AI_RETRIES;
    attempt++
  ) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model,

            instructions: systemPrompt,

            input: [
              {
                role: "user",
                content,
              },
            ],

            max_output_tokens: maxTokens,

            text: {
              format: {
                type: "json_object",
              },
            },
          }),
        }
      );

      const rawText = await response.text();

      let data: OpenAIResponse;

      try {
        data = JSON.parse(rawText) as OpenAIResponse;
      } catch {
        throw new Error(
          `OpenAI API returned HTTP ${response.status} with an invalid response.`
        );
      }

      if (!response.ok) {
        const apiMessage =
          data.error?.message ||
          "Unknown OpenAI API error.";

        throw new Error(
          `OpenAI API HTTP ${response.status}: ${apiMessage}`
        );
      }

      const text = data.output_text;

      if (!text) {
        throw new Error(
          "OpenAI response contained no output text."
        );
      }

      const jsonStr = extractJson(text);

      let parsed: {
        files?: unknown;
      };

      try {
        parsed = JSON.parse(jsonStr) as {
          files?: unknown;
        };
      } catch {
        throw new ValidationError(
          "AI response was not valid JSON."
        );
      }

      if (
        !parsed.files ||
        !Array.isArray(parsed.files)
      ) {
        throw new ValidationError(
          'AI response is missing a "files" array.'
        );
      }

      const validated =
        validateGeneratedFiles(
          parsed.files as Array<{
            path: string;
            content: string;
          }>,
          {
            maxFiles: MAX_GENERATED_FILES,
            maxFileSize: MAX_FILE_SIZE,
          }
        );

      return validated;
    } catch (err) {
      lastError = err;

      if (attempt === MAX_AI_RETRIES) {
        break;
      }

      /*
       * Small delay before retrying.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * (attempt + 1))
      );
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Unknown generation error.";

  throw new Error(
    `AI generation failed after ${
      MAX_AI_RETRIES + 1
    } attempt(s): ${message}`
  );
}
