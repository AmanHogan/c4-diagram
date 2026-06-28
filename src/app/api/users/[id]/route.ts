import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { User } from "@/lib/models/user";
import { requireUserId } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Public profile: a user's name plus their public diagrams and flashcard
 * sets.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const viewerId = await requireUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const user = await User.findById(id, { name: 1 }).lean();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [diagrams, flashcardSets] = await Promise.all([
    Diagram.find({ ownerId: id, visibility: "public" }, { name: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .lean(),
    FlashcardSet.find(
      { ownerId: id, visibility: "public" },
      { name: 1, updatedAt: 1, cards: 1 },
    )
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    diagrams: diagrams.map((d) => ({ id: d._id.toString(), name: d.name, updatedAt: d.updatedAt })),
    flashcardSets: flashcardSets.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      updatedAt: s.updatedAt,
      cardCount: s.cards.length,
    })),
  });
}
