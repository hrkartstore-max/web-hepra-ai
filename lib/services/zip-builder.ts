import JSZip from "jszip";

export interface ZipFileInput {
  path: string;
  content: string;
}

/**
 * Builds a real ZIP archive from validated project files.
 * Returns a Uint8Array suitable for use as a Response body.
 */
export async function buildProjectZip(
  projectName: string,
  files: ZipFileInput[]
): Promise<Uint8Array> {
  if (!files.length) {
    throw new Error("Cannot build a ZIP with zero files.");
  }

  const zip = new JSZip();
  const root = zip.folder(sanitizeFolderName(projectName)) ?? zip;

  for (const file of files) {
    root.file(file.path, file.content);
  }

  const buffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return buffer;
}

function sanitizeFolderName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return cleaned || "hepra-project";
}
