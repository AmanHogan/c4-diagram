import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { requireUserId } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface FlashcardInput {
  id: string;
  front: string;
  back: string;
}

/**
 * Load a flashcard set by id. Owners get full access; anyone else only if
 * it's public.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const set = await FlashcardSet.findById(id).populate("ownerId", "name").lean();
  if (!set) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const owner = set.ownerId as unknown as { _id: { toString(): string }; name: string };
  const isOwner = owner._id.toString() === userId;
  if (!isOwner && set.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isOwner) {
    await FlashcardSet.updateOne({ _id: id }, { lastOpenedAt: new Date() });
  }

  return NextResponse.json({
    id: set._id.toString(),
    name: set.name,
    description: set.description,
    visibility: set.visibility,
    folderId: set.folderId,
    cards: set.cards,
    isOwner,
    ownerName: owner.name,
  });
}

/**
 * Update a flashcard set's name/description/cards/visibility/folder. Owner only.
 */
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const set = await FlashcardSet.findById(id);
  if (!set || set.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    cards?: FlashcardInput[];
    visibility?: "public" | "private";
    folderId?: string | null;
  };
  if (body.name) set.name = body.name;
  if (body.description !== undefined) set.description = body.description;
  if (body.cards) set.cards = body.cards as typeof set.cards;
  if (body.visibility) set.visibility = body.visibility;
  if (body.folderId !== undefined) set.folderId = body.folderId as never;
  set.lastOpenedAt = new Date();
  await set.save();

  return NextResponse.json({ ok: true });
}

/**
 * Delete a flashcard set. Owner only.
 */
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectToDatabase();
  const set = await FlashcardSet.findById(id);
  if (!set || set.ownerId.toString() !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await set.deleteOne();
  return NextResponse.json({ ok: true });
}
