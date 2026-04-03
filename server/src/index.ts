import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { sendError } from './utils/response';

import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';
import recordRoutes from './routes/record.routes';
import uploadRoutes from './routes/upload.routes';
import dashboardRoutes from './routes/dashboard.routes';
import fileRoutes from './routes/file.routes';
import publicRoutes from './routes/public.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: null, message: 'GAD Database API is running' });
});

// Public routes (no auth required)
app.use('/api/public', publicRoutes);

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  sendError(res, err.message || 'Internal server error', 500);
});

app.listen(PORT, () => {
  console.log(`GAD Database API running on port ${PORT}`);
});

export default app;
