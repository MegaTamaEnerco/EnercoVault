import mongoose, { Schema, Document as MongooseDoc, Model, Types } from 'mongoose';

export interface IAuditLog extends MongooseDoc {
  actorId?: Types.ObjectId;
  actorUsername?: string;
  actorRole?: string;
  impersonatedBy?: Types.ObjectId;
  action: string;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  reason?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorUsername: {
      type: String,
      trim: true,
    },
    actorRole: {
      type: String,
      trim: true,
    },
    impersonatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: {
        type: String,
        required: true,
      },
      id: String,
      name: String,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'DENIED', 'FAILED'],
      default: 'SUCCESS',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only!
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
