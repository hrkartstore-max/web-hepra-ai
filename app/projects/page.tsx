import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { NewProjectForm } from "./new-project-form";
import Link from "next/link";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold mb-6">Create Website</h1>
        <NewProjectForm />

        <h2 className="text-sm uppercase tracking-widest text-muted mt-12 mb-4">
          Your projects
        </h2>

        {projects.length === 0 ? (
          <div className="glass rounded-xl2 p-10 text-center">
            <p className="text-white/80 font-medium">No websites yet</p>
            <p className="text-sm text-muted mt-1">
              Fill in the form above to create your first website.
            </p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block glass rounded-xl2 p-5 hover:border-primary/40 border border-transparent transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                      {p.platform}
                    </span>
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{p.description}</p>
                  <p className="text-xs text-muted/70 mt-3">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
