import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth/require-user";
import { getOwnedProject, NotFoundError } from "@/lib/services/ownership";
import { buildProjectZip } from "@/lib/services/zip-builder";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const project = await getOwnedProject(params.id, userId);

    const versionId = req.nextUrl.searchParams.get("versionId") ?? project.activeVersionId;
    if (!versionId) {
      return NextResponse.json({ error: "This project has no generated version yet." }, { status: 404 });
    }

    const version = await prisma.version.findUnique({
      where: { id: versionId },
      include: { files: true },
    });
    if (!version || version.projectId !== project.id) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    if (version.files.length === 0) {
      return NextResponse.json({ error: "This version has no files to export." }, { status: 404 });
    }

    const zipBytes = await buildProjectZip(
      project.name,
      version.files.map((f) => ({ path: f.path, content: f.content }))
    );

    // Convert Uint8Array -> a Buffer-backed body for correct Web Response compatibility.
    const body = Buffer.from(zipBytes);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug(project.name)}-v${version.versionNumber}.zip"`,
        "Content-Length": String(body.length),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unable to build ZIP." }, { status: 500 });
  }
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}
