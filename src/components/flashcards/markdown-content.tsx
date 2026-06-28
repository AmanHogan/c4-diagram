import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders flashcard front/back text as markdown — headings, bold/italic,
 * bullet/numbered lists, links, and images (standard `![alt](url)` syntax;
 * no upload, just a URL). Images are capped so they never blow out a card's
 * fixed height.
 * @param props The raw markdown source and optional extra classes.
 * @returns The rendered markdown.
 */
export function MarkdownContent({ content, className }: MarkdownContentProps): React.JSX.Element {
  return (
    <div className={cn("prose prose-sm prose-invert max-w-none break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URLs, not local assets
            <img src={src} alt={alt ?? ""} className="mx-auto max-h-40 rounded-md object-contain" />
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
