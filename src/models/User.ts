import mongoose, { Schema, Document as MongooseDoc, Model, Types } from 'mongoose';
import './Role';
import './Department';

export interface IUser extends MongooseDoc {
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  roleIds: Types.ObjectId[];
  departmentId?: Types.ObjectId;
  isActive: boolean;
  twoFactor: {
    enabled: boolean;
    secret?: string;
  };
  security: {
    failedAttempts: number;
    lockedUntil: Date | null;
    sessionVersion: number;
    lastLoginAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Protected: never returned in query unless explicitly selected
    },
    roleIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
      },
    ],
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    twoFactor: {
      enabled: {
        type: Boolean,
        default: false,
      },
      secret: {
        type: String,
        select: false,
      },
    },
    security: {
      failedAttempts: {
        type: Number,
        default: 0,
      },
      lockedUntil: {
        type: Date,
        default: null,
      },
      sessionVersion: {
        type: Number,
        default: 1,
      },
      lastLoginAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).passwordHash;
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

userSchema.index({ roleIds: 1 });
userSchema.index({ departmentId: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
