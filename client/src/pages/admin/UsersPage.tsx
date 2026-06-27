import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  ShieldCheckIcon,
  UserIcon,
  KeyRoundIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UserRecord,
} from '@/hooks/useUsers';
import { useGetDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatters';

function getError(err: unknown, fallback: string) {
  if (err instanceof AxiosError && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return fallback;
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'ENCODER';
  departmentId: string;
}

function UserModal({
  open,
  onClose,
  editUser,
}: {
  open: boolean;
  onClose: () => void;
  editUser: UserRecord | null;
}) {
  const isEdit = !!editUser;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: departments } = useGetDepartments();

  const [form, setForm] = useState<UserFormState>({
    name: editUser?.name ?? '',
    email: editUser?.email ?? '',
    password: '',
    role: editUser?.role ?? 'ENCODER',
    departmentId: editUser?.departmentId ?? '',
  });
  const [showPass, setShowPass] = useState(false);

  // Keep form in sync when editUser changes
  const [lastEditId, setLastEditId] = useState<string | null>(null);
  if (editUser && editUser.id !== lastEditId) {
    setLastEditId(editUser.id);
    setForm({ name: editUser.name, email: editUser.email, password: '', role: editUser.role, departmentId: editUser.departmentId ?? '' });
  }
  if (!editUser && lastEditId !== null) {
    setLastEditId(null);
    setForm({ name: '', email: '', password: '', role: 'ENCODER', departmentId: '' });
  }

  const isPending = createUser.isPending || updateUser.isPending;

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (!isEdit && !form.password) {
      toast.error('Password is required for new users.');
      return;
    }
    if (form.role === 'ENCODER' && !form.departmentId) {
      toast.error('Encoders must be assigned a department.');
      return;
    }
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: editUser!.id,
          name: form.name,
          role: form.role,
          departmentId: form.departmentId || null,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('User updated successfully');
      } else {
        await createUser.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(form.departmentId ? { departmentId: form.departmentId } : {}),
        });
        toast.success('User account created successfully');
      }
      onClose();
    } catch (err) {
      toast.error(getError(err, isEdit ? 'Failed to update user' : 'Failed to create user'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User Account' : 'Create User Account'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the user\'s name, role, or reset their password.'
              : 'Fill in the details to create a new system account.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="u-name"
              placeholder="e.g. Maria Santos"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Email — read-only on edit */}
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email Address <span className="text-red-500">*</span></Label>
            <Input
              id="u-email"
              type="email"
              placeholder="e.g. maria@tanauan.gov.ph"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={isEdit}
              className={isEdit ? 'bg-[#F4F4F5] text-[#71717A]' : ''}
            />
            {isEdit && (
              <p className="text-[11px] text-[#A1A1AA]">Email cannot be changed after account creation.</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">
              {isEdit ? 'New Password' : 'Password'}{' '}
              {!isEdit && <span className="text-red-500">*</span>}
              {isEdit && <span className="text-[11px] text-[#A1A1AA] font-normal">(leave blank to keep current)</span>}
            </Label>
            <div className="relative">
              <Input
                id="u-pass"
                type={showPass ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#09090B]"
                tabIndex={-1}
              >
                {showPass ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role <span className="text-red-500">*</span></Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as 'ADMIN' | 'ENCODER' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENCODER">
                  <div className="flex items-center gap-2">
                    <UserIcon className="size-3.5" />
                    <span>Encoder</span>
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="size-3.5" />
                    <span>Admin</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[#A1A1AA]">
              {form.role === 'ADMIN'
                ? 'Admin can manage users, departments, and all system data.'
                : 'Encoder can upload records and manage beneficiary data.'}
            </p>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label>
              Department{' '}
              {form.role === 'ENCODER'
                ? <span className="text-[11px] font-normal text-red-500">(required)</span>
                : <span className="text-[11px] font-normal text-[#A1A1AA]">(optional)</span>}
            </Label>
            {(() => {
              const selectedDept = (departments ?? []).find(d => d.id === form.departmentId);
              return (
                <Select
                  value={form.departmentId || '__none__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedDept ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full shrink-0"
                            style={{ backgroundColor: selectedDept.color }}
                          />
                          <span>{selectedDept.name}</span>
                          <span className="text-[11px] text-[#A1A1AA]">({selectedDept.code})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {form.role === 'ENCODER' ? 'Select a department' : '— No department —'}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {form.role !== 'ENCODER' && (
                      <SelectItem value="__none__">— No department —</SelectItem>
                    )}
                    {(departments ?? []).filter((d) => d.isActive).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <span>{d.name}</span>
                          <span className="text-[11px] text-[#A1A1AA]">({d.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Account')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { data: users, isLoading } = useGetUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // Redirect non-admins
  useEffect(() => {
    if (me && me.role !== 'ADMIN') {
      navigate('/dashboard', { replace: true });
    }
  }, [me, navigate]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  function openCreate() {
    setEditUser(null);
    setModalOpen(true);
  }

  function openEdit(u: UserRecord) {
    setEditUser(u);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditUser(null);
  }

  async function handleToggleActive(u: UserRecord) {
    if (u.id === me?.id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    try {
      await updateUser.mutateAsync({ id: u.id, isActive: !u.isActive });
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
    } catch (err) {
      toast.error(getError(err, 'Failed to update user status'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      toast.success('User account deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getError(err, 'Failed to delete user'));
    }
  }

  const activeCount = users?.filter((u) => u.isActive).length ?? 0;
  const adminCount = users?.filter((u) => u.role === 'ADMIN').length ?? 0;

  return (
    <DashboardLayout title="User Management" breadcrumb="Admin / User Management">
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Total Users', value: users?.length ?? '—', icon: UserIcon, color: 'text-blue-600' },
          { label: 'Active', value: activeCount, icon: CheckCircleIcon, color: 'text-emerald-600' },
          { label: 'Admins', value: adminCount, icon: ShieldCheckIcon, color: 'text-violet-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-[10px] border border-[#EBEBEB] bg-white px-4 py-3">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F4F5] ${color}`}>
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#09090B]">{isLoading ? '—' : value}</p>
              <p className="text-[11px] text-[#71717A]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="mb-4 flex items-center gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B]">System Accounts</h2>
          <p className="text-[12px] text-[#71717A]">Manage who can access the GAD Database portal.</p>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="mr-1.5 size-4" />
          Create Account
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-[10px] border border-[#EBEBEB] bg-white">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_160px_120px_100px_100px] gap-4 border-b border-[#F4F4F5] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
          <span>Name</span>
          <span>Email</span>
          <span>Department</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-[#F4F4F5]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_160px_120px_100px_100px] gap-4 px-4 py-3">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-4 w-12 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="py-12 text-center">
            <UserIcon className="mx-auto mb-2 size-8 text-[#D4D4D8]" />
            <p className="text-[13px] text-[#71717A]">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F4F4F5]">
            {users.map((u) => {
              const isMe = u.id === me?.id;
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-[1fr_1fr_160px_120px_100px_100px] gap-4 items-center px-4 py-3 transition-colors hover:bg-[#FAFAFA]"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[11px] font-semibold text-[#71717A]">
                      {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#09090B]">
                        {u.name}
                        {isMe && (
                          <span className="ml-1.5 rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[10px] text-[#71717A]">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">Since {formatDate(u.createdAt)}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <p className="truncate text-[13px] text-[#52525B]">{u.email}</p>

                  {/* Department */}
                  <div className="min-w-0">
                    {u.department ? (
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] text-[#52525B]">{u.department.name}</span>
                        <span className="shrink-0 rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[10px] text-[#71717A]">{u.department.code}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#A1A1AA]">—</span>
                    )}
                  </div>

                  {/* Role badge */}
                  <div>
                    {u.role === 'ADMIN' ? (
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200">
                        <ShieldCheckIcon className="mr-1 size-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[#52525B]">
                        <UserIcon className="mr-1 size-3" />
                        Encoder
                      </Badge>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={u.isActive}
                      onCheckedChange={() => handleToggleActive(u)}
                      disabled={isMe || updateUser.isPending}
                      title={isMe ? 'Cannot deactivate your own account' : u.isActive ? 'Deactivate' : 'Activate'}
                    />
                    <span className={`text-[11px] ${u.isActive ? 'text-emerald-600' : 'text-[#A1A1AA]'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEdit(u)}
                      title="Edit user"
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeleteTarget(u)}
                      disabled={isMe}
                      title={isMe ? 'Cannot delete your own account' : 'Delete user'}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-[12px] text-amber-800">
          <strong>Security Note:</strong> Passwords are stored securely using bcrypt hashing. Admins can reset passwords but cannot view existing passwords.
          Deactivated accounts cannot log in but their data is preserved.
        </p>
      </div>

      {/* Create / Edit Modal */}
      <UserModal open={modalOpen} onClose={closeModal} editUser={editUser} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{deleteTarget?.name}</strong>'s account ({deleteTarget?.email})?
              This will remove the account entirely. Their uploaded records and files will remain.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
