import type { ReactNode } from "react";
import Image from "next/image";

/**
 * Centered layout for the login and register pages.
 * @param props Contains the page content as `children`.
 * @returns The auth shell wrapping the page.
 */
export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex items-center gap-2">
        <Image src="/brand/icon-color.svg" alt="" width={44} height={44} className="h-11 w-11 rounded-lg" />
        <span className="text-lg font-bold">Flowdeck</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
