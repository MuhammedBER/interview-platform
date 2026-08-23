import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './app/AppShell';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './features/dashboard/DashboardPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
