import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FlashcardProgress } from "@/lib/models/flashcard-progress";
import { requireUserId } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Load the current user's known/learning status for every card they've
 * studied in this set, keyed by card id.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const entries = await FlashcardProgress.find({ userId, setId: id }, { cardId: 1, status: 1 }).lean();
  const progress: Record<string, "known" | "learning"> = {};
  for (const entry of entries) {
    progress[entry.cardId] = entry.status;
  }
  return NextResponse.json(progress);
}

/**
 * Mark a single card known/learning for the current user. Independent of
 * the flashcard set's own content, so editing or adding cards never resets
 * tracked progress.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { cardId, status } = (await request.json()) as { cardId?: string; status?: "known" | "learning" };
  if (!cardId || (status !== "known" && status !== "learning")) {
    return NextResponse.json({ error: "cardId and a valid status are required" }, { status: 400 });
  }

  await connectToDatabase();
  await FlashcardProgress.findOneAndUpdate(
    { userId, setId: id, cardId },
    { userId, setId: id, cardId, status },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}
