import mongoose, { Schema, Document, Model } from "mongoose";
import { DocumentType } from "./DocumentTemplate";

export interface IIssuedDocumentDocument extends Document {
  templateId: mongoose.Types.ObjectId;
  templateVersion: number;
  documentType: DocumentType;
  title: string;
  recipientInternId: mongoose.Types.ObjectId;
  recipientSnapshot: {
    name: string;
    email: string;
    internId: string;
    department?: string;
  };
  variables: Record<string, string>;
  renderedContent: string;
  pdfBase64?: string;
  documentHash: string; // SHA-256 integrity hash
  issueDate: Date;
  issuedByAdminId: mongoose.Types.ObjectId;
  issuedByAdminName: string;
  signatoryName: string;
  signatoryTitle: string;
  status: "issued" | "revoked" | "replaced";
  revokedAt?: Date;
  revocationReason?: string;
  replacedByDocumentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IssuedDocumentSchema = new Schema<IIssuedDocumentDocument>(
  {
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "DocumentTemplate",
      required: true,
      index: true,
    },
    templateVersion: {
      type: Number,
      required: true,
    },
    documentType: {
      type: String,
      enum: ["offer_letter", "completion_certificate", "recommendation_letter"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    recipientInternId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientSnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      internId: { type: String, required: true },
      department: String,
    },
    variables: {
      type: Schema.Types.Mixed,
      required: true,
    },
    renderedContent: {
      type: String,
      required: true,
    },
    pdfBase64: {
      type: String,
    },
    documentHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    issuedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedByAdminName: {
      type: String,
      required: true,
    },
    signatoryName: {
      type: String,
      required: true,
    },
    signatoryTitle: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["issued", "revoked", "replaced"],
      default: "issued",
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    revocationReason: {
      type: String,
    },
    replacedByDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "IssuedDocument",
    },
  },
  {
    timestamps: true,
  }
);

IssuedDocumentSchema.index({ recipientInternId: 1, documentType: 1 });

export const IssuedDocument: Model<IIssuedDocumentDocument> =
  mongoose.models.IssuedDocument ||
  mongoose.model<IIssuedDocumentDocument>("IssuedDocument", IssuedDocumentSchema);
