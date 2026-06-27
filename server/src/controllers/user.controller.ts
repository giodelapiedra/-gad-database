import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'ENCODER']).default('ENCODER'),
  departmentId: z.string().optional(),
}).refine((d) => d.role !== 'ENCODER' || !!(d.departmentId && d.departmentId.length > 0), {
  message: 'Encoders must be assigned a department.',
  path: ['departmentId'],
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['ADMIN', 'ENCODER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  departmentId: z.string().nullable().optional(),
});

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, users, 'Users retrieved successfully');
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0].message);
      return;
    }

    const { name, email, password, role, departmentId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email is already in use.', 409);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, ...(departmentId ? { departmentId } : {}) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    });

    sendSuccess(res, user, 'User created successfully', 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    // Prevent self-deactivation
    if (req.user?.id === id && req.body.isActive === false) {
      sendError(res, 'You cannot deactivate your own account.');
      return;
    }

    // Prevent self-role-downgrade
    if (req.user?.id === id && req.body.role === 'ENCODER') {
      sendError(res, 'You cannot change your own role.');
      return;
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0].message);
      return;
    }

    const { name, role, isActive, password, departmentId } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    if (departmentId !== undefined) updateData.departmentId = departmentId ?? null;

    if (Object.keys(updateData).length === 0) {
      sendError(res, 'No fields to update.');
      return;
    }

    // An encoder must always have a department. Check the effective role/dept
    // (the incoming change, falling back to the user's current values).
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, departmentId: true },
    });
    if (!existingUser) { sendError(res, 'User not found.', 404); return; }

    const effectiveRole = role ?? existingUser.role;
    const effectiveDept = departmentId !== undefined ? (departmentId ?? null) : existingUser.departmentId;
    if (effectiveRole === 'ENCODER' && !effectiveDept) {
      sendError(res, 'Encoders must be assigned a department.');
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, user, 'User updated successfully');
  } catch (error) {
    console.error('Update user error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;

    if (req.user?.id === id) {
      sendError(res, 'You cannot delete your own account.');
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'User not found.', 404);
      return;
    }

    await prisma.user.delete({ where: { id } });
    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
