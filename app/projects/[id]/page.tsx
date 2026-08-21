import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { ProjectDashboard } from "@/components/project-dashboard";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project || project.userId !== userId) notFound();

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
        <ProjectDashboard
          project={{
            id: project.id,
            name: project.name,
            platform: project.platform,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
            activeVersionId: project.activeVersionId,
          }}
          initialFiles={files}
          initialVersions={versions.map((v) => ({
            id: v.id,
            versionNumber: v.versionNumber,
            createdAt: v.createdAt.toISOString(),
          }))}
        />
      </main>
    </div>
  );
}
