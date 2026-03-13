export const api = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }, cache: 'no-store' });
  if (!res.ok) throw await res.json();
  return res.json();
};

export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
