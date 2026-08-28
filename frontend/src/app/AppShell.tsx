import { NavLink, Outlet } from 'react-router-dom';
import { logout } from '../lib/keycloak';

const navLinkBase =
  'block rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900';
const navLinkActive = 'bg-blue-50 text-blue-700';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-20 w-60 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-sm font-semibold text-blue-600">Interview Platform</span>
        </div>
        <nav className="space-y-1 px-3 py-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/interviews"
            className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}
          >
            Interviews
          </NavLink>
          <NavLink
            to="/positions"
            className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}
          >
            Positions
          </NavLink>
        </nav>
      </aside>

      <header className="fixed left-60 right-0 top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <span className="text-sm font-semibold text-gray-900">Recruiter Cockpit</span>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Logout
        </button>
      </header>

      <main className="ml-60 pt-14">
        <div className="mx-auto max-w-[1200px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
