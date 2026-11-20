const API_BASE = '/api/v1';
const TOKEN_KEY = 'foundry_admin_token';

export interface SiteFeature {
  title: string;
  description: string;
}

export interface SiteContent {
  announcement: string;
  hero_badge: string;
  hero_title: string;
  hero_highlight: string;
  hero_subtitle: string;
  cta_label: string;
  features_heading: string;
  features: SiteFeature[];
  footer_text: string;
  updated_at?: string | null;
}

export class UnauthorizedError extends Error {}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      const field = (body.detail[0].loc || []).slice(1).join('.');
      return `${field ? field + ': ' : ''}${body.detail[0].msg}`;
    }
  } catch {
    /* not JSON */
  }
  return fallback;
}

export async function fetchSiteContent(): Promise<SiteContent> {
  const res = await fetch(`${API_BASE}/site/content`);
  if (!res.ok) throw new Error('Failed to load page content');
  return res.json();
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Login failed'));
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token);
}

export async function checkSession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export async function saveSiteContent(content: SiteContent): Promise<SiteContent> {
  const res = await fetch(`${API_BASE}/site/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
    body: JSON.stringify(content),
  });
  if (res.status === 401) throw new UnauthorizedError('Session expired. Please sign in again.');
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to save content'));
  return res.json();
}
