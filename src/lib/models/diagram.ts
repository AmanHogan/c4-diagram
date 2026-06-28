import mongoose, { type Model, type InferSchemaType } from "mongoose";

const diagramNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, required: true },
    label: { type: String, required: true },
    parentId: { type: String, default: null },
    expanded: { type: Boolean, default: false },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    size: {
      width: { type: Number },
      height: { type: Number },
    },
    collapsedSize: {
      width: { type: Number },
      height: { type: Number },
    },
    description: { type: String },
    shape: { type: String },
    fillColor: { type: String },
    borderStyle: { type: String },
  },
  { _id: false },
);

const diagramEdgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    kind: { type: String, required: true },
    label: { type: String },
    lineStyle: { type: String },
    arrowStyle: { type: String },
  },
  { _id: false },
);

const diagramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    forkedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Diagram", default: null },
    lastOpenedAt: { type: Date, default: Date.now },
    nodes: { type: [diagramNodeSchema], default: [] },
    edges: { type: [diagramEdgeSchema], default: [] },
  },
  { timestamps: true },
);

diagramSchema.index({ ownerId: 1, name: 1 }, { unique: true });
diagramSchema.index({ visibility: 1, updatedAt: -1 });
diagramSchema.index({ name: "text" });

export type DiagramDoc = InferSchemaType<typeof diagramSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Guard against model re-compilation during Next.js HMR.
export const Diagram: Model<DiagramDoc> =
  (mongoose.models.Diagram as Model<DiagramDoc> | undefined) ??
  mongoose.model<DiagramDoc>("Diagram", diagramSchema);
