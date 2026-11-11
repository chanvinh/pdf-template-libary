export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  previewSlides: string[];
}

export interface Presentation {
  id: string;
  templateId: string;
  downloadUrl: string;
  editUrl: string | null;
  createdAt: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Lỗi máy chủ (${res.status})`);
  return body as T;
}

export const getTemplates = () => request<Template[]>('/api/templates');

export const clonePresentation = (templateId: string) =>
  request<Presentation>('/api/presentations/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  });
