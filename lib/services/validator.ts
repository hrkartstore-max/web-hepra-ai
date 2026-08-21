/**
 * Security-critical validation. Never trust AI output, client MIME types, or filenames.
 */

const FORBIDDEN_SEGMENTS = ["..", ".git", "node_modules", ".env"];
const FORBIDDEN_PREFIXES = ["/", "\\"];
// crude Windows drive-letter check, e.g. "C:"
const WINDOWS_DRIVE = /^[a-zA-Z]:/;

export interface ValidatedFile {
  path: string;
  content: string;
}

export class ValidationError extends Error {}

/**
 * Normalizes and validates a single generated file path.
 * Throws ValidationError if the path is unsafe.
 */
export function sanitizeGeneratedPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== "string") {
    throw new ValidationError("File path is missing or invalid.");
  }

  let p = rawPath.trim().replace(/\\/g, "/");

  if (WINDOWS_DRIVE.test(p)) {
    throw new ValidationError(`Absolute Windows path not allowed: ${rawPath}`);
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (p.startsWith(prefix)) {
      throw new ValidationError(`Absolute path not allowed: ${rawPath}`);
    }
  }

  const segments = p.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new ValidationError("File path resolves to nothing.");
  }
  for (const seg of segments) {
    if (FORBIDDEN_SEGMENTS.includes(seg)) {
      throw new ValidationError(`Unsafe path segment "${seg}" in: ${rawPath}`);
    }
    if (seg.startsWith("..")) {
      throw new ValidationError(`Path traversal detected in: ${rawPath}`);
    }
  }

  const normalized = segments.join("/");
  if (normalized.length > 400) {
    throw new ValidationError("File path too long.");
  }
  return normalized;
}

export function validateGeneratedFiles(
  files: Array<{ path: string; content: string }>,
  opts: { maxFiles: number; maxFileSize: number }
): ValidatedFile[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new ValidationError("AI did not return any files.");
  }
  if (files.length > opts.maxFiles) {
    throw new ValidationError(
      `Generated ${files.length} files, exceeding the limit of ${opts.maxFiles}.`
    );
  }

  const seen = new Set<string>();
  const result: ValidatedFile[] = [];

  for (const f of files) {
    if (typeof f.content !== "string") {
      throw new ValidationError(`File "${f.path}" has non-string content.`);
    }
    const size = Buffer.byteLength(f.content, "utf-8");
    if (size > opts.maxFileSize) {
      throw new ValidationError(
        `File "${f.path}" is ${size} bytes, exceeding the limit of ${opts.maxFileSize}.`
      );
    }
    const safePath = sanitizeGeneratedPath(f.path);
    if (seen.has(safePath)) {
      throw new ValidationError(`Duplicate file path: ${safePath}`);
    }
    seen.add(safePath);
    result.push({ path: safePath, content: f.content });
  }

  return result;
}

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateUploadedImage(
  file: { type: string; size: number; name: string },
  maxSize: number
) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ValidationError(
      `Unsupported file type "${file.type}". Allowed: PNG, JPG, WEBP.`
    );
  }
  if (file.size <= 0 || file.size > maxSize) {
    throw new ValidationError(
      `File "${file.name}" exceeds the maximum size of ${Math.round(
        maxSize / 1024 / 1024
      )}MB.`
    );
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["png", "jpg", "jpeg", "webp"].includes(ext)) {
    throw new ValidationError(`File extension not allowed for "${file.name}".`);
  }
}
