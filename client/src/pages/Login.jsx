import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function CheckIcon() {
  return (
    <svg className="size-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

const FEATURES = [
  'Role-scoped dashboards for admins, managers & agents',
  'Assigned customer portfolio management',
  'Loan recovery tracking with real-time balances',
  'Collection activity logs with full audit trail',
];

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ─────────────────────────────── */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0d1e26] p-12 lg:flex"
        style={{
          backgroundImage:
            'radial-gradient(circle at 70% 30%, rgba(26,158,127,0.15) 0%, transparent 60%), ' +
            'radial-gradient(circle at 20% 80%, rgba(26,158,127,0.08) 0%, transparent 50%)',
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative">
          <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Collecta
          </span>
          <h1 className="mt-6 max-w-sm text-4xl font-bold leading-tight text-white">
            Debt collection operations in one workspace.
          </h1>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-sm text-slate-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} Collecta. Internal use only.
        </p>
      </div>

      {/* ── Right panel ────────────────────────────── */}
      <div className="flex w-full items-center justify-center bg-[#f4f7f6] p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <p className="mb-8 text-center text-sm font-semibold tracking-widest text-slate-500 uppercase lg:hidden">
            Collecta
          </p>

          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/60">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1.5 text-sm text-slate-500">Access your collection workspace.</p>

            {error ? (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200/60">
                <svg className="mt-0.5 size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="form-label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    className="form-input pr-11"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 text-base"
              >
                {submitting ? (
                  <>
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                <span>admin@demo.com</span><span className="text-slate-400">password123</span>
                <span>manager@demo.com</span><span className="text-slate-400">password123</span>
                <span>agent1@demo.com</span><span className="text-slate-400">password123</span>
                <span>agent2@demo.com</span><span className="text-slate-400">password123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
