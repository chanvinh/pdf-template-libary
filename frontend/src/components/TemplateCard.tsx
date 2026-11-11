import type { Template } from '@/lib/api';

interface Props {
  template: Template;
  onPreview: () => void;
  onUse: () => void;
}

export default function TemplateCard({ template, onPreview, onUse }: Props) {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button type="button" onClick={onPreview} aria-label={`Xem trước ${template.title}`}>
        {/* Plain img: previews are SVG, which next/image refuses by default. */}
        <img src={template.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full bg-slate-100 object-cover" />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{template.category}</span>
        <h3 className="font-semibold">{template.title}</h3>
        <p className="flex-1 text-sm text-slate-600">{template.description}</p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onPreview} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Xem trước
          </button>
          <button type="button" onClick={onUse} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Sử dụng mẫu này
          </button>
        </div>
      </div>
    </li>
  );
}
