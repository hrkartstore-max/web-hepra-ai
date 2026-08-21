import { prisma } from "@/lib/prisma";

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}

/**
 * Loads a project and verifies it belongs to the given user.
 * Throws NotFoundError (masks existence from non-owners) if missing or not owned.
 */
export async function getOwnedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    throw new NotFoundError("Project not found.");
  }
  return project;
}
