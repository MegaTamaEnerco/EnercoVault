import mongoose, { Schema, Document as MongooseDoc, Model, Types } from 'mongoose';

export interface ICompanyConfig {
  companyName: string;
  systemName: string;
  tagline: string;
  headerSubtext: string;
  copyrightText: string;
  officeLocation?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export interface ISystemSetting extends MongooseDoc {
  key: string;
  value: Record<string, unknown>;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

systemSettingSchema.index({ key: 1 });

export const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting ||
  mongoose.model<ISystemSetting>('SystemSetting', systemSettingSchema);
