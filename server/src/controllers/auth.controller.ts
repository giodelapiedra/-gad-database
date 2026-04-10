import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/db';
import { AuthRequest, Role } from '../types';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const msg = getFirstZodError(parsed.error);
      sendError(res, msg);
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      sendError(res, 'Invalid credentials.', 401);
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      sendError(res, 'Invalid credentials.', 401);
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated.', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    sendSuccess(res, user, 'User retrieved successfully');
  } catch (error) {
    console.error('Me error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

function getFirstZodError(error: z.ZodError): string {
  try {
    if (error.issues && error.issues.length > 0) {
      return error.issues[0].message;
    }
    const parsed = JSON.parse(error.message);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].message;
    }
  } catch {
    // fallback
  }
  return 'Invalid request data';
}
