'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clonePresentation, getTemplates, type Template } from '@/lib/api';
import TemplateCard from './TemplateCard';
import PreviewModal, { type CloneState } from './PreviewModal';

// Strip Vietnamese diacritics so "giao duc" matches "Giáo dục".
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export default function TemplateGallery() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Template | null>(null);
  const [clone, setClone] = useState<CloneState>({ status: 'idle' });
  const requestId = useRef(0); // ignore clone results for a modal the user already closed

  const load = useCallback(() => {
    setLoadError(null);
    setTemplates(null);
    getTemplates().then(setTemplates, (e: Error) => setLoadError(e.message));
  }, []);
  useEffect(load, [load]);

  const categories = useMemo(() => [...new Set(templates?.map(t => t.category))].sort(), [templates]);

  // shortcut: filters client-side on the full list; move q/category to the API when the library needs pagination.
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return (templates ?? []).filter(t =>
      (!category || t.category === category) &&
      (!q || fold(`${t.title} ${t.description} ${t.category}`).includes(q)));
  }, [templates, query, category]);

  const open = (t: Template) => {
    requestId.current++;
    setSelected(t);
    setClone({ status: 'idle' });
  };

  const use = async (t: Template) => {
    const id = ++requestId.current;
    setSelected(t);
    setClone({ status: 'loading' });
    try {
      const presentation = await clonePresentation(t.id);
      if (id === requestId.current) setClone({ status: 'done', presentation });
    } catch (e) {
      if (id === requestId.current) setClone({ status: 'error', message: (e as Error).message });
    }
  };

  const close = () => {
    requestId.current++;
    setSelected(null);
  };

  return (
    <section>
      <form role="search" onSubmit={e => e.preventDefault()} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm theo tên, mô tả…"
          aria-label="Tìm kiếm mẫu"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          aria-label="Lọc theo danh mục"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </form>

      {loadError ? (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {loadError}{' '}
          <button type="button" onClick={load} className="font-medium underline">Thử lại</button>
        </div>
      ) : !templates ? (
        <p role="status" className="text-slate-500">Đang tải…</p>
      ) : visible.length === 0 ? (
        <p role="status" className="text-slate-500">Không tìm thấy mẫu phù hợp.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(t => (
            <TemplateCard key={t.id} template={t} onPreview={() => open(t)} onUse={() => use(t)} />
          ))}
        </ul>
      )}

      {selected && (
        <PreviewModal key={selected.id} template={selected} clone={clone} onUse={() => use(selected)} onClose={close} />
      )}
    </section>
  );
}
