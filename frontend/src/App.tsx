import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppShell from './app/AppShell';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './features/dashboard/DashboardPage';
import PositionEditorPage from './features/positions/PositionEditorPage';
import PositionsListPage from './features/positions/PositionsListPage';
import InterviewDetailPage from './features/interviews/InterviewDetailPage';
import InterviewListPage from './features/interviews/InterviewListPage';
import ScheduleInterviewPage from './features/interviews/ScheduleInterviewPage';
import CandidateRoomPage from './features/room/CandidateRoomPage';
import InterviewRoomPage from './features/room/InterviewRoomPage';
import JoinPage from './features/join/JoinPage';

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
  {
    path: '/join/:token',
    element: <JoinPage />,
  },
  {
    path: '/join/:token/room',
    element: <CandidateRoomPage />,
  },
  {
    path: '/room/:id',
    element: (
      <ProtectedRoute>
        <InterviewRoomPage />
      </ProtectedRoute>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
