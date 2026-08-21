import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const userId = await requireUserId();
    const project = await getOwnedProject(params.id, userId);

    const version = await prisma.version.findUnique({
      where: { id: params.versionId },
      include: { files: true },
    });
    if (!version || version.projectId !== project.id) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    // Restoring only re-points the active pointer. All versions remain intact.
    await prisma.project.update({
      where: { id: project.id },
      data: { activeVersionId: version.id },
    });

    return NextResponse.json({
      files: version.files.map((f) => ({ path: f.path, content: f.content })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to restore version." }, { status: 500 });
  }
}
