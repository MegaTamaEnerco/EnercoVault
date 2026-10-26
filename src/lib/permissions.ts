export const RESOURCES = [
  'dashboard',
  'ims_matrix',
  'document',
  'bundle',
  'dcr',
  'taxonomy',
  'framework',
  'user',
  'role',
  'department',
  'audit_log',
  'system',
] as const;

export type Resource = (typeof RESOURCES)[number];

export const PERMISSIONS = [
  // Super Admin wildcard
  '*:*',

  // Dashboard
  'dashboard:view',

  // IMS Matrix
  'ims_matrix:view',
  'ims_matrix:export',

  // Documents
  'document:*',
  'document:view',
  'document:view_confidential',
  'document:view_archive',
  'document:create',
  'document:update',
  'document:delete',
  'document:download',
  'document:download_original',
  'document:print',

  // Bundles
  'bundle:*',
  'bundle:view',
  'bundle:create',
  'bundle:update',
  'bundle:delete',
  'bundle:export_zip',

  // DCR
  'dcr:*',
  'dcr:view',
  'dcr:create',
  'dcr:review_technical',
  'dcr:review_doccontrol',
  'dcr:approve_final',
  'dcr:override',
  'dcr:cancel',

  // Taxonomy & Form Builder
  'taxonomy:*',
  'taxonomy:view',
  'taxonomy:manage',

  // Compliance Frameworks
  'framework:*',
  'framework:view',
  'framework:manage',

  // Users
  'user:*',
  'user:view',
  'user:create',
  'user:update',
  'user:delete',
  'user:reset_password',
  'user:unlock',
  'user:impersonate',

  // Roles
  'role:*',
  'role:view',
  'role:manage',

  // Departments
  'department:*',
  'department:view',
  'department:manage',

  // Audit Log
  'audit_log:*',
  'audit_log:view',
  'audit_log:export',

  // System
  'system:*',
  'system:settings',
  'system:backup',
  'system:restore',
  'system:storage_maintenance',
] as const;

export type Permission = (typeof PERMISSIONS)[number] | `${string}:${string}`;

export type DataScope = 'ALL' | 'DEPARTMENT' | 'OWN';

export interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  permissions: Permission[];
  dataScope: DataScope;
  isSystem: boolean;
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Pemilik sistem & IT Admin. Memiliki seluruh privilege di semua fitur (*:*).',
    permissions: ['*:*'],
    dataScope: 'ALL',
    isSystem: true,
  },
  {
    code: 'CORPORATE_SECRETARY',
    name: 'Corporate Secretary & Document Controller',
    description: 'Pengendali dokumen korporat, tata naskah, registrasi, dan form builder.',
    permissions: [
      'dashboard:view',
      'ims_matrix:view',
      'ims_matrix:export',
      'document:*',
      'bundle:*',
      'dcr:view',
      'dcr:create',
      'dcr:review_doccontrol',
      'taxonomy:*',
      'framework:view',
      'user:view',
      'user:create',
      'user:update',
      'department:view',
      'audit_log:view',
    ],
    dataScope: 'ALL',
    isSystem: true,
  },
  {
    code: 'QHSE_MANAGER',
    name: 'QHSE Manager / Koordinator IMS',
    description: 'Penanggung jawab kepatuhan standar SMK3, ISO 9001, 14001, 45001 dan review teknis.',
    permissions: [
      'dashboard:view',
      'ims_matrix:view',
      'ims_matrix:export',
      'document:view',
      'document:view_archive',
      'document:download',
      'document:print',
      'bundle:view',
      'bundle:create',
      'dcr:view',
      'dcr:create',
      'dcr:review_technical',
      'taxonomy:view',
      'framework:*',
      'department:view',
    ],
    dataScope: 'ALL',
    isSystem: true,
  },
  {
    code: 'DEPT_MANAGER',
    name: 'Department / Unit Manager',
    description: 'Manajer divisi/proyek. Akses dokumen dan review teknis DCR pada unit kerjanya.',
    permissions: [
      'dashboard:view',
      'document:view',
      'document:download',
      'document:print',
      'bundle:view',
      'dcr:view',
      'dcr:create',
      'dcr:review_technical',
      'taxonomy:view',
      'framework:view',
    ],
    dataScope: 'DEPARTMENT',
    isSystem: true,
  },
  {
    code: 'PRESIDENT_DIRECTOR',
    name: 'President Director / Top Management',
    description: 'Manajemen puncak dengan hak akses pengesahan akhir (final approval) dan seluruh dokumen.',
    permissions: [
      'dashboard:view',
      'ims_matrix:view',
      'ims_matrix:export',
      'document:view',
      'document:view_confidential',
      'document:view_archive',
      'document:download',
      'document:print',
      'bundle:view',
      'dcr:view',
      'dcr:approve_final',
      'taxonomy:view',
      'framework:view',
      'audit_log:view',
    ],
    dataScope: 'ALL',
    isSystem: true,
  },
  {
    code: 'AUDITOR',
    name: 'Internal & External Auditor',
    description: 'Auditor read-only: matriks IMS, daftar dokumen aktif & arsip lama, export bundle audit.',
    permissions: [
      'dashboard:view',
      'ims_matrix:view',
      'ims_matrix:export',
      'document:view',
      'document:view_archive',
      'document:download',
      'bundle:view',
      'bundle:export_zip',
      'dcr:view',
      'taxonomy:view',
      'framework:view',
      'audit_log:view',
      'audit_log:export',
    ],
    dataScope: 'ALL',
    isSystem: true,
  },
  {
    code: 'CONTRIBUTOR',
    name: 'Document Contributor / Staff',
    description: 'Staf penyusun dokumen: usulan DCR, akses dokumen umum dan internal ber-watermark.',
    permissions: [
      'dashboard:view',
      'document:view',
      'document:download',
      'bundle:view',
      'dcr:view',
      'dcr:create',
      'taxonomy:view',
      'framework:view',
    ],
    dataScope: 'DEPARTMENT',
    isSystem: true,
  },
  {
    code: 'VIEWER',
    name: 'Viewer / Field Worker',
    description: 'Pekerja lapangan/pengguna umum: baca & download dokumen publik/internal terkendali.',
    permissions: [
      'document:view',
      'document:download',
      'bundle:view',
      'taxonomy:view',
    ],
    dataScope: 'ALL',
    isSystem: true,
  },
];
