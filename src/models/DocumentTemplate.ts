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
  pdfTemplatePath?: string;
  pageDimensions?: {
    width: number;
    height: number;
  };
  dynamicFields?: string[];
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
    pdfTemplatePath: {
      type: String,
      default: "public/vyorai_base_template.pdf",
    },
    pageDimensions: {
      width: { type: Number, default: 1296 },
      height: { type: Number, default: 1836 },
    },
    dynamicFields: {
      type: [String],
      default: [
        "candidate_name",
        "intern_id",
        "date",
        "role",
        "work_mode",
        "start_date",
        "end_date",
        "responsibilities",
        "company_name",
        "signatory_name",
        "signatory_title",
        "company_address",
        "company_email",
        "company_phone",
        "company_website",
      ],
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
