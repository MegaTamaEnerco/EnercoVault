import mongoose from 'mongoose';
import { AuditLog } from '@/models/AuditLog';
import { SessionUser } from './rbac';
import { connectDB } from './db';

export interface AuditParams {
  actor?: SessionUser | null;
  action: string;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  status?: 'SUCCESS' | 'DENIED' | 'FAILED';
  reason?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: params.actor?.id ? new mongoose.Types.ObjectId(params.actor.id) : undefined,
      actorUsername: params.actor?.username || 'SYSTEM',
      actorRole: params.actor?.roleCodes?.[0] || 'ANONYMOUS',
      impersonatedBy: params.actor?.impersonatedBy ? new mongoose.Types.ObjectId(params.actor.impersonatedBy) : undefined,
      action: params.action,
      resource: params.resource,
      status: params.status || 'SUCCESS',
      reason: params.reason,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('[AuditLog Error]: Failed to persist audit record:', err);
  }
}
