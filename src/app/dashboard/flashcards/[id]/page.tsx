import { FlashcardSetView } from "@/components/flashcards/flashcard-set-view";

interface FlashcardSetPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Flashcard set page: editor for owners, study mode for everyone.
 * @param props Route params containing the flashcard set's id.
 * @returns The rendered page.
 */
export default async function FlashcardSetPage({ params }: FlashcardSetPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  return <FlashcardSetView setId={id} />;
}
