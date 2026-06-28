import { auth } from "@/lib/auth";

/**
 * Resolve the current session's user id, or null if unauthenticated.
 * @returns The signed-in user's id, or null.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
