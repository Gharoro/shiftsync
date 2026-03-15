import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { connectSocket } from '../../socket/socket.client';
import * as authApi from '../../api/auth.api';

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return 'Login failed';
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message) && message[0]) return String(message[0]);
  if (typeof message === 'string') return message;
  return 'Login failed';
}

function LoginIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      <div className="max-w-md px-12 text-center">
        <div className="mx-auto w-32 h-32 rounded-2xl bg-slate-600/50 flex items-center justify-center mb-8">
          <svg className="w-16 h-16 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white tracking-tight">Workforce management</h2>
        <p className="mt-2 text-slate-300 text-sm">Schedule shifts, manage staff, and keep your team in sync.</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { token, user, setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  const dismissError = useCallback(() => setError(null), []);

  if (token && user) {
    const to = user.role === 'ADMIN' ? '/admin' : user.role === 'MANAGER' ? '/manager' : '/staff';
    return <Navigate to={to} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.login(email, password);
      const body = res.data as {
        data?: {
          access_token: string;
          user: { id: string; email: string; full_name: string; role: string; is_active: boolean; created_at: string };
        };
      };
      const payload = body?.data;
      if (!payload?.access_token || !payload?.user) {
        setError('Invalid response from server');
        setSubmitting(false);
        return;
      }
      setAuth(payload.access_token, {
        id: payload.user.id,
        email: payload.user.email,
        full_name: payload.user.full_name,
        role: payload.user.role as 'ADMIN' | 'MANAGER' | 'STAFF',
        is_active: payload.user.is_active,
        created_at: payload.user.created_at,
      });
      connectSocket(payload.access_token);
      const to = payload.user.role === 'ADMIN' ? '/admin' : payload.user.role === 'MANAGER' ? '/manager' : '/staff';
      navigate(to, { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <LoginIllustration />
      </div>
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">ShiftSync</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8">
            {error !== null && (
              <div
                className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={dismissError}
                  className="shrink-0 rounded p-0.5 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 cursor-pointer"
                  aria-label="Dismiss"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Use your work email and password to continue.
          </p>
          <p className="mt-2 text-center">
            <Link to="/test-accounts" className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
              View test accounts
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
