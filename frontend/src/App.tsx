import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './app/AppShell';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './features/dashboard/DashboardPage';
import PositionEditorPage from './features/positions/PositionEditorPage';
import PositionsListPage from './features/positions/PositionsListPage';
import InterviewDetailPage from './features/interviews/InterviewDetailPage';
import InterviewListPage from './features/interviews/InterviewListPage';
import ScheduleInterviewPage from './features/interviews/ScheduleInterviewPage';

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
      {
        path: 'interviews',
        element: <InterviewListPage />,
      },
      {
        path: 'interviews/new',
        element: <ScheduleInterviewPage />,
      },
      {
        path: 'interviews/:id',
        element: <InterviewDetailPage />,
      },
      {
        path: 'positions',
        element: <PositionsListPage />,
      },
      {
        path: 'positions/new',
        element: <PositionEditorPage />,
      },
      {
        path: 'positions/:id',
        element: <PositionEditorPage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
