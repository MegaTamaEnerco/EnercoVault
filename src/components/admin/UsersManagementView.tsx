'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Crown,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { SessionUser, isSuperAdmin } from '@/lib/rbac';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export interface UsersManagementViewProps {
  initialUsers: any[];
  roles: any[];
  departments: any[];
  currentUser: SessionUser;
}

export function UsersManagementView({
  initialUsers,
  roles,
  departments,
  currentUser,
}: UsersManagementViewProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add Form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Enerco2026!');
  const [newSelectedRoles, setNewSelectedRoles] = useState<string[]>([]);
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Form state
  const [editFullName, setEditFullName] = useState('');
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const handleOpenEdit = (user: any) => {
    setSelectedUserForEdit(user);
    setEditFullName(user.fullName || '');
    setEditSelectedRoles((user.roleIds || []).map((r: any) => r._id?.toString() || r.toString()));
    setEditDepartmentId(user.departmentId?._id?.toString() || user.departmentId?.toString() || '');
    setEditIsActive(Boolean(user.isActive));
    setEditNewPassword('');
    setEditError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsername || !newEmail || !newPassword || newSelectedRoles.length === 0) {
      setAddError('Harap lengkapi semua kolom wajib dan pilih minimal 1 role.');
      return;
    }

    setAddLoading(true);
    setAddError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName,
          username: newUsername,
          email: newEmail,
          password: newPassword,
          roleIds: newSelectedRoles,
          departmentId: newDepartmentId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan user');

      setUsers((prev) => [data.user, ...prev]);
      setIsAddModalOpen(false);
      toastSuccess(`Akun ${data.user.fullName} (@${data.user.username}) berhasil dibuat.`);

      // Reset form
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setNewSelectedRoles([]);
      setNewDepartmentId('');
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/users/${selectedUserForEdit._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName,
          roleIds: editSelectedRoles,
          departmentId: editDepartmentId || null,
          isActive: editIsActive,
          newPassword: editNewPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui user');

      setUsers((prev) =>
        prev.map((u) => (u._id?.toString() === data.user._id?.toString() ? data.user : u))
      );
      setSelectedUserForEdit(null);
      toastSuccess(`Data akun ${data.user.fullName} berhasil diperbarui.`);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleUnlock = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlock: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuka kunci akun');

      setUsers((prev) =>
        prev.map((u) => (u._id?.toString() === userId ? data.user : u))
      );
      toastSuccess('Kunci akun berhasil dibuka.');
    } catch (err: any) {
      toastError(err.message || 'Gagal membuka kunci akun');
    }
  };

  const handleDelete = (userId: string, name: string) => {
    setUserToDelete({ id: userId, name });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus user');

      setUsers((prev) => prev.filter((u) => u._id?.toString() !== userToDelete.id));
      toastSuccess(`Akun ${userToDelete.name} berhasil dihapus.`);
      setUserToDelete(null);
    } catch (err: any) {
      toastError(err.message || 'Terjadi kesalahan saat menghapus pengguna.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Manajemen Pengguna & Hak Akses (RBAC)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pengelolaan identitas terpadu, penugasan peran, dan proteksi akun karyawan.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setNewSelectedRoles([roles[0]?._id?.toString() || '']);
          }}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 interactive-tap shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>


      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari berdasarkan nama lengkap, username (@handle), atau email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
        />
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                <th className="py-3 px-4 font-medium">Pengguna</th>
                <th className="py-3 px-4 font-medium">Peran / Role</th>
                <th className="py-3 px-4 font-medium">Departemen</th>
                <th className="py-3 px-4 font-medium">Status Akun</th>
                <th className="py-3 px-4 font-medium">Keamanan</th>
                <th className="py-3 px-4 font-medium text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredUsers.map((u) => {
                const isSuper = (u.roleIds || []).some(
                  (r: any) => r.code === 'SUPER_ADMIN' || (r.permissions || []).includes('*:*')
                );
                const isLocked = u.security?.lockedUntil && new Date(u.security.lockedUntil) > new Date();

                return (
                  <tr key={u._id.toString()} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-medium text-white text-xs">
                          {u.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {isSuper && (
                              <span title="Super Admin">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            @{u.username} • {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(u.roleIds || []).map((r: any) => (
                          <span
                            key={r._id?.toString() || r.code}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              r.code === 'SUPER_ADMIN'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {r.name || r.code}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-400">
                      {u.departmentId?.name || 'Seluruh Korporat'}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isLocked ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-semibold">
                            <Lock className="w-3 h-3" />
                            Terkunci (5x Gagal)
                          </span>
                          <button
                            onClick={() => handleUnlock(u._id.toString())}
                            className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                          >
                            Buka Kunci
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">Normal</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 interactive-tap cursor-pointer"
                          title="Edit Pengguna & Peran"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(u._id.toString(), u.fullName)}
                          className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 interactive-tap cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-zinc-700/80 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Tambah Pengguna Baru</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="misal: Budi Santoso, S.T."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="budisantoso"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="budi@enerco.co.id"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Kata Sandi Awal</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Peran / Role (RBAC)</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = newSelectedRoles.includes(r._id.toString());
                    return (
                      <button
                        key={r._id.toString()}
                        type="button"
                        onClick={() => {
                          setNewSelectedRoles((prev) =>
                            isSelected ? prev.filter((id) => id !== r._id.toString()) : [...prev, r._id.toString()]
                          );
                        }}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div>{r.name}</div>
                        <div className="text-[9px] font-mono opacity-60">{r.code}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Departemen / Unit Kerja</label>
                <select
                  value={newDepartmentId}
                  onChange={(e) => setNewDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Seluruh Korporat (Tanpa Unit Khusus) --</option>
                  {departments.map((d) => (
                    <option key={d._id.toString()} value={d._id.toString()}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {addLoading ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-zinc-700/80 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Edit Pengguna: {selectedUserForEdit.fullName}</span>
              </h2>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Peran / Role (RBAC)</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = editSelectedRoles.includes(r._id.toString());
                    return (
                      <button
                        key={r._id.toString()}
                        type="button"
                        onClick={() => {
                          setEditSelectedRoles((prev) =>
                            isSelected ? prev.filter((id) => id !== r._id.toString()) : [...prev, r._id.toString()]
                          );
                        }}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div>{r.name}</div>
                        <div className="text-[9px] font-mono opacity-60">{r.code}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Departemen</label>
                <select
                  value={editDepartmentId}
                  onChange={(e) => setEditDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Seluruh Korporat --</option>
                  {departments.map((d) => (
                    <option key={d._id.toString()} value={d._id.toString()}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Reset Kata Sandi (Opsional)</label>
                  <input
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diganti"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Status Akun</label>
                  <select
                    value={editIsActive ? 'true' : 'false'}
                    onChange={(e) => setEditIsActive(e.target.value === 'true')}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? 'Menyimpan...' : 'Perbarui Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title={userToDelete ? `Hapus Akun ${userToDelete.name}?` : 'Hapus Akun Pengguna?'}
        description="Akun ini akan dinonaktifkan dan dihapus dari daftar pengguna aktif. Seluruh catatan audit masa lalu tetap dipertahankan."
        confirmText="Hapus Akun"
        cancelText="Batal"
        isDestructive={true}
        loading={deleteLoading}
      />
    </div>
  );
}
