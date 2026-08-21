import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";
import { generateWebsiteFiles } from "@/lib/services/ai-generator";
import { PlatformId } from "@/lib/platforms/definitions";

export const maxDuration = 300; // seconds - Vercel function timeout for inline generation

const MAX_REFERENCE_FILE_SIZE = Number(process.env.MAX_REFERENCE_FILE_SIZE ?? 5_242_880);
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const generateSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  referenceImages: z
    .array(
      z.object({
        mimeType: z.string(),
        data: z.string(),
        filename: z.string().max(255).optional(),
      })
    )
    .max(5)
    .optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  let project;

  try {
    userId = await requireUserId();
    project = await getOwnedProject(params.id, userId);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to start generation." }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid generation request." }, { status: 400 });
  }

  // Server-side validation of reference images - never trust client claims.
  const referenceImages: { mimeType: string; data: string }[] = [];
  for (const img of parsed.data.referenceImages ?? []) {
    if (!ALLOWED_MIME.has(img.mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${img.mimeType}` },
        { status: 400 }
      );
    }
    const approxBytes = Math.ceil((img.data.length * 3) / 4);
    if (approxBytes > MAX_REFERENCE_FILE_SIZE) {
      return NextResponse.json({ error: "One or more images exceed 5MB." }, { status: 400 });
    }
    referenceImages.push({ mimeType: img.mimeType, data: img.data });
  }

  const generation = await prisma.generation.create({
    data: { projectId: project.id, prompt: parsed.data.prompt, status: "RUNNING" },
  });

  try {
    const files = await generateWebsiteFiles({
      platform: project.platform as PlatformId,
      projectName: project.name,
      description: parsed.data.prompt,
      targetAudience: project.targetAudience,
      brandStyle: project.brandStyle,
      requiredPages: project.requiredPages,
      features: project.features,
      referenceImages,
    });

    // Persist reference images tied to this project (best-effort, non-fatal).
    if (referenceImages.length) {
      await prisma.referenceImage.createMany({
        data: referenceImages.map((img, i) => ({
          projectId: project.id,
          filename: `reference-${i + 1}`,
          mimeType: img.mimeType,
          size: Math.ceil((img.data.length * 3) / 4),
          data: img.data,
        })),
      });
    }

    const { version } = await prisma.$transaction(async (tx) => {
      const latest = await tx.version.findFirst({
        where: { projectId: project.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

      const createdVersion = await tx.version.create({
        data: {
          projectId: project.id,
          versionNumber: nextVersionNumber,
          generationId: generation.id,
          files: {
            create: files.map((f) => ({
              path: f.path,
              content: f.content,
              size: Buffer.byteLength(f.content, "utf-8"),
            })),
          },
        },
        include: { files: true },
      });

      await tx.generation.update({
        where: { id: generation.id },
        data: { status: "COMPLETED", completedAt: new Date(), versionId: createdVersion.id },
      });

      await tx.project.update({
        where: { id: project.id },
        data: { activeVersionId: createdVersion.id },
      });

      return { version: createdVersion };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      generation: { id: generation.id, status: "COMPLETED" },
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      },
      files: version.files.map((f) => ({ path: f.path, content: f.content })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "FAILED", errorMessage: message.slice(0, 2000), completedAt: new Date() },
    });
    console.error("Generation failed:", err);
    return NextResponse.json(
      { error: "Unable to generate website. Please try again." },
      { status: 502 }
    );
  }
}
