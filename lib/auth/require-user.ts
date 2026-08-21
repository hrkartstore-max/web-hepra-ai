import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/**
 * Returns the authenticated user's id, or throws UnauthorizedError.
 * Every API route that touches project data must call this first.
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}
