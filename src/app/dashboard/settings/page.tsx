import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { ThemeSection } from "@/components/theme/theme-section";

/**
 * Settings page: account info (visible only to you) plus theme
 * customization. Reached via the avatar menu, not the main sidebar.
 * @returns The rendered page.
 */
export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-3xl font-bold">Settings</h1>
      <p className="mb-6 text-base text-muted-foreground">
        Visible only to you — this is different from your public profile.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Account</h2>
        <div className="flex flex-col gap-3 rounded-xl border-2 border-border/60 bg-card p-5">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-base font-semibold">{session?.user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-base font-semibold">{session?.user?.email}</p>
          </div>
        </div>
        <Link
          href={`/dashboard/users/${session?.user?.id}`}
          className="mt-3 inline-flex items-center gap-1.5 text-base text-primary hover:underline"
        >
          View your public profile <ExternalLink className="h-4 w-4" />
        </Link>
      </section>

      <section>
        <ThemeSection />
      </section>
    </div>
  );
}
