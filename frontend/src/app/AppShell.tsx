import { Outlet } from 'react-router-dom';
import { logout } from '../lib/keycloak';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-20 w-60 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-sm font-semibold text-blue-600">Interview Platform</span>
        </div>
        <nav className="px-4 py-4">
          <p className="text-xs text-gray-500">Navigation placeholder — screens arrive in a later step.</p>
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
