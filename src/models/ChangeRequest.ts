import mongoose, { Schema, Document as MongooseDoc, Model, Types } from 'mongoose';
import './User';
import './Document';
import './Taxonomy';
import './Department';

export type DCRType = 'NEW_DOCUMENT' | 'REVISION' | 'OBSOLETE';
export type DCRStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface IApprovalHistoryItem {
  step: number;
  role: string;
  action: string;
  reviewerId: Types.ObjectId;
  status: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN';
  comment?: string;
  decidedAt: Date;
}

export interface IChangeRequest extends MongooseDoc {
  dcrNumber: string;
  title: string;
  type: DCRType;
  status: DCRStatus;
  targetDocumentId?: Types.ObjectId;
  proposedTaxonomyId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  initiatorId: Types.ObjectId;
  reasonForChange: string;
  currentStep: number;
  totalSteps: number;
  workflow: {
    step: number;
    role: string;
    permission: string;
    action: string;
  }[];
  history: IApprovalHistoryItem[];
  tempFilePath?: string;
  tempFileName?: string;
  proposedMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const approvalHistorySchema = new Schema<IApprovalHistoryItem>(
  {
    step: { type: Number, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['APPROVED', 'REJECTED', 'OVERRIDDEN'],
      required: true,
    },
    comment: { type: String, trim: true },
    decidedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const changeRequestSchema = new Schema<IChangeRequest>(
  {
    dcrNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['NEW_DOCUMENT', 'REVISION', 'OBSOLETE'],
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'DRAFT',
      required: true,
    },
    targetDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    proposedTaxonomyId: { type: Schema.Types.ObjectId, ref: 'Taxonomy', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reasonForChange: { type: String, required: true, trim: true },
    currentStep: { type: Number, default: 1 },
    totalSteps: { type: Number, default: 3 },
    workflow: [
      {
        step: Number,
        role: String,
        permission: String,
        action: String,
      },
    ],
    history: [approvalHistorySchema],
    tempFilePath: { type: String },
    tempFileName: { type: String },
    proposedMetadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

changeRequestSchema.index({ dcrNumber: 1 });
changeRequestSchema.index({ status: 1, currentStep: 1 });
changeRequestSchema.index({ initiatorId: 1 });

export const ChangeRequest: Model<IChangeRequest> =
  mongoose.models.ChangeRequest ||
  mongoose.model<IChangeRequest>('ChangeRequest', changeRequestSchema);
