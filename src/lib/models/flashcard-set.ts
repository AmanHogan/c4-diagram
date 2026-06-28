import mongoose, { type Model, type InferSchemaType } from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
  },
  { _id: false },
);

const flashcardSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    forkedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "FlashcardSet", default: null },
    lastOpenedAt: { type: Date, default: Date.now },
    cards: { type: [flashcardSchema], default: [] },
  },
  { timestamps: true },
);

flashcardSetSchema.index({ ownerId: 1, name: 1 });
flashcardSetSchema.index({ visibility: 1, updatedAt: -1 });
flashcardSetSchema.index({ name: "text", description: "text" });

export type FlashcardSetDoc = InferSchemaType<typeof flashcardSetSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Guard against model re-compilation during Next.js HMR.
export const FlashcardSet: Model<FlashcardSetDoc> =
  (mongoose.models.FlashcardSet as Model<FlashcardSetDoc> | undefined) ??
  mongoose.model<FlashcardSetDoc>("FlashcardSet", flashcardSetSchema);
