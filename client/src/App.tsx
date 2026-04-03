import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import DepartmentDetailPage from '@/pages/departments/DepartmentDetailPage';
import AllRecordsPage from '@/pages/records/AllRecordsPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import UploadHistoryPage from '@/pages/upload/UploadHistoryPage';

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/departments/:code" element={<DepartmentDetailPage />} />
              <Route path="/records" element={<AllRecordsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/upload-history" element={<UploadHistoryPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>

          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
