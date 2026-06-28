import mongoose, { type Model, type InferSchemaType } from "mongoose";

const flashcardProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    setId: { type: mongoose.Schema.Types.ObjectId, ref: "FlashcardSet", required: true },
    cardId: { type: String, required: true },
    status: { type: String, enum: ["known", "learning"], required: true },
  },
  { timestamps: true },
);

// One status per (user, set, card) — keyed by cardId so editing card content
// (which keeps the same id) never disturbs a learner's tracked progress.
flashcardProgressSchema.index({ userId: 1, setId: 1, cardId: 1 }, { unique: true });

export type FlashcardProgressDoc = InferSchemaType<typeof flashcardProgressSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Guard against model re-compilation during Next.js HMR.
export const FlashcardProgress: Model<FlashcardProgressDoc> =
  (mongoose.models.FlashcardProgress as Model<FlashcardProgressDoc> | undefined) ??
  mongoose.model<FlashcardProgressDoc>("FlashcardProgress", flashcardProgressSchema);
