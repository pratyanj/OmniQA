import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import BugListPage from '@/pages/BugListPage';
import BugDetailPage from '@/pages/BugDetailPage';
import BugCreatePage from '@/pages/BugCreatePage';
import BugEditPage from '@/pages/BugEditPage';
import VerificationQueuePage from '@/pages/VerificationQueuePage';
import ReportsPage from '@/pages/ReportsPage';
import AdminPage from '@/pages/AdminPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,          element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',    element: <DashboardPage /> },
      { path: 'projects',     element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'bugs',         element: <BugListPage /> },
      { path: 'bugs/new',     element: <BugCreatePage /> },
      { path: 'bugs/:id',     element: <BugDetailPage /> },
      { path: 'bugs/:id/edit',element: <BugEditPage /> },
      { path: 'verify',       element: <VerificationQueuePage /> },
      { path: 'reports',      element: <ReportsPage /> },
      { path: 'admin',        element: <AdminPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
