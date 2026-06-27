import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute, roleFallback } from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';

import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import DepartmentDetailPage from '@/pages/departments/DepartmentDetailPage';
import AllRecordsPage from '@/pages/records/AllRecordsPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import UploadHistoryPage from '@/pages/upload/UploadHistoryPage';
import ResourcesPage from '@/pages/resources/ResourcesPage';
import UsersPage from '@/pages/admin/UsersPage';
import TemplatesPage from '@/pages/templates/TemplatesPage';
import MySubmissionsPage from '@/pages/submissions/MySubmissionsPage';
import SubmissionsReviewPage from '@/pages/submissions/SubmissionsReviewPage';
import SubmissionViewPage from '@/pages/submissions/SubmissionViewPage';
import SubmissionEditPage from '@/pages/submissions/SubmissionEditPage';
import AdminHubPage from '@/pages/AdminHubPage';
import HGDGPage from '@/pages/hgdg/HGDGPage';

// ── Smart root redirect based on the user's role ──────────────────────────
function RoleRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#71717A]" />
      </div>
    );
  }
  return <Navigate to={roleFallback(user?.role)} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Root → smart redirect per role */}
              <Route path="/" element={<RoleRedirect />} />

              {/* ── Any authenticated user ──────────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route path="/hgdg" element={<HGDGPage />} />
              </Route>

              {/* ── ENCODER only ────────────────────────────────────────── */}
              <Route element={<ProtectedRoute roles={['ENCODER']} />}>
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/my-submissions" element={<MySubmissionsPage />} />
                <Route path="/my-submissions/:id" element={<SubmissionViewPage />} />
                <Route path="/my-submissions/:id/edit" element={<SubmissionEditPage />} />
              </Route>

              {/* ── ADMIN only ──────────────────────────────────────────── */}
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/home"                  element={<AdminHubPage />} />
                <Route path="/submissions"           element={<SubmissionsReviewPage />} />
                <Route path="/submissions/:id"       element={<SubmissionViewPage />} />
                <Route path="/submissions/:id/edit"  element={<SubmissionEditPage />} />
                <Route path="/dashboard"            element={<DashboardPage />} />
                <Route path="/departments/:code"    element={<DepartmentDetailPage />} />
                <Route path="/records"              element={<AllRecordsPage />} />
                <Route path="/reports"              element={<ReportsPage />} />
                <Route path="/upload-history"       element={<UploadHistoryPage />} />
                <Route path="/resources"            element={<ResourcesPage />} />
                <Route path="/admin/users"          element={<UsersPage />} />
              </Route>

              {/* Catch-all → smart redirect per role */}
              <Route path="*" element={<RoleRedirect />} />
            </Routes>

            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
