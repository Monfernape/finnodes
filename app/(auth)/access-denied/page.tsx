import Link from "next/link";

const AccessDeniedPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
        <p className="mt-3 text-sm text-gray-600">
          Your GitHub account is not on the allowlist. Please contact the admin
          if you think this is a mistake.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center text-sm font-medium text-gray-900 underline underline-offset-4"
        >
          Return to login
        </Link>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
