import mongoose, { Schema, Document as MongooseDoc, Model, Types } from 'mongoose';
import './Taxonomy';
import './Department';
import './User';

export type AccessLevel = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL';
export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'OBSOLETE' | 'EXPIRED';

export interface IComplianceMapping {
  frameworkCode: string;
  clauses: string[];
}

export interface IFileRecord {
  versionId: Types.ObjectId;
  versionNumber: number;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  qrVerificationToken: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
  changeSummary?: string;
}

export interface IDocumentEntity extends MongooseDoc {
  docNumber: string;
  title: string;
  taxonomyId: Types.ObjectId;
  taxonomySnapshot?: {
    name: string;
    codePrefix: string;
    colorTheme?: string;
  };
  departmentId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  accessLevel: AccessLevel;
  status: DocumentStatus;
  currentVersion: number;
  effectiveDate?: Date;
  nextReviewDate?: Date;
  complianceMappings: IComplianceMapping[];
  customAttributes: Record<string, unknown>;
  bundleIds: Types.ObjectId[];
  currentFile?: IFileRecord;
  revisionHistory: IFileRecord[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const complianceMappingSchema = new Schema<IComplianceMapping>(
  {
    frameworkCode: { type: String, required: true },
    clauses: [{ type: String, required: true }],
  },
  { _id: false }
);

const fileRecordSchema = new Schema<IFileRecord>(
  {
    versionId: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    versionNumber: { type: Number, required: true },
    storagePath: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, default: 'application/pdf' },
    sha256Hash: { type: String, required: true },
    qrVerificationToken: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    changeSummary: { type: String },
  },
  { _id: false }
);

const documentSchema = new Schema<IDocumentEntity>(
  {
    docNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    taxonomyId: { type: Schema.Types.ObjectId, ref: 'Taxonomy', required: true },
    taxonomySnapshot: {
      name: String,
      codePrefix: String,
      colorTheme: String,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    accessLevel: {
      type: String,
      enum: ['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'],
      default: 'INTERNAL',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_REVIEW', 'ACTIVE', 'OBSOLETE', 'EXPIRED'],
      default: 'DRAFT',
      required: true,
    },
    currentVersion: { type: Number, default: 1 },
    effectiveDate: { type: Date },
    nextReviewDate: { type: Date },
    complianceMappings: [complianceMappingSchema],
    customAttributes: { type: Schema.Types.Mixed, default: {} },
    bundleIds: [{ type: Schema.Types.ObjectId, ref: 'Bundle' }],
    currentFile: fileRecordSchema,
    revisionHistory: [fileRecordSchema],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ taxonomyId: 1, status: 1 });
documentSchema.index({ departmentId: 1, accessLevel: 1 });
documentSchema.index({ 'complianceMappings.frameworkCode': 1 });
documentSchema.index({ 'complianceMappings.clauses': 1 });
documentSchema.index({ isDeleted: 1, status: 1 });
documentSchema.index({ title: 'text', docNumber: 'text' });
// Wildcard index for dynamic custom attributes:
documentSchema.index({ 'customAttributes.$**': 1 });

export const DocumentModel: Model<IDocumentEntity> =
  mongoose.models.Document || mongoose.model<IDocumentEntity>('Document', documentSchema);
