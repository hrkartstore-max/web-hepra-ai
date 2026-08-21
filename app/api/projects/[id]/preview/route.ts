import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";

const ENTRY_CANDIDATES = ["index.html", "index.php", "layout/theme.liquid", "front-page.php", "home.php", "index.tsx"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const project = await getOwnedProject(params.id, userId);

    const versionId = req.nextUrl.searchParams.get("versionId") ?? project.activeVersionId;
    if (!versionId) {
      return NextResponse.json({ error: "No generated version to preview." }, { status: 404 });
    }

    const version = await prisma.version.findUnique({
      where: { id: versionId },
      include: { files: true },
    });
    if (!version || version.projectId !== project.id) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    const entry =
      version.files.find((f) => ENTRY_CANDIDATES.includes(f.path)) ?? version.files[0] ?? null;

    return NextResponse.json({
      entryPath: entry?.path ?? null,
      entryContent: entry?.content ?? null,
      platform: project.platform,
      fileCount: version.files.length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to load preview." }, { status: 500 });
  }
}
