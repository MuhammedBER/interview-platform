import type { ReactNode } from 'react';

interface ErrorBannerProps {
  title?: string;
  children: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function ErrorBanner({ title, children, onRetry, retrying }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <p>{children}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      ) : null}
    </div>
  );
}
