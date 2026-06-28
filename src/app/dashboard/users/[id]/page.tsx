"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Layers, Network } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  diagrams: { id: string; name: string; updatedAt: string }[];
  flashcardSets: { id: string; name: string; updatedAt: string; cardCount: number }[];
}

interface UserProfilePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Public profile page: a user's name plus the diagrams and flashcard sets
 * they've made public.
 * @param props Route params containing the user's id.
 * @returns The rendered page.
 */
export default function UserProfilePage({ params }: UserProfilePageProps): React.JSX.Element {
  const { id } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const res = await fetch(`/api/users/${id}`);
      if (res.status === 404) {
        if (!cancelled) setNotFound(true);
        return;
      }
      const data = (await res.json()) as UserProfile;
      if (!cancelled) setProfile(data);
    };
    void load();
    return (): void => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return <div className="mx-auto max-w-2xl text-sm text-muted-foreground">User not found.</div>;
  }
  if (!profile) {
    return <div className="mx-auto max-w-2xl text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {profile.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-2xl font-semibold">{profile.name}</h1>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Public diagrams
        </h2>
        {profile.diagrams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public diagrams yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.diagrams.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/diagram/${d.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary"
                >
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{d.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Public flashcard sets
        </h2>
        {profile.flashcardSets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public flashcard sets yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.flashcardSets.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/flashcards/${s.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary"
                >
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.cardCount} cards</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
