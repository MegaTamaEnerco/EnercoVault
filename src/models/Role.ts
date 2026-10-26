import mongoose, { Schema, Document as MongooseDoc, Model } from 'mongoose';
import { Permission, DataScope } from '@/lib/permissions';

export interface IRole extends MongooseDoc {
  code: string;
  name: string;
  description?: string;
  permissions: Permission[];
  dataScope: DataScope;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    dataScope: {
      type: String,
      enum: ['ALL', 'DEPARTMENT', 'OWN'],
      default: 'ALL',
      required: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);
