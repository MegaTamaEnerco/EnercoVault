import mongoose, { Schema, Document as MongooseDoc, Model, Types } from 'mongoose';

export type CustomFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'BOOLEAN'
  | 'TEXTAREA';

export interface ICustomFieldDefinition {
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  placeholder?: string;
  isRequired: boolean;
  isFilterable: boolean;
  defaultValue?: unknown;
}

export interface IWorkflowStep {
  step: number;
  role: string;
  permission: string;
  action: string;
}

export interface ITaxonomy extends MongooseDoc {
  name: string;
  slug: string;
  codePrefix: string;
  parentId?: Types.ObjectId;
  ancestors: Types.ObjectId[];
  icon?: string;
  colorTheme?: string;
  sortOrder: number;
  isActive: boolean;
  retentionConfig: {
    hasExpiry: boolean;
    defaultReviewMonths: number;
    alertDaysBeforeExpiry: number[];
    isMandatoryForCompliance: boolean;
  };
  accessPolicy?: {
    defaultAccessLevel: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL';
    allowedRolesToCreate?: string[];
  };
  customFieldsSchema: ICustomFieldDefinition[];
  defaultWorkflowTemplate: IWorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<ICustomFieldDefinition>(
  {
    fieldKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    fieldType: {
      type: String,
      enum: ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'TEXTAREA'],
      required: true,
    },
    options: [{ type: String, trim: true }],
    placeholder: { type: String, trim: true },
    isRequired: { type: Boolean, default: false },
    isFilterable: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const workflowStepSchema = new Schema<IWorkflowStep>(
  {
    step: { type: Number, required: true },
    role: { type: String, required: true },
    permission: { type: String, required: true },
    action: { type: String, required: true },
  },
  { _id: false }
);

const taxonomySchema = new Schema<ITaxonomy>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    codePrefix: { type: String, required: true, uppercase: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Taxonomy' },
    ancestors: [{ type: Schema.Types.ObjectId, ref: 'Taxonomy' }],
    icon: { type: String, default: 'FileText' },
    colorTheme: { type: String, default: '#3b82f6' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    retentionConfig: {
      hasExpiry: { type: Boolean, default: false },
      defaultReviewMonths: { type: Number, default: 12 },
      alertDaysBeforeExpiry: [{ type: Number }],
      isMandatoryForCompliance: { type: Boolean, default: false },
    },
    accessPolicy: {
      defaultAccessLevel: {
        type: String,
        enum: ['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'],
        default: 'INTERNAL',
      },
      allowedRolesToCreate: [{ type: String }],
    },
    customFieldsSchema: [customFieldSchema],
    defaultWorkflowTemplate: [workflowStepSchema],
  },
  {
    timestamps: true,
  }
);

taxonomySchema.index({ parentId: 1, sortOrder: 1 });

export const Taxonomy: Model<ITaxonomy> =
  mongoose.models.Taxonomy || mongoose.model<ITaxonomy>('Taxonomy', taxonomySchema);
