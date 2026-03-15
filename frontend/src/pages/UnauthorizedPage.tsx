import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-gray-900">403 Unauthorized</h1>
      <Link
        to="/login"
        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
      >
        Back to home
      </Link>
    </div>
  );
}
