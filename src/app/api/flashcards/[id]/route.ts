import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { User } from "@/lib/models/user";
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
  const raw = await FlashcardSet.findById(id).lean();
  if (!raw) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isOwner = raw.ownerId.toString() === userId;
  if (!isOwner && raw.visibility !== "public") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isOwner) {
    await FlashcardSet.updateOne({ _id: id }, { lastOpenedAt: new Date() });
  }

  const owner = await User.findById(raw.ownerId, { name: 1 }).lean();

  return NextResponse.json({
    id: raw._id.toString(),
    name: raw.name,
    description: raw.description,
    visibility: raw.visibility,
    folderId: raw.folderId,
    cards: raw.cards,
    isOwner,
    ownerName: owner?.name ?? "Unknown user",
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
