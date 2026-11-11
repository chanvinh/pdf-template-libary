'use client';

import { useEffect, useRef, useState } from 'react';
import type { Presentation, Template } from '@/lib/api';

export type CloneState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; presentation: Presentation }
  | { status: 'error'; message: string };

interface Props {
  template: Template;
  clone: CloneState;
  onUse: () => void;
  onClose: () => void;
}

export default function PreviewModal({ template, clone, onUse, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const slides = template.previewSlides.length ? template.previewSlides : [template.thumbnailUrl];

  // Native <dialog> gives focus trapping, Esc-to-close and the backdrop for free.
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="preview-title"
      className="m-auto w-[min(960px,95vw)] rounded-2xl p-0 backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="preview-title" className="text-xl font-bold">{template.title}</h2>
            <p className="text-sm text-slate-600">{template.description}</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Đóng" className="rounded-lg px-2 text-2xl leading-none hover:bg-slate-100">
            ×
          </button>
        </div>

        <img src={slides[active]} alt={`Slide ${active + 1} / ${slides.length}`} className="aspect-video w-full rounded-lg border bg-slate-100 object-contain" />

        <ol className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Xem slide ${i + 1}`}
                aria-current={i === active}
                className={`w-32 overflow-hidden rounded border-2 ${i === active ? 'border-blue-600' : 'border-transparent'}`}
              >
                <img src={src} alt="" loading="lazy" className="aspect-video w-full object-cover" />
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4" aria-live="polite">
          {clone.status === 'done' ? (
            <>
              <span className="text-sm text-green-700">✓ Đã tạo bản trình chiếu mới.</span>
              {/* Backend sends Content-Disposition: attachment, so a plain link downloads the file. */}
              <a href={clone.presentation.downloadUrl} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Tải xuống .pptx
              </a>
              {clone.presentation.editUrl ? (
                <a href={clone.presentation.editUrl} className="rounded-lg border px-4 py-2 text-sm">Mở chỉnh sửa</a>
              ) : (
                <button type="button" disabled title="Chưa tích hợp trình soạn thảo trực tuyến" className="cursor-not-allowed rounded-lg border px-4 py-2 text-sm text-slate-400">
                  Mở chỉnh sửa (sắp có)
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onUse}
              disabled={clone.status === 'loading'}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {clone.status === 'loading' ? 'Đang tạo…' : 'Sử dụng mẫu này'}
            </button>
          )}
          {clone.status === 'error' && <p role="alert" className="text-sm text-red-600">Không tạo được bản trình chiếu: {clone.message}</p>}
        </div>
      </div>
    </dialog>
  );
}
