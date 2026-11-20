import React, { useEffect, useState } from 'react';
import { ExternalLink, LogOut, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import {
  checkSession,
  clearToken,
  fetchSiteContent,
  saveSiteContent,
  SiteContent,
  UnauthorizedError,
} from '../api/site';

interface AdminDashboardProps {
  onViewSite: () => void;
  onLoggedOut: () => void;
}

const MAX_FEATURES = 12;

const inputClass =
  'w-full border border-subtle rounded-md px-3 py-2 text-sm text-main bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="block text-xs font-semibold text-main">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-muted">{hint}</span>}
  </label>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewSite, onLoggedOut }) => {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await checkSession())) {
        clearToken();
        onLoggedOut();
        return;
      }
      try {
        const data = await fetchSiteContent();
        if (!cancelled) setContent(data);
      } catch (err: any) {
        if (!cancelled) setStatus({ kind: 'error', text: err.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<SiteContent>) => {
    setContent((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setStatus(null);
  };

  const updateFeature = (index: number, patch: Partial<SiteContent['features'][number]>) => {
    if (!content) return;
    update({ features: content.features.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content) return;
    setSaving(true);
    setStatus(null);
    try {
      const saved = await saveSiteContent(content);
      setContent(saved);
      setDirty(false);
      setStatus({ kind: 'ok', text: 'Saved. The home page is updated.' });
    } catch (err: any) {
      if (err instanceof UnauthorizedError) {
        clearToken();
        onLoggedOut();
        return;
      }
      setStatus({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    onLoggedOut();
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <header className="bg-surface border-b border-subtle sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-main font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <span>Admin Dashboard</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onViewSite}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-muted hover:text-main px-3 py-2 rounded-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View site</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-muted hover:text-main px-3 py-2 rounded-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {!content && !status && <p className="text-sm text-muted">Loading…</p>}
        {!content && status && (
          <div role="alert" className="bg-fail-bg text-fail border border-fail/20 rounded-md px-3 py-2 text-sm">
            {status.text}
          </div>
        )}

        {content && (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-main">Home page content</h1>
              <p className="text-xs text-muted mt-1">
                {content.updated_at
                  ? `Last saved ${new Date(content.updated_at).toLocaleString()}`
                  : 'Showing the default content. Nothing has been saved yet.'}
              </p>
            </div>

            <section className="bg-surface border border-subtle rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-main">Announcement bar</h2>
              <Field label="Message" hint="Shown in a bar at the top of the home page. Leave empty to hide it.">
                <input
                  className={inputClass}
                  maxLength={200}
                  value={content.announcement}
                  onChange={(e) => update({ announcement: e.target.value })}
                />
              </Field>
            </section>

            <section className="bg-surface border border-subtle rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-main">Hero</h2>
              <Field label="Badge">
                <input
                  className={inputClass}
                  maxLength={80}
                  value={content.hero_badge}
                  onChange={(e) => update({ hero_badge: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Headline">
                  <input
                    className={inputClass}
                    maxLength={120}
                    required
                    value={content.hero_title}
                    onChange={(e) => update({ hero_title: e.target.value })}
                  />
                </Field>
                <Field label="Highlighted line" hint="Second line, shown in the brand color.">
                  <input
                    className={inputClass}
                    maxLength={120}
                    value={content.hero_highlight}
                    onChange={(e) => update({ hero_highlight: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Subtitle">
                <textarea
                  className={inputClass}
                  rows={4}
                  maxLength={600}
                  value={content.hero_subtitle}
                  onChange={(e) => update({ hero_subtitle: e.target.value })}
                />
              </Field>
              <Field label="Button label">
                <input
                  className={inputClass}
                  maxLength={40}
                  required
                  value={content.cta_label}
                  onChange={(e) => update({ cta_label: e.target.value })}
                />
              </Field>
            </section>

            <section className="bg-surface border border-subtle rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-main">Feature cards</h2>
              <Field label="Section heading">
                <input
                  className={inputClass}
                  maxLength={80}
                  value={content.features_heading}
                  onChange={(e) => update({ features_heading: e.target.value })}
                />
              </Field>

              {content.features.map((feature, index) => (
                <div key={index} className="border border-subtle rounded-lg p-4 space-y-3 bg-canvas">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted font-mono">
                      Card {String(index + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => update({ features: content.features.filter((_, i) => i !== index) })}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-fail hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                  <Field label="Title">
                    <input
                      className={inputClass}
                      maxLength={80}
                      required
                      value={feature.title}
                      onChange={(e) => updateFeature(index, { title: e.target.value })}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      className={inputClass}
                      rows={3}
                      maxLength={400}
                      value={feature.description}
                      onChange={(e) => updateFeature(index, { description: e.target.value })}
                    />
                  </Field>
                </div>
              ))}

              {content.features.length < MAX_FEATURES && (
                <button
                  type="button"
                  onClick={() => update({ features: [...content.features, { title: '', description: '' }] })}
                  className="inline-flex items-center space-x-1.5 border border-subtle bg-surface hover:bg-canvas text-main px-3 py-2 rounded-md text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add card</span>
                </button>
              )}
            </section>

            <section className="bg-surface border border-subtle rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-main">Footer</h2>
              <Field label="Footer text">
                <input
                  className={inputClass}
                  maxLength={200}
                  value={content.footer_text}
                  onChange={(e) => update({ footer_text: e.target.value })}
                />
              </Field>
            </section>

            <div className="sticky bottom-0 bg-canvas/95 backdrop-blur border-t border-subtle -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="text-xs min-h-[1rem]" role="status">
                {status ? (
                  <span className={status.kind === 'ok' ? 'text-pass font-semibold' : 'text-fail font-semibold'}>
                    {status.text}
                  </span>
                ) : dirty ? (
                  <span className="text-muted">Unsaved changes</span>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={saving || !dirty}
                className="inline-flex items-center space-x-1.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-4 py-2.5 rounded-md text-sm font-semibold shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving…' : 'Save changes'}</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
