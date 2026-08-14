"use client";

import { useCallback, useRef, useState } from "react";
import { Marquee } from "@/components/ui/marquee";
import { StaticCarousel } from "@/components/dashboard/static-carousel";
import { PosterCard, VerticalEmptyCard } from "@/components/dashboard/vertical-item-card";
import { PosterCardSkeletonRow } from "@/components/dashboard/poster-card-skeleton";
import { useRefetchOnFocus } from "@/lib/use-refetch-on-focus";
import { useDelayedLoading } from "@/lib/use-delayed-loading";
import { ctaLabelFor, iconFor, itemHref, type DashboardItem } from "@/lib/dashboard-item";

interface LibraryItem {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  visibility: "public" | "private";
  updatedAt: string;
  cardCount?: number;
}

/** Minimum row length before an empty/CTA card gets appended to pad it out
 * — a carousel with 1 real card looks broken, not "not much here yet". */
const MIN_CAROUSEL_LENGTH = 3;

/**
 * Section wrapper for a dashboard carousel: a big centered gradient title
 * (white-to-grey fade, no icon — a full sentence, same treatment as a
 * marketing-page section heading) plus a muted descriptive line under it,
 * sitting directly on the page background. No bounding box of its own;
 * nothing here is a different shade than the page itself.
 */
function DashboardSection({
  title,
  description,
  children,
}: {
  /** A full sentence, not a short label — e.g. "Pick up where you left off." */
  title: string;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mb-14">
      <div className="mb-6 text-center">
        <h2 className="from-foreground to-muted-foreground bg-gradient-to-b bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mt-2 text-base">{description}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Dashboard landing page, top to bottom: "Jump back in", a static
 * flashcards carousel, a static diagrams carousel (all three padded out to
 * a minimum length with a "create one" card so they never look sparse),
 * and finally the auto-scrolling "Popular with other learners" marquee —
 * same card size/shape as the static carousels, just animated and slower.
 * @returns The rendered dashboard home.
 */
export default function DashboardHome(): React.JSX.Element {
  const [recent, setRecent] = useState<DashboardItem[] | null>(null);
  const [popular, setPopular] = useState<DashboardItem[] | null>(null);
  const [flashcardSets, setFlashcardSets] = useState<LibraryItem[] | null>(null);
  const [diagrams, setDiagrams] = useState<LibraryItem[] | null>(null);
  const requestIdRef = useRef(0);

  // Refetches on mount AND whenever the tab regains focus/visibility — not
  // just once — so flipping something to public elsewhere and coming back
  // shows up without a manual hard reload.
  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    const [dashboardRes, flashcardsRes, diagramsRes] = await Promise.all([
      fetch("/api/dashboard"),
      fetch("/api/flashcards"),
      fetch("/api/diagrams"),
    ]);
    const dashboardData = (await dashboardRes.json()) as { recent: DashboardItem[]; popular: DashboardItem[] };
    const flashcardsData = (await flashcardsRes.json()) as LibraryItem[];
    const diagramsData = (await diagramsRes.json()) as LibraryItem[];
    if (requestIdRef.current === requestId) {
      setRecent(dashboardData.recent);
      setPopular(dashboardData.popular);
      setFlashcardSets(flashcardsData);
      setDiagrams(diagramsData);
    }
  }, []);
  useRefetchOnFocus(load);
  const showSkeleton = useDelayedLoading(!recent);

  return (
    <div className="mx-auto max-w-5xl">
      <DashboardSection
        title="Pick up where you left off."
        description="The diagrams and flashcard sets you've opened most recently."
      >
        {showSkeleton ? (
          <PosterCardSkeletonRow />
        ) : !recent ? null : (
          <StaticCarousel>
            {recent.slice(0, 8).map((item) => (
              <PosterCard
                key={`${item.type}-${item.id}`}
                href={itemHref(item)}
                icon={iconFor(item.type)}
                coverImageUrl={item.coverImageUrl}
                title={item.name}
                description={item.description}
                date={new Date(item.updatedAt).toLocaleDateString()}
                ctaLabel={ctaLabelFor(item.type)}
              />
            ))}
            {recent.length < MIN_CAROUSEL_LENGTH ? (
              <VerticalEmptyCard href="/dashboard/diagrams" label="Create a diagram or flashcard set" />
            ) : null}
          </StaticCarousel>
        )}
      </DashboardSection>

      <DashboardSection title="Browse your flashcard sets." description="Every set you've created, ready to study.">
        {showSkeleton ? (
          <PosterCardSkeletonRow />
        ) : !flashcardSets ? null : (
          <StaticCarousel>
            {flashcardSets.slice(0, 8).map((set) => (
              <PosterCard
                key={set.id}
                href={`/dashboard/flashcards/${set.id}`}
                icon={iconFor("flashcard-set")}
                coverImageUrl={set.coverImageUrl}
                title={set.name}
                description={set.description}
                date={new Date(set.updatedAt).toLocaleDateString()}
                ctaLabel={ctaLabelFor("flashcard-set")}
                className="w-72"
              />
            ))}
            {flashcardSets.length < MIN_CAROUSEL_LENGTH ? (
              <VerticalEmptyCard href="/dashboard/flashcards" label="Create a flashcard set" className="w-72" />
            ) : null}
          </StaticCarousel>
        )}
      </DashboardSection>

      <DashboardSection
        title="Browse your architecture diagrams."
        description="Every diagram you've built, ready to open."
      >
        {showSkeleton ? (
          <PosterCardSkeletonRow />
        ) : !diagrams ? null : (
          <StaticCarousel>
            {diagrams.slice(0, 8).map((diagram) => (
              <PosterCard
                key={diagram.id}
                href={`/dashboard/diagram/${diagram.id}`}
                icon={iconFor("diagram")}
                coverImageUrl={diagram.coverImageUrl}
                title={diagram.name}
                description={diagram.description}
                date={new Date(diagram.updatedAt).toLocaleDateString()}
                ctaLabel={ctaLabelFor("diagram")}
                className="w-72"
              />
            ))}
            {diagrams.length < MIN_CAROUSEL_LENGTH ? (
              <VerticalEmptyCard href="/dashboard/diagrams" label="Create a diagram" className="w-72" />
            ) : null}
          </StaticCarousel>
        )}
      </DashboardSection>

      <DashboardSection
        title="See what other learners are exploring."
        description="Public diagrams and flashcard sets from across Flowdeck."
      >
        {showSkeleton ? (
          <PosterCardSkeletonRow />
        ) : !popular ? null : popular.length === 0 ? (
          <p className="text-muted-foreground text-center text-base">No public sets or diagrams yet.</p>
        ) : (
          // Same card size/shape as the static carousels above, just
          // animated — the only visual difference should be the motion.
          // Slower duration (default is 32s) so it reads as ambient rather
          // than busy.
          <Marquee pauseOnHover className="[--duration:70s]">
            {popular.map((item) => (
              <PosterCard
                key={`${item.type}-${item.id}`}
                href={itemHref(item)}
                icon={iconFor(item.type)}
                coverImageUrl={item.coverImageUrl}
                title={item.name}
                description={item.description}
                date={new Date(item.updatedAt).toLocaleDateString()}
                ctaLabel={ctaLabelFor(item.type)}
              />
            ))}
          </Marquee>
        )}
      </DashboardSection>
    </div>
  );
}
