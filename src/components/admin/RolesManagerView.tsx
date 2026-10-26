'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Crown,
  Lock,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  CheckSquare,
  Square,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { SessionUser } from '@/lib/rbac';
import { DataScope } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const PERMISSION_GROUPS: {
  resource: string;
  label: string;
  actions: { code: string; label: string }[];
}[] = [
  {
    resource: 'dashboard',
    label: '1. Executive Dasbor',
    actions: [{ code: 'dashboard:view', label: 'Lihat Dasbor Ringkasan' }],
  },
  {
    resource: 'ims_matrix',
    label: '2. Matriks Annex SL & SMK3',
    actions: [
      { code: 'ims_matrix:view', label: 'Lihat Matriks Klausul' },
      { code: 'ims_matrix:export', label: 'Ekspor Matriks CSV' },
    ],
  },
  {
    resource: 'document',
    label: '3. Pengendalian Dokumen',
    actions: [
      { code: 'document:view', label: 'Lihat Katalog & Baca Dokumen' },
      { code: 'document:view_confidential', label: 'Akses Dokumen CONFIDENTIAL' },
      { code: 'document:view_archive', label: 'Lihat Arsip Versi Lama' },
      { code: 'document:create', label: 'Terbitkan Dokumen Baru' },
      { code: 'document:update', label: 'Ubah Metadata Dokumen' },
      { code: 'document:delete', label: 'Hapus Dokumen (Soft Delete)' },
      { code: 'document:download', label: 'Unduh Salinan Terkendali (Watermarked)' },
      { code: 'document:download_original', label: 'Unduh File Asli (Tanpa Watermark)' },
      { code: 'document:print', label: 'Cetak Dokumen Terkendali' },
    ],
  },
  {
    resource: 'bundle',
    label: '4. Virtual Audit / Tender Bundles',
    actions: [
      { code: 'bundle:view', label: 'Lihat Bundel' },
      { code: 'bundle:create', label: 'Buat Bundel Baru' },
      { code: 'bundle:export_zip', label: 'Ekspor Bundel ke ZIP' },
    ],
  },
  {
    resource: 'dcr',
    label: '5. Workflow DCR (Document Change Request)',
    actions: [
      { code: 'dcr:view', label: 'Lihat Daftar DCR' },
      { code: 'dcr:create', label: 'Ajukan Permintaan Revisi (DCR)' },
      { code: 'dcr:review_technical', label: 'Review Teknis (Step 1)' },
      { code: 'dcr:review_doccontrol', label: 'Review Tata Naskah (Step 2)' },
      { code: 'dcr:approve_final', label: 'Pengesahan Akhir (Step 3)' },
      { code: 'dcr:override', label: 'Super Admin Force Approve (Override)' },
      { code: 'dcr:cancel', label: 'Batalkan Pengajuan DCR' },
    ],
  },
  {
    resource: 'taxonomy',
    label: '6. Taksonomi & Form Builder',
    actions: [
      { code: 'taxonomy:view', label: 'Lihat Taksonomi' },
      { code: 'taxonomy:manage', label: 'Kelola Kategori & Kolom Input Dinamis' },
    ],
  },
  {
    resource: 'framework',
    label: '7. Standar Kepatuhan & Klausul',
    actions: [
      { code: 'framework:view', label: 'Lihat Standar & Klausul' },
      { code: 'framework:manage', label: 'Kelola Standar ISO/SMK3 & Klausul' },
    ],
  },
  {
    resource: 'user',
    label: '8. Manajemen Pengguna',
    actions: [
      { code: 'user:view', label: 'Lihat Daftar Pengguna' },
      { code: 'user:create', label: 'Tambah Pengguna' },
      { code: 'user:update', label: 'Ubah Data & Peran Pengguna' },
      { code: 'user:delete', label: 'Hapus Pengguna' },
      { code: 'user:reset_password', label: 'Reset Password' },
      { code: 'user:unlock', label: 'Buka Kunci Akun (Unlock)' },
      { code: 'user:impersonate', label: 'Impersonasi Akun' },
    ],
  },
  {
    resource: 'role',
    label: '9. Manajemen Peran & RBAC',
    actions: [
      { code: 'role:view', label: 'Lihat Matriks Peran' },
      { code: 'role:manage', label: 'Konfigurasi Hak Akses & Peran' },
    ],
  },
  {
    resource: 'audit_log',
    label: '10. Audit Log & Pelacakan',
    actions: [
      { code: 'audit_log:view', label: 'Inspeksi Rekaman Jejak Audit' },
      { code: 'audit_log:export', label: 'Ekspor Audit Log ke CSV' },
    ],
  },
  {
    resource: 'system',
    label: '11. Konsol Sistem & Storage',
    actions: [
      { code: 'system:settings', label: 'Konfigurasi Sistem' },
      { code: 'system:backup', label: 'Unduh Snapshot Backup DB' },
      { code: 'system:storage_maintenance', label: 'Audit Checksum Integritas Storage' },
    ],
  },
];

export interface RolesManagerViewProps {
  initialRoles: any[];
  currentUser: SessionUser;
}

export function RolesManagerView({ initialRoles, currentUser }: RolesManagerViewProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [roles, setRoles] = useState<any[]>(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [dataScope, setDataScope] = useState<DataScope>('ALL');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isWildcard, setIsWildcard] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetModal = () => {
    setRoleCode('');
    setRoleName('');
    setDescription('');
    setDataScope('ALL');
    setSelectedPermissions([]);
    setIsWildcard(false);
    setEditingRoleId(null);
    setIsModalOpen(false);
  };

  const handleOpenAdd = () => {
    resetModal();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditingRoleId(role._id.toString());
    setRoleCode(role.code);
    setRoleName(role.name);
    setDescription(role.description || '');
    setDataScope(role.dataScope || 'ALL');
    const perms = role.permissions || [];
    setSelectedPermissions(perms);
    setIsWildcard(perms.includes('*:*'));
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleGroupAll = (groupActions: { code: string }[]) => {
    const codes = groupActions.map((a) => a.code);
    const allChecked = codes.every((c) => selectedPermissions.includes(c));

    if (allChecked) {
      setSelectedPermissions((prev) => prev.filter((p) => !codes.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleCode.trim() || !roleName.trim()) return;

    setSaving(true);
    setStatusMsg(null);

    const permsToSave = isWildcard ? ['*:*'] : selectedPermissions;

    try {
      const url = editingRoleId ? `/api/roles/${editingRoleId}` : '/api/roles';
      const method = editingRoleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roleCode.trim().toUpperCase(),
          name: roleName.trim(),
          description: description.trim(),
          dataScope,
          permissions: permsToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan peran');

      if (editingRoleId) {
        setRoles((prev) => prev.map((r) => (r._id.toString() === editingRoleId ? data : r)));
        setStatusMsg({ type: 'success', text: `Peran "${data.name}" berhasil diperbarui!` });
      } else {
        setRoles((prev) => [...prev, data]);
        setStatusMsg({ type: 'success', text: `Peran "${data.name}" berhasil didaftarkan!` });
      }

      resetModal();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (id: string, name: string) => {
    setRoleToDelete({ id, name });
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/roles/${roleToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus peran');

      setRoles((prev) => prev.filter((r) => r._id.toString() !== roleToDelete.id));
      toastSuccess(`Peran "${roleToDelete.name}" berhasil dihapus.`);
      setRoleToDelete(null);
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus peran.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xl animate-in fade-in duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Role-Based Access Control (RBAC) & Matriks Hak Akses
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Konfigurasi izin granular (resource:action) dan lingkup data (dataScope) per peran secara dinamis.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Peran Baru</span>
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role: any) => {
          const isSuper = role.code === 'SUPER_ADMIN' || (role.permissions || []).includes('*:*');

          return (
            <div
              key={role._id.toString()}
              className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                isSuper
                  ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/10 to-zinc-900/60'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">{role.name}</span>
                      {isSuper && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Crown className="w-3 h-3 text-amber-400" />
                          All Privileges
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500 mt-0.5">
                      Code: {role.code}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      Scope: {role.dataScope}
                    </span>
                    {role.isSystem && (
                      <span
                        title="Peran Sistem (Protected)"
                        className="p-1 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/80"
                      >
                        <Lock className="w-3 h-3 text-zinc-400" />
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-3 min-h-[28px]">
                  {role.description || 'Tidak ada deskripsi'}
                </p>

                <div className="pt-3 border-t border-zinc-800/80">
                  <div className="text-[11px] font-medium text-zinc-400 mb-2">
                    Daftar Izin Terdaftar ({role.permissions?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {(role.permissions || []).map((perm: string, pIdx: number) => (
                      <span
                        key={pIdx}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          perm === '*:*'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-zinc-800/60">
                <button
                  onClick={() => handleOpenEdit(role)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer interactive-tap"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Izin Peran</span>
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => handleDeleteRole(role._id.toString(), role.name)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer interactive-tap"
                    title="Hapus Peran Kustom"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Tambah / Edit Role & Granular Permissions */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-800 p-6 space-y-5 shadow-2xl bg-zinc-950">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingRoleId ? 'Edit Peran & Matriks Hak Akses' : 'Tambah Peran & Hak Akses Baru'}
                </h3>
              </div>
              <button
                onClick={resetModal}
                className="text-zinc-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Kode Peran (ROLE_CODE) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingRoleId)}
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: SITE_HSE_INSPECTOR"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono uppercase disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">
                    Nama Peran <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Contoh: Site HSE Inspector"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Deskripsi Tugas & Tanggung Jawab:</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi singkat fungsi peran ini dalam tata naskah"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Lingkup Data (Scope):</label>
                  <select
                    value={dataScope}
                    onChange={(e) => setDataScope(e.target.value as DataScope)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">ALL (Semua Departemen)</option>
                    <option value="DEPARTMENT">DEPARTMENT (Hanya Unitnya)</option>
                    <option value="OWN">OWN (Hanya Dokumen Sendiri)</option>
                  </select>
                </div>
              </div>

              {/* Wildcard All Privileges Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-amber-300">
                      Izin Penuh Super Admin (*:*)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Bypass seluruh verifikasi permission & berwenang di semua fitur.
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWildcard}
                    onChange={(e) => setIsWildcard(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Aktifkan Wildcard</span>
                </label>
              </div>

              {/* Granular Permission Matrix */}
              {!isWildcard && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Matriks Hak Akses Granular ({selectedPermissions.length} Izin Dipilih):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allCodes = PERMISSION_GROUPS.flatMap((g) => g.actions.map((a) => a.code));
                        setSelectedPermissions(allCodes);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      Centang Semua
                    </button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {PERMISSION_GROUPS.map((group) => {
                      const allGroupChecked = group.actions.every((a) =>
                        selectedPermissions.includes(a.code)
                      );

                      return (
                        <div
                          key={group.resource}
                          className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-200">
                              {group.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleGroupAll(group.actions)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                            >
                              {allGroupChecked ? 'Batal Semua' : 'Pilih Semua'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.actions.map((act) => {
                              const isChecked = selectedPermissions.includes(act.code);

                              return (
                                <label
                                  key={act.code}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2 cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600/15 border-blue-500/30 text-white'
                                      : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(act.code)}
                                    className="rounded text-blue-500"
                                  />
                                  <span>{act.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={resetModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Hak Akses Peran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={confirmDeleteRole}
        title={roleToDelete ? `Hapus Peran "${roleToDelete.name}"?` : 'Hapus Peran?'}
        description="Peran ini akan dihapus dari sistem. Pastikan tidak ada pengguna aktif yang masih bergantung pada peran ini."
        confirmText="Hapus Peran"
        cancelText="Batal"
        isDestructive={true}
        loading={deleteLoading}
      />
    </div>
  );
}
