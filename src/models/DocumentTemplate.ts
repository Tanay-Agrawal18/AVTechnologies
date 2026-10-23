import mongoose, { Schema, Document, Model } from "mongoose";

export type DocumentType = "offer_letter" | "completion_certificate" | "recommendation_letter";

export interface IDocumentTemplateDocument extends Document {
  name: string;
  type: DocumentType;
  title: string;
  content: string; // Markdown/HTML/Plaintext template with {{placeholder}} variables
  companyName: string;
  signatoryName: string;
  signatoryTitle: string;
  version: number;
  isActive: boolean;
  createdByAdminId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentTemplateSchema = new Schema<IDocumentTemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["offer_letter", "completion_certificate", "recommendation_letter"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
      default: "AV Technologies Ltd.",
    },
    signatoryName: {
      type: String,
      required: true,
      default: "Director of People & Talent",
    },
    signatoryTitle: {
      type: String,
      required: true,
      default: "Authorized Signatory",
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DocumentTemplate: Model<IDocumentTemplateDocument> =
  mongoose.models.DocumentTemplate ||
  mongoose.model<IDocumentTemplateDocument>("DocumentTemplate", DocumentTemplateSchema);
