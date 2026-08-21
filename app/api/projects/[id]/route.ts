import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const project = await getOwnedProject(params.id, userId);

    let files: { path: string; content: string }[] = [];
    if (project.activeVersionId) {
      const version = await prisma.version.findUnique({
        where: { id: project.activeVersionId },
        include: { files: true },
      });
      files = version?.files.map((f) => ({ path: f.path, content: f.content })) ?? [];
    }

    const versions = await prisma.version.findMany({
      where: { projectId: project.id },
      orderBy: { versionNumber: "desc" },
      select: { id: true, versionNumber: true, createdAt: true },
    });

    return NextResponse.json({ project, files, versions });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to load project." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    await getOwnedProject(params.id, userId);
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to delete project." }, { status: 500 });
  }
}
