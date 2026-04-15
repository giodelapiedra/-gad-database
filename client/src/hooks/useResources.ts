import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

export interface ResourceFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { children: number; files: number };
  createdBy: { name: string };
}

export interface ResourceFile {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  folderId: string | null;
  url: string;
  createdAt: string;
  uploadedBy: { name: string };
}

interface FolderContents {
  folders: ResourceFolder[];
  files: ResourceFile[];
}

interface FolderDetail extends ResourceFolder {
  breadcrumb: { id: string; name: string }[];
}

export function useGetFolderContents(parentId?: string | null) {
  const qs = parentId ? `?parentId=${parentId}` : '';
  return useQuery({
    queryKey: ['resources', 'folders', parentId ?? 'root'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FolderContents>>(`/resources/folders${qs}`);
      return res.data.data;
    },
  });
}

export function useGetFolder(id: string | null) {
  return useQuery({
    queryKey: ['resources', 'folder', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FolderDetail>>(`/resources/folders/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      const res = await api.post<ApiResponse<ResourceFolder>>('/resources/folders', { name, parentId: parentId || null });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await api.put<ApiResponse<ResourceFolder>>(`/resources/folders/${id}`, { name });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<null>>(`/resources/folders/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useUploadResourceFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formData,
      onProgress,
    }: {
      formData: FormData;
      onProgress?: (pct: number) => void;
    }) => {
      const res = await api.post<ApiResponse<ResourceFile[]>>('/resources/files', formData, {
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useRenameResourceFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await api.put<ApiResponse<ResourceFile>>(`/resources/files/${id}`, { name });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useMoveResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fileIds?: string[]; folderIds?: string[]; targetFolderId: string | null }) => {
      const res = await api.post<ApiResponse<{ movedFiles: number; movedFolders: number }>>('/resources/move', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useBulkDeleteResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fileIds?: string[]; folderIds?: string[] }) => {
      const res = await api.post<ApiResponse<{ deletedFiles: number; deletedFolders: number }>>('/resources/bulk-delete', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useDeleteResourceFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<ApiResponse<null>>(`/resources/files/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Recycle Bin
// ---------------------------------------------------------------------------

export interface TrashedFolder extends ResourceFolder {
  deletedAt: string;
}

export interface TrashedFile extends ResourceFile {
  deletedAt: string;
}

interface TrashContents {
  folders: TrashedFolder[];
  files: TrashedFile[];
}

export function useGetTrashContents(enabled = true) {
  return useQuery({
    queryKey: ['resources', 'trash'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TrashContents>>('/resources/trash');
      return res.data.data;
    },
    enabled,
  });
}

export function useRestoreResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fileIds?: string[]; folderIds?: string[] }) => {
      const res = await api.post<ApiResponse<{ restoredFiles: number; restoredFolders: number }>>(
        '/resources/trash/restore',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function usePermanentDeleteResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fileIds?: string[]; folderIds?: string[] }) => {
      const res = await api.post<ApiResponse<{ deletedFiles: number; deletedFolders: number }>>(
        '/resources/trash/purge',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<null>>('/resources/trash/empty');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
