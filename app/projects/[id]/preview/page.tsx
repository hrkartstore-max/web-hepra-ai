import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { PreviewFrame } from "./preview-frame";

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project || project.userId !== userId) notFound();

  if (!project.activeVersionId) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-white/80 font-medium">Nothing to preview yet</p>
          <p className="text-sm text-muted mt-1">Generate a version first.</p>
        </div>
      </main>
    );
  }

  const version = await prisma.version.findUnique({
    where: { id: project.activeVersionId },
    include: { files: true },
  });

  const ENTRY_CANDIDATES = [
    "index.html",
    "index.php",
    "layout/theme.liquid",
    "front-page.php",
    "home.php",
  ];
  const entry =
    version?.files.find((f) => ENTRY_CANDIDATES.includes(f.path)) ?? version?.files[0] ?? null;

  const isStaticHtml = entry?.path === "index.html";

  return (
    <PreviewFrame
      projectName={project.name}
      platform={project.platform}
      entryPath={entry?.path ?? null}
      entryContent={entry?.content ?? null}
      isStaticHtml={isStaticHtml}
    />
  );
}
