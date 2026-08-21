import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const project = await getOwnedProject(params.id, userId);

    const versions = await prisma.version.findMany({
      where: { projectId: project.id },
      orderBy: { versionNumber: "desc" },
      select: { id: true, versionNumber: true, createdAt: true, generationId: true },
    });

    return NextResponse.json({ versions });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to load versions." }, { status: 500 });
  }
}
