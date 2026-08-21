import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";
import { sanitizeGeneratedPath, ValidationError } from "@/lib/services/validator";

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 250_000);

const patchSchema = z.object({
  versionId: z.string().min(1),
  path: z.string().min(1),
  content: z.string().max(MAX_FILE_SIZE),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const project = await getOwnedProject(params.id, userId);

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid file update." }, { status: 400 });
    }

    const version = await prisma.version.findUnique({ where: { id: parsed.data.versionId } });
    if (!version || version.projectId !== project.id) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    const safePath = sanitizeGeneratedPath(parsed.data.path);

    const updated = await prisma.projectFile.update({
      where: { versionId_path: { versionId: version.id, path: safePath } },
      data: {
        content: parsed.data.content,
        size: Buffer.byteLength(parsed.data.content, "utf-8"),
      },
    });

    return NextResponse.json({ file: { path: updated.path, content: updated.content } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to save file." }, { status: 500 });
  }
}
