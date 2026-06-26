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
    name: { type: String, required: true, unique: true },
    nodes: { type: [diagramNodeSchema], default: [] },
    edges: { type: [diagramEdgeSchema], default: [] },
  },
  { timestamps: true },
);

export type DiagramDoc = InferSchemaType<typeof diagramSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Guard against model re-compilation during Next.js HMR.
export const Diagram: Model<DiagramDoc> =
  (mongoose.models.Diagram as Model<DiagramDoc> | undefined) ??
  mongoose.model<DiagramDoc>("Diagram", diagramSchema);
