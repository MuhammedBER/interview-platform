import { useMemo } from 'react';

export type RefusalVariant = 'expired' | 'revoked' | 'used' | 'not_found';

export interface RefusalScreenProps {
  variant: RefusalVariant;
  recruiterEmail?: string;
}

interface RefusalCopy {
  heading: string;
  body: string;
}

const REFUSAL_COPY: Record<RefusalVariant, RefusalCopy> = {
  expired: {
    heading: 'This link has expired.',
    body: 'The join window for this link has passed — a link only works around the scheduled time.',
  },
  revoked: {
    heading: 'This link is no longer valid.',
    body: 'A newer invitation may have been sent. Check your email for the most recent link.',
  },
  used: {
    heading: 'This link has already been used.',
    body: 'This interview has already been joined from this link.',
  },
  not_found: {
    heading: "We couldn't find this interview.",
    body: 'The link may be incomplete or mistyped.',
  },
};

export default function RefusalScreen({ variant, recruiterEmail }: RefusalScreenProps) {
  const copy = useMemo(() => REFUSAL_COPY[variant] ?? REFUSAL_COPY.not_found, [variant]);
  const canEmailRecruiter = typeof recruiterEmail === 'string' && recruiterEmail.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <svg
          aria-hidden="true"
          className="mx-auto h-10 w-10 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>

        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{copy.heading}</h1>

        <p className="mt-3 text-sm text-gray-600">{copy.body}</p>

        {canEmailRecruiter ? (
          <a
            href={`mailto:${recruiterEmail}`}
            className="mt-6 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Email the recruiter
          </a>
        ) : (
          <p className="mt-6 text-sm text-gray-600">
            Reply to your invitation email and the recruiter who scheduled the interview will help.
          </p>
        )}
      </div>
    </div>
  );
}