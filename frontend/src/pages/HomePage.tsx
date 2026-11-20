import React, { useEffect, useState } from 'react';
import { ArrowRight, Megaphone, ShieldCheck, Sparkles } from 'lucide-react';
import { fetchSiteContent, SiteContent } from '../api/site';

interface HomePageProps {
  onEnterApp: () => void;
  onAdmin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onEnterApp, onAdmin }) => {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSiteContent()
      .then(setContent)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans">
      <header className="bg-surface border-b border-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-main font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <span>Neuro-Symbolic Foundry</span>
          </div>
          <nav className="flex items-center space-x-2">
            <button
              onClick={onAdmin}
              className="text-xs font-semibold text-muted hover:text-main px-3 py-2 rounded-md"
            >
              Admin
            </button>
            <button
              onClick={onEnterApp}
              className="bg-brand hover:bg-brand-hover text-white px-3.5 py-2 rounded-md text-xs font-semibold"
            >
              Open Console
            </button>
          </nav>
        </div>
      </header>

      {content?.announcement && (
        <div className="bg-brand text-white text-xs font-medium">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center space-x-2 text-center">
            <Megaphone className="w-3.5 h-3.5 shrink-0" />
            <span>{content.announcement}</span>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {error && (
          <div className="bg-fail-bg text-fail border border-fail/20 rounded-lg p-4 text-sm text-center">
            {error}. Check that the backend is running, then reload.
          </div>
        )}

        {!content && !error && <p className="text-center text-sm text-muted">Loading…</p>}

        {content && (
          <div className="space-y-16">
            <section className="text-center space-y-5">
              {content.hero_badge && (
                <div className="inline-flex items-center space-x-2 bg-brand/10 border border-brand/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand">
                  <Sparkles className="w-4 h-4" />
                  <span>{content.hero_badge}</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-5xl font-extrabold text-main tracking-tight leading-tight">
                {content.hero_title}
                <br />
                <span className="text-brand">{content.hero_highlight}</span>
              </h1>
              <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
                {content.hero_subtitle}
              </p>
              <div className="pt-2">
                <button
                  onClick={onEnterApp}
                  className="bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-md inline-flex items-center space-x-2"
                >
                  <span>{content.cta_label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {content.features.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-main text-center">{content.features_heading}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {content.features.map((feature, index) => (
                    <div key={index} className="bg-surface border border-subtle rounded-xl p-5">
                      <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center font-bold mb-3 font-mono text-sm">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <h3 className="text-base font-bold text-main mb-1.5">{feature.title}</h3>
                      <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-subtle bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 text-xs text-muted text-center">
          {content?.footer_text}
        </div>
      </footer>
    </div>
  );
};
