interface ListPageHeaderProps {
  /** A full sentence, styled the same white-to-grey gradient as the
   * dashboard's section titles — keeps the two feeling like one app. */
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Page title + muted subtitle, in the same gradient-text idiom as the
 * dashboard's section headings, plus an optional action slot (the "New"
 * button) on the right. Shared by the diagrams/flashcards/folders list
 * pages so they read as one consistent app instead of three different ones.
 * @param props The title/description copy and an optional right-aligned action.
 * @returns The rendered header.
 */
export function ListPageHeader({ title, description, action }: ListPageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {title}
        </h1>
        <p className="mt-1.5 text-base text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
