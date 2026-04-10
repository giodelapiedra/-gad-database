import { useState, useRef, useCallback, useMemo } from 'react';
import {
  FolderIcon,
  FolderPlusIcon,
  UploadIcon,
  DownloadIcon,
  EyeIcon,
  Trash2Icon,
  ChevronRightIcon,
  HomeIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileIcon,
  PencilIcon,
  FolderOpenIcon,
  MoveIcon,
  CheckSquareIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import EmptyState from '@/components/shared/EmptyState';

import {
  useGetFolderContents,
  useGetFolder,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useUploadResourceFiles,
  useRenameResourceFile,
  useDeleteResourceFile,
  useMoveResources,
  useBulkDeleteResources,
  type ResourceFile,
  type ResourceFolder,
} from '@/hooks/useResources';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatters';
import { AxiosError } from 'axios';
import api from '@/lib/axios';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError && error.response?.data?.message) {
    return error.response.data.message;
  }
  return fallback;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileTextIcon className="size-5 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <FileSpreadsheetIcon className="size-5 text-emerald-600" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileTextIcon className="size-5 text-blue-600" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <FileTextIcon className="size-5 text-orange-500" />;
  if (mimeType.includes('image')) return <FileIcon className="size-5 text-purple-500" />;
  return <FileIcon className="size-5 text-[#71717A]" />;
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ENCODER';

  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Selection state
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Modal states
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameType, setRenameType] = useState<'folder' | 'file'>('folder');
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'file'; id: string; name: string } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data, isLoading } = useGetFolderContents(currentFolderId);
  const { data: folderDetail } = useGetFolder(currentFolderId);
  // Also fetch root folders for the move picker
  const { data: rootData } = useGetFolderContents(null);

  // Mutations
  const createFolder = useCreateFolder();
  const renameFolderMut = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const uploadFiles = useUploadResourceFiles();
  const renameFileMut = useRenameResourceFile();
  const deleteFile = useDeleteResourceFile();
  const moveResources = useMoveResources();
  const bulkDelete = useBulkDeleteResources();

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];
  const totalItems = folders.length + files.length;
  const totalSelected = selectedFolderIds.size + selectedFileIds.size;
  const allSelected = totalItems > 0 && totalSelected === totalItems;

  // Build breadcrumb
  const breadcrumb = currentFolderId && folderDetail
    ? [{ id: null as string | null, name: 'Resources' }, ...folderDetail.breadcrumb]
    : [{ id: null as string | null, name: 'Resources' }];

  // Clear selection on folder navigation
  const clearSelection = useCallback(() => {
    setSelectedFolderIds(new Set());
    setSelectedFileIds(new Set());
  }, []);

  const navigateToFolder = useCallback((folder: ResourceFolder) => {
    setCurrentFolderId(folder.id);
    clearSelection();
  }, [clearSelection]);

  const navigateToBreadcrumb = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    clearSelection();
  }, [clearSelection]);

  // Selection helpers
  const toggleFolderSelection = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleFileSelection = useCallback((id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  }, [allSelected, folders, files, clearSelection]);

  // Handlers
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder.mutateAsync({ name: newFolderName.trim(), parentId: currentFolderId });
      toast.success('Folder created');
      setNewFolderOpen(false);
      setNewFolderName('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create folder'));
    }
  };

  const handleRename = async () => {
    if (!renameTargetId || !renameName.trim()) return;
    try {
      if (renameType === 'folder') {
        await renameFolderMut.mutateAsync({ id: renameTargetId, name: renameName.trim() });
        toast.success('Folder renamed');
      } else {
        await renameFileMut.mutateAsync({ id: renameTargetId, name: renameName.trim() });
        toast.success('File renamed');
      }
      setRenameOpen(false);
      setRenameTargetId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to rename'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'folder') {
        await deleteFolder.mutateAsync(deleteTarget.id);
      } else {
        await deleteFile.mutateAsync(deleteTarget.id);
      }
      toast.success(`${deleteTarget.type === 'folder' ? 'Folder' : 'File'} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDelete.mutateAsync({
        fileIds: selectedFileIds.size > 0 ? Array.from(selectedFileIds) : undefined,
        folderIds: selectedFolderIds.size > 0 ? Array.from(selectedFolderIds) : undefined,
      });
      toast.success(`Deleted ${(result.deletedFiles ?? 0) + (result.deletedFolders ?? 0)} item(s)`);
      clearSelection();
      setBulkDeleteOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete items'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const formData = new FormData();
    if (currentFolderId) formData.append('folderId', currentFolderId);
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    try {
      setUploadProgress(0);
      await uploadFiles.mutateAsync({
        formData,
        onProgress: (pct) => setUploadProgress(pct),
      });
      toast.success(`${selectedFiles.length} file(s) uploaded`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload files'));
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleView = (file: ResourceFile) => {
    const ext = file.originalName.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.doc') || ext.endsWith('.docx') || ext.endsWith('.ppt') || ext.endsWith('.pptx')) {
      window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`, '_blank');
    } else {
      window.open(file.url, '_blank');
    }
  };

  const handleDownload = async (file: ResourceFile) => {
    try {
      const res = await api.get(`/resources/files/${file.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(file.url, '_blank');
    }
  };

  return (
    <DashboardLayout title="GAD Resources" breadcrumb="Tools / GAD Resources">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        {breadcrumb.map((crumb, idx) => (
          <div key={crumb.id ?? 'root'} className="flex items-center gap-1">
            {idx > 0 && <ChevronRightIcon className="size-3.5 text-[#A1A1AA]" />}
            <button
              onClick={() => navigateToBreadcrumb(crumb.id)}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-[#F4F4F5] ${
                idx === breadcrumb.length - 1
                  ? 'font-medium text-[#09090B]'
                  : 'text-[#71717A]'
              }`}
            >
              {idx === 0 && <HomeIcon className="size-3.5" />}
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center gap-2">
        {/* Select All */}
        {isAdmin && totalItems > 0 && (
          <Button
            variant={allSelected ? 'default' : 'outline'}
            size="sm"
            onClick={toggleSelectAll}
          >
            <CheckSquareIcon className="mr-1.5 size-4" />
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        )}

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setNewFolderName(''); setNewFolderOpen(true); }}
          >
            <FolderPlusIcon className="mr-1.5 size-4" />
            New Folder
          </Button>
        )}
        {canEdit && (
          <>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
            >
              <UploadIcon className="mr-1.5 size-4" />
              {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Upload Files'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      {isAdmin && totalSelected > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#18181B] bg-[#18181B] px-4 py-2.5 text-white">
          <span className="text-[13px] font-medium">
            {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
          </span>
          <div className="mx-2 h-4 w-px bg-white/20" />
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setMoveOpen(true)}
          >
            <MoveIcon className="mr-1.5 size-4" />
            Move to
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-300 hover:bg-white/10 hover:text-red-200"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2Icon className="mr-1.5 size-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-white/60 hover:bg-white/10 hover:text-white"
            onClick={clearSelection}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <EmptyState
          icon={FolderOpenIcon}
          title="Empty folder"
          subtitle={canEdit ? 'Create a folder or upload files to get started.' : 'No resources available yet.'}
        />
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {folders.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
                Folders ({folders.length})
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {folders.map((folder) => {
                  const isSelected = selectedFolderIds.has(folder.id);
                  return (
                    <div
                      key={folder.id}
                      className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:shadow-sm ${
                        isSelected
                          ? 'border-[#18181B] bg-[#F4F4F5] ring-1 ring-[#18181B]'
                          : 'border-[#EBEBEB] bg-white hover:border-[#D4D4D8]'
                      }`}
                      onClick={() => navigateToFolder(folder)}
                    >
                      {/* Selection checkbox */}
                      {isAdmin && (
                        <div
                          className={`absolute left-2 top-2 flex size-5 items-center justify-center rounded border transition-all ${
                            isSelected
                              ? 'border-[#18181B] bg-[#18181B]'
                              : 'border-[#D4D4D8] bg-white opacity-0 group-hover:opacity-100'
                          }`}
                          onClick={(e) => toggleFolderSelection(folder.id, e)}
                        >
                          {isSelected && (
                            <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      )}

                      <FolderIcon className="size-10 text-amber-400" fill="currentColor" />
                      <p className="w-full truncate text-center text-[13px] font-medium text-[#09090B]" title={folder.name}>
                        {folder.name}
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">
                        {folder._count.children + folder._count.files} item{folder._count.children + folder._count.files !== 1 ? 's' : ''}
                      </p>

                      {/* Folder actions */}
                      {isAdmin && (
                        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameType('folder');
                              setRenameTargetId(folder.id);
                              setRenameName(folder.name);
                              setRenameOpen(true);
                            }}
                            title="Rename"
                          >
                            <PencilIcon className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name });
                            }}
                            title="Delete"
                          >
                            <Trash2Icon className="size-3 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
                Files ({files.length})
              </p>
              <div className="rounded-[10px] border border-[#EBEBEB] bg-white">
                <div className="divide-y divide-[#F4F4F5]">
                  {files.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        className={`group flex items-center gap-3 px-4 py-3 transition-colors ${
                          isSelected ? 'bg-[#F4F4F5]' : 'hover:bg-[#FAFAFA]'
                        }`}
                      >
                        {/* Selection checkbox */}
                        {isAdmin && (
                          <div
                            className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-all ${
                              isSelected
                                ? 'border-[#18181B] bg-[#18181B]'
                                : 'border-[#D4D4D8] bg-white opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={() => toggleFileSelection(file.id)}
                          >
                            {isSelected && (
                              <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        )}

                        {getFileIcon(file.mimeType)}
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[13px] font-medium text-[#09090B] cursor-pointer hover:underline"
                            onClick={() => handleView(file)}
                            title={file.originalName}
                          >
                            {file.originalName}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA]">
                            {formatSize(file.size)} &middot; {file.uploadedBy.name} &middot; {formatDate(file.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon-xs" onClick={() => handleView(file)} title="View">
                            <EyeIcon className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDownload(file)} title="Download">
                            <DownloadIcon className="size-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setRenameType('file');
                                setRenameTargetId(file.id);
                                setRenameName(file.originalName);
                                setRenameOpen(true);
                              }}
                              title="Rename"
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setDeleteTarget({ type: 'file', id: file.id, name: file.originalName })}
                              title="Delete"
                            >
                              <Trash2Icon className="size-3.5 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={(o) => !o && setNewFolderOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={(o) => !o && setRenameOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename {renameType === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={renameType === 'folder' ? 'Folder name' : 'File name'}
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button
              onClick={handleRename}
              disabled={!renameName.trim() || renameFolderMut.isPending || renameFileMut.isPending}
            >
              {renameFolderMut.isPending || renameFileMut.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'folder' ? 'folder' : 'file'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === 'folder' && ' All contents inside will also be deleted.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteFolder.isPending || deleteFile.isPending}
            >
              {deleteFolder.isPending || deleteFile.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {totalSelected} item{totalSelected !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {totalSelected} selected item{totalSelected !== 1 ? 's' : ''}?
              {selectedFolderIds.size > 0 && ' All contents inside selected folders will also be deleted.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              {bulkDelete.isPending ? 'Deleting...' : `Delete ${totalSelected} item${totalSelected !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move To Folder Dialog */}
      <MoveToFolderDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        selectedFolderIds={selectedFolderIds}
        selectedFileIds={selectedFileIds}
        currentFolderId={currentFolderId}
        onSuccess={() => {
          clearSelection();
          setMoveOpen(false);
        }}
      />
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Move To Folder Dialog — folder picker tree
// ---------------------------------------------------------------------------

function MoveToFolderDialog({
  open,
  onClose,
  selectedFolderIds,
  selectedFileIds,
  currentFolderId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  selectedFolderIds: Set<string>;
  selectedFileIds: Set<string>;
  currentFolderId: string | null;
  onSuccess: () => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [browsingId, setBrowsingId] = useState<string | null>(null);
  const moveResources = useMoveResources();

  const { data } = useGetFolderContents(browsingId);
  const { data: browsingFolder } = useGetFolder(browsingId);

  // Filter out selected folders from the picker to prevent moving into self
  const availableFolders = useMemo(() => {
    return (data?.folders ?? []).filter((f) => !selectedFolderIds.has(f.id));
  }, [data?.folders, selectedFolderIds]);

  const breadcrumb = browsingId && browsingFolder
    ? [{ id: null as string | null, name: 'Resources' }, ...browsingFolder.breadcrumb]
    : [{ id: null as string | null, name: 'Resources' }];

  const handleMove = async () => {
    try {
      await moveResources.mutateAsync({
        fileIds: selectedFileIds.size > 0 ? Array.from(selectedFileIds) : undefined,
        folderIds: selectedFolderIds.size > 0 ? Array.from(selectedFolderIds) : undefined,
        targetFolderId: targetId,
      });
      toast.success('Items moved successfully');
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to move items'));
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setTargetId(null);
      setBrowsingId(null);
    }
  };

  const isCurrentLocation = targetId === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
        </DialogHeader>

        {/* Breadcrumb inside picker */}
        <div className="flex items-center gap-1 text-xs">
          {breadcrumb.map((crumb, idx) => (
            <div key={crumb.id ?? 'root'} className="flex items-center gap-1">
              {idx > 0 && <ChevronRightIcon className="size-3 text-[#A1A1AA]" />}
              <button
                onClick={() => { setBrowsingId(crumb.id); setTargetId(crumb.id); }}
                className={`rounded px-1 py-0.5 transition-colors hover:bg-[#F4F4F5] ${
                  idx === breadcrumb.length - 1 ? 'font-medium text-[#09090B]' : 'text-[#71717A]'
                }`}
              >
                {idx === 0 && <HomeIcon className="mr-1 inline size-3" />}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Folder list */}
        <div className="max-h-[300px] space-y-0.5 overflow-y-auto rounded-lg border border-[#EBEBEB] p-2">
          {/* Current location option */}
          <button
            onClick={() => setTargetId(browsingId)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
              targetId === browsingId
                ? 'bg-[#18181B] font-medium text-white'
                : 'text-[#71717A] hover:bg-[#F4F4F5]'
            }`}
          >
            <FolderOpenIcon className="size-4 shrink-0" />
            <span>Here (current view)</span>
          </button>

          {availableFolders.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#A1A1AA]">No subfolders</p>
          ) : (
            availableFolders.map((folder) => (
              <div key={folder.id} className="flex items-center">
                <button
                  onClick={() => setTargetId(folder.id)}
                  className={`flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                    targetId === folder.id
                      ? 'bg-[#18181B] font-medium text-white'
                      : 'text-[#71717A] hover:bg-[#F4F4F5]'
                  }`}
                >
                  <FolderIcon className="size-4 shrink-0 text-amber-400" fill="currentColor" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="text-[11px] opacity-60">
                    {folder._count.children + folder._count.files}
                  </span>
                </button>
                {(folder._count.children > 0) && (
                  <button
                    onClick={() => { setBrowsingId(folder.id); setTargetId(folder.id); }}
                    className="ml-1 rounded p-1 text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#09090B]"
                    title="Browse inside"
                  >
                    <ChevronRightIcon className="size-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleMove}
            disabled={moveResources.isPending || isCurrentLocation}
          >
            {moveResources.isPending ? 'Moving...' : 'Move here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
