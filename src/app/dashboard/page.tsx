import Link from "next/link";
import { Network } from "lucide-react";
import { auth } from "@/lib/auth";

/**
 * Dashboard landing page: a greeting plus a link into the diagram canvas.
 * @returns The rendered dashboard home.
 */
export default async function DashboardHome(): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Model and explore your infrastructure as an expandable node diagram.
      </p>

      <Link
        href="/dashboard/diagram"
        className="group flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Network className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-medium leading-tight">Diagram</h3>
          <p className="text-sm text-muted-foreground">
            Hardware, cluster networking, namespaces, and external access — drag, connect, expand.
          </p>
        </div>
      </Link>
    </div>
  );
}
