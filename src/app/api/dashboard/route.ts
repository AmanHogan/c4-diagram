import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Diagram } from "@/lib/models/diagram";
import { FlashcardSet } from "@/lib/models/flashcard-set";
import { requireUserId } from "@/lib/require-user";

const RECENT_LIMIT = 6;
const POPULAR_LIMIT = 8;

interface DashboardItem {
  type: "diagram" | "flashcard-set";
  id: string;
  name: string;
  ownerName?: string;
  updatedAt: string;
}

/**
 * Dashboard summary: the current user's most recently opened items (private
 * to them), and a feed of public items from any user ("popular with other
 * learners" — currently ranked by recency as a stand-in for real popularity).
 */
export async function GET(): Promise<NextResponse> {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const [recentDiagrams, recentSets, popularDiagrams, popularSets] = await Promise.all([
    Diagram.find({ ownerId: userId }, { name: 1, lastOpenedAt: 1 })
      .sort({ lastOpenedAt: -1 })
      .limit(RECENT_LIMIT)
      .lean(),
    FlashcardSet.find({ ownerId: userId }, { name: 1, lastOpenedAt: 1 })
      .sort({ lastOpenedAt: -1 })
      .limit(RECENT_LIMIT)
      .lean(),
    Diagram.find({ visibility: "public" }, { name: 1, ownerId: 1, updatedAt: 1 })
      .populate("ownerId", "name")
      .sort({ updatedAt: -1 })
      .limit(POPULAR_LIMIT)
      .lean(),
    FlashcardSet.find({ visibility: "public" }, { name: 1, ownerId: 1, updatedAt: 1 })
      .populate("ownerId", "name")
      .sort({ updatedAt: -1 })
      .limit(POPULAR_LIMIT)
      .lean(),
  ]);

  const recent: DashboardItem[] = [
    ...recentDiagrams.map((d) => ({
      type: "diagram" as const,
      id: d._id.toString(),
      name: d.name,
      updatedAt: d.lastOpenedAt.toISOString(),
    })),
    ...recentSets.map((s) => ({
      type: "flashcard-set" as const,
      id: s._id.toString(),
      name: s.name,
      updatedAt: s.lastOpenedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_LIMIT);

  const popular: DashboardItem[] = [
    ...popularDiagrams
      .filter((d) => d.ownerId)
      .map((d) => ({
        type: "diagram" as const,
        id: d._id.toString(),
        name: d.name,
        ownerName: (d.ownerId as unknown as { name: string }).name,
        updatedAt: d.updatedAt.toISOString(),
      })),
    ...popularSets
      .filter((s) => s.ownerId)
      .map((s) => ({
        type: "flashcard-set" as const,
        id: s._id.toString(),
        name: s.name,
        ownerName: (s.ownerId as unknown as { name: string }).name,
        updatedAt: s.updatedAt.toISOString(),
      })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, POPULAR_LIMIT);

  return NextResponse.json({ recent, popular });
}
