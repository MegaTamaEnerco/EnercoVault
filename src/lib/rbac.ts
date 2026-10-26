import { Permission, DataScope } from './permissions';

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleCodes: string[];
  permissions: Permission[];
  dataScope: DataScope;
  departmentId?: string;
  impersonatedBy?: string;
}

export class ForbiddenError extends Error {
  public requiredPermission: string;
  constructor(permission: string, message?: string) {
    super(message || `Akses ditolak: Anda membutuhkan izin '${permission}'`);
    this.name = 'ForbiddenError';
    this.requiredPermission = permission;
  }
}

/**
 * Check if a session user has a specific permission.
 * Super Admin with '*:*' always returns true.
 */
export function can(user: SessionUser | null | undefined, perm: Permission): boolean {
  if (!user || !user.permissions || user.permissions.length === 0) {
    return false;
  }

  // Super Admin wildcard: all privileges on all features
  if (user.permissions.includes('*:*')) {
    return true;
  }

  // Exact match
  if (user.permissions.includes(perm)) {
    return true;
  }

  // Resource-level wildcard match (e.g. 'document:*' matches 'document:view')
  const [resource] = perm.split(':');
  if (resource && user.permissions.includes(`${resource}:*` as Permission)) {
    return true;
  }

  return false;
}

/**
 * Check if a user has any of the listed permissions.
 */
export function hasAnyPermission(
  user: SessionUser | null | undefined,
  perms: Permission[]
): boolean {
  if (!user) return false;
  if (user.permissions.includes('*:*')) return true;
  return perms.some((p) => can(user, p));
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  return user.roleCodes.includes('SUPER_ADMIN') || user.permissions.includes('*:*');
}

/**
 * Generates MongoDB query filter for document access scoping based on user roles and permissions.
 */
export function documentScopeFilter(user: SessionUser) {
  const baseFilter: Record<string, unknown> = { isDeleted: false };

  // Super Admin bypasses all scope & confidentiality barriers
  if (isSuperAdmin(user)) {
    return baseFilter;
  }

  const canViewConfidential = can(user, 'document:view_confidential');

  // Classification levels user is permitted to view
  const visibleLevels = canViewConfidential
    ? ['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL']
    : ['PUBLIC', 'INTERNAL'];

  // Scope: OWN (only documents authored/owned by user)
  if (user.dataScope === 'OWN') {
    return {
      ...baseFilter,
      accessLevel: { $in: visibleLevels },
      ownerId: user.id,
    };
  }

  // Scope: DEPARTMENT (strictly matching department and permitted confidentiality level)
  if (user.dataScope === 'DEPARTMENT' && user.departmentId) {
    return {
      ...baseFilter,
      accessLevel: { $in: visibleLevels },
      departmentId: user.departmentId,
    };
  }

  // Scope: ALL (across all departments, strictly restricted by confidentiality clearance)
  return {
    ...baseFilter,
    accessLevel: { $in: visibleLevels },
  };
}

