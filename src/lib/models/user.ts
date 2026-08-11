import mongoose, { type Model, type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    /** Light/dark for the diagram canvas specifically — the app shell
     * itself is dark-only with no theming, so this is the only place a
     * user picks between light and dark. */
    diagramCanvasMode: { type: String, enum: ["dark", "light"] },
  },
  { timestamps: true },
);

userSchema.index({ name: "text", email: "text" });

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Guard against model re-compilation during Next.js HMR.
export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc> | undefined) ??
  mongoose.model<UserDoc>("User", userSchema);
