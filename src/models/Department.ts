import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';

export interface IDepartment extends MongooseDoc {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>('Department', departmentSchema);
