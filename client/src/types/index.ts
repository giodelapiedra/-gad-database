export type Role = 'ADMIN' | 'ENCODER';
export type Status = 'ACTIVE' | 'PENDING' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  head: string;
  isActive: boolean;
  _count?: { records: number };
  createdAt: string;
}

export interface Record {
  id: string;
  name: string;
  department: Department;
  departmentId: string;
  year: number;
  status: Status;
  data: globalThis.Record<string, unknown>;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadLog {
  id: string;
  department: Department;
  year: number;
  fileName: string;
  inserted: number;
  skipped: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errors: string[];
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalFiles: number;
  totalSize: number;
  totalDepartments: number;
  departments: DepartmentStat[];
}

export interface DepartmentStat {
  id: string;
  name: string;
  code: string;
  color: string;
  total: number;
}
