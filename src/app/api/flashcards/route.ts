import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { requireUserId } from "@/lib/require-user";

/**
 * List the current user's flashcard sets, most recently opened first.
 */
export async function GET(): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const sets = await FlashcardSet.find(
    { ownerId: userId },
    { name: 1, description: 1, visibility: 1, updatedAt: 1, lastOpenedAt: 1, folderId: 1, cards: 1 },
  )
    .sort({ lastOpenedAt: -1 })
    .lean();
  return NextResponse.json(
    sets.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      description: s.description,
      visibility: s.visibility,
      updatedAt: s.updatedAt,
      folderId: s.folderId,
      cardCount: s.cards.length,
    })),
  );
}

/**
 * Create a new flashcard set owned by the current user.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, visibility, folderId } = (await request.json()) as {
    name?: string;
    description?: string;
    visibility?: "public" | "private";
    folderId?: string | null;
  };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectToDatabase();
  const set = await FlashcardSet.create({
    name: name.trim(),
    description,
    ownerId: userId,
    visibility: visibility ?? "private",
    folderId: folderId ?? null,
    cards: [],
  });
  return NextResponse.json({ id: set._id.toString() });
}
