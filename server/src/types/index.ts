import { Request } from 'express';

export enum Role {
  ADMIN = 'ADMIN',
  ENCODER = 'ENCODER',
}

export enum Status {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  INACTIVE = 'INACTIVE',
}

export enum UploadStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
