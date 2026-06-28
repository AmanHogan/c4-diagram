import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { requireUserId } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Duplicate a public flashcard set into the current user's account as a
 * private, editable copy.
 */
export async function POST(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const original = await FlashcardSet.findById(id).lean();
  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (original.visibility !== "public" && original.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fork = await FlashcardSet.create({
    name: `${original.name} (copy)`,
    description: original.description,
    ownerId: userId,
    visibility: "private",
    folderId: null,
    forkedFrom: original._id,
    cards: original.cards,
  });

  return NextResponse.json({ id: fork._id.toString() });
}
