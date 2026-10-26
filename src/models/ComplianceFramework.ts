import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';

export type ComplianceCategory = 'QUALITY' | 'ENVIRONMENT' | 'OHS' | 'LEGAL' | 'INTEGRATED';

export type HLSGroup =
  | 'CONTEXT_OF_ORGANIZATION'
  | 'LEADERSHIP'
  | 'PLANNING'
  | 'SUPPORT'
  | 'OPERATION'
  | 'PERFORMANCE_EVALUATION'
  | 'IMPROVEMENT';

export interface IClause {
  clauseNumber: string;
  parentClause?: string;
  title: string;
  hlsGroup?: HLSGroup;
  mandatoryDocumentHint?: string;
  description?: string;
}

export interface IComplianceFramework extends MongooseDoc {
  code: string;
  name: string;
  category: ComplianceCategory;
  version: string;
  badgeColor: string;
  isActive: boolean;
  clauses: IClause[];
  createdAt: Date;
  updatedAt: Date;
}

const clauseSchema = new Schema<IClause>(
  {
    clauseNumber: { type: String, required: true, trim: true },
    parentClause: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    hlsGroup: {
      type: String,
      enum: [
        'CONTEXT_OF_ORGANIZATION',
        'LEADERSHIP',
        'PLANNING',
        'SUPPORT',
        'OPERATION',
        'PERFORMANCE_EVALUATION',
        'IMPROVEMENT',
      ],
    },
    mandatoryDocumentHint: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const complianceFrameworkSchema = new Schema<IComplianceFramework>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['QUALITY', 'ENVIRONMENT', 'OHS', 'LEGAL', 'INTEGRATED'],
      required: true,
    },
    version: { type: String, required: true, trim: true },
    badgeColor: { type: String, default: '#2563eb' },
    isActive: { type: Boolean, default: true },
    clauses: [clauseSchema],
  },
  {
    timestamps: true,
  }
);

complianceFrameworkSchema.index({ category: 1 });

export const ComplianceFramework: Model<IComplianceFramework> =
  mongoose.models.ComplianceFramework ||
  mongoose.model<IComplianceFramework>('ComplianceFramework', complianceFrameworkSchema);
