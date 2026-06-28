import mongoose, { type Model, type InferSchemaType } from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

folderSchema.index({ ownerId: 1, name: 1 });

export type FolderDoc = InferSchemaType<typeof folderSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Guard against model re-compilation during Next.js HMR.
export const Folder: Model<FolderDoc> =
  (mongoose.models.Folder as Model<FolderDoc> | undefined) ??
  mongoose.model<FolderDoc>("Folder", folderSchema);
