/**
 * A faint, fixed radial glow tinted with the primary color, blurred and
 * pinned to a top corner — the same "spotlight behind the content" trick
 * tweakcn.com uses (an absolutely/fixed-positioned, low-opacity, heavily
 * blurred gradient div, `pointer-events-none` so it never intercepts
 * clicks). Purely decorative; renders once per dashboard page load.
 * @returns The rendered glow element.
 */
export function PageGlow(): React.JSX.Element {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -top-32 right-[-10%] -z-10 h-[480px] w-[480px] rounded-full bg-primary/[0.08] blur-[120px]"
    />
  );
}
