import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { login } from '../api/site';

interface AdminLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full border border-subtle rounded-md px-3 py-2 text-sm text-main bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm space-y-4">
        <button onClick={onBack} className="inline-flex items-center space-x-1.5 text-xs font-semibold text-muted hover:text-main">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </button>

        <form onSubmit={handleSubmit} className="bg-surface border border-subtle rounded-xl p-6 space-y-4 shadow-sm">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-main">Admin sign in</h1>
            <p className="text-xs text-muted">Sign in to edit the home page content.</p>
          </div>

          {error && (
            <div role="alert" className="bg-fail-bg text-fail border border-fail/20 rounded-md px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-username" className="block text-xs font-semibold text-main">
              Username
            </label>
            <input
              id="admin-username"
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-xs font-semibold text-main">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white py-2.5 rounded-md text-sm font-semibold"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
