import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { User } from "@/lib/models/user";
import { requireUserId } from "@/lib/require-user";

const RESULT_LIMIT = 20;

/**
 * Search diagrams, flashcard sets, and users by name. Results include the
 * current user's own private items plus everyone's public items.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ diagrams: [], flashcardSets: [], users: [] });
  }

  await connectToDatabase();
  const nameMatch = { $regex: q, $options: "i" };
  const visibilityFilter = { $or: [{ ownerId: userId }, { visibility: "public" as const }] };

  const [diagrams, flashcardSets, users] = await Promise.all([
    Diagram.find({ name: nameMatch, ...visibilityFilter }, { name: 1, visibility: 1, ownerId: 1, updatedAt: 1 })
      .populate("ownerId", "name")
      .sort({ updatedAt: -1 })
      .limit(RESULT_LIMIT)
      .lean(),
    FlashcardSet.find(
      { name: nameMatch, ...visibilityFilter },
      { name: 1, description: 1, visibility: 1, ownerId: 1, updatedAt: 1, cards: 1 },
    )
      .populate("ownerId", "name")
      .sort({ updatedAt: -1 })
      .limit(RESULT_LIMIT)
      .lean(),
    User.find({ name: nameMatch }, { name: 1, email: 1 }).limit(RESULT_LIMIT).lean(),
  ]);

  return NextResponse.json({
    diagrams: diagrams.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      visibility: d.visibility,
      ownerName: (d.ownerId as unknown as { name: string }).name,
      isOwner: (d.ownerId as unknown as { _id: { toString(): string } })._id.toString() === userId,
      updatedAt: d.updatedAt,
    })),
    flashcardSets: flashcardSets.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      description: s.description,
      visibility: s.visibility,
      ownerName: (s.ownerId as unknown as { name: string }).name,
      isOwner: (s.ownerId as unknown as { _id: { toString(): string } })._id.toString() === userId,
      cardCount: s.cards.length,
      updatedAt: s.updatedAt,
    })),
    users: users.map((u) => ({ id: u._id.toString(), name: u.name })),
  });
}
