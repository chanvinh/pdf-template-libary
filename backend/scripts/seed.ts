// Generates 3 sample templates into uploads/templates/: <id>/template.pptx, <id>/slides/N.svg and templates.json.
// Each slide is described once as shapes and rendered to both PPTX (PptxGenJS) and SVG (preview images),
// so no LibreOffice is needed. Real templates are just files + a templates.json entry; this script is only sample data.
import PptxGenJS from 'pptxgenjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(import.meta.dirname, '..', 'uploads', 'templates');
const W = 10, H = 5.625, PX = 128; // 16:9 slide in inches; 128 px/inch -> 1280x720 SVG
const FONT = 'Arial';

type Shape =
  | { type: 'rect'; x: number; y: number; w: number; h: number; color: string }
  | { type: 'text'; x: number; y: number; w: number; h: number; lines: string[]; size: number; color: string; bold: boolean };
type Theme = { bg: string; fg: string; muted: string; accent: string; card: string };

const rect = (x: number, y: number, w: number, h: number, color: string): Shape => ({ type: 'rect', x, y, w, h, color });
const text = (x: number, y: number, w: number, h: number, lines: string | string[], size: number, color: string, bold = false): Shape =>
  ({ type: 'text', x, y, w, h, lines: ([] as string[]).concat(lines), size, color, bold });

const titleSlide = (th: Theme, title: string, sub: string) => [
  rect(0, 0, W, H, th.bg), rect(0.6, 2.6, 1.2, 0.08, th.accent),
  text(0.6, 1.4, 8.8, 1.1, title, 40, th.fg, true), text(0.6, 2.9, 8.8, 0.6, sub, 18, th.muted),
];
const bulletSlide = (th: Theme, heading: string, bullets: string[]) => [
  rect(0, 0, W, H, th.bg), rect(0, 0, 0.18, H, th.accent),
  text(0.6, 0.4, 8.8, 0.8, heading, 30, th.fg, true),
  text(0.6, 1.5, 8.8, 3.6, bullets.map(b => `•  ${b}`), 18, th.fg),
];
const statsSlide = (th: Theme, heading: string, stats: [string, string][]) => [
  rect(0, 0, W, H, th.bg), text(0.6, 0.4, 8.8, 0.8, heading, 30, th.fg, true),
  ...stats.flatMap(([value, label], i) => [
    rect(0.6 + i * 3.0, 1.7, 2.7, 2.4, th.card),
    text(0.8 + i * 3.0, 2.0, 2.3, 1.0, value, 36, th.accent, true),
    text(0.8 + i * 3.0, 3.1, 2.3, 0.8, label, 14, th.muted),
  ]),
];

const navy: Theme = { bg: '1E293B', fg: 'F8FAFC', muted: 'CBD5E1', accent: 'F59E0B', card: '334155' };
const green: Theme = { bg: 'F0FDF4', fg: '14532D', muted: '4D7C0F', accent: '16A34A', card: 'DCFCE7' };
const light: Theme = { bg: 'FFFFFF', fg: '111827', muted: '6B7280', accent: 'DC2626', card: 'F3F4F6' };

const samples = [
  {
    id: 'business-pitch', title: 'Business Pitch', category: 'Kinh doanh',
    description: 'Mẫu gọi vốn tông xanh đậm, nhấn vàng, phù hợp startup và đề xuất dự án.',
    slides: [
      titleSlide(navy, 'Tên dự án của bạn', 'Pitch deck · Vòng hạt giống 2026'),
      bulletSlide(navy, 'Vấn đề', ['Khách hàng mất nhiều thời gian cho việc X', 'Giải pháp hiện tại đắt và khó dùng', 'Thị trường đang tăng trưởng nhanh']),
      statsSlide(navy, 'Thị trường', [['$4.2B', 'Tổng thị trường'], ['32%', 'Tăng trưởng/năm'], ['12K', 'Khách hàng tiềm năng']]),
      bulletSlide(navy, 'Kế hoạch & liên hệ', ['Q1: Ra mắt bản thử nghiệm', 'Q2: 1.000 người dùng trả phí', 'Email: hello@example.com']),
    ],
  },
  {
    id: 'education-lesson', title: 'Bài giảng Giáo dục', category: 'Giáo dục',
    description: 'Mẫu bài giảng tông xanh lá dịu mắt, có slide mục tiêu, nội dung và bài tập.',
    slides: [
      titleSlide(green, 'Bài 1: Tên bài học', 'Môn học · Lớp 10'),
      bulletSlide(green, 'Mục tiêu bài học', ['Hiểu khái niệm cơ bản', 'Vận dụng vào ví dụ thực tế', 'Tự đánh giá qua bài tập']),
      bulletSlide(green, 'Nội dung chính', ['Phần 1: Khái niệm', 'Phần 2: Ví dụ minh họa', 'Phần 3: Lưu ý thường gặp']),
      bulletSlide(green, 'Bài tập về nhà', ['Bài 1: ...', 'Bài 2: ...', 'Hạn nộp: Thứ Hai tuần sau']),
    ],
  },
  {
    id: 'minimal-report', title: 'Báo cáo Tối giản', category: 'Báo cáo',
    description: 'Mẫu báo cáo nền trắng tối giản với điểm nhấn đỏ, tập trung vào số liệu.',
    slides: [
      titleSlide(light, 'Báo cáo Quý 3', 'Phòng Kinh doanh · 2026'),
      bulletSlide(light, 'Tóm tắt', ['Doanh thu vượt kế hoạch 8%', 'Chi phí vận hành giảm 5%', 'Mở rộng thêm 2 thị trường']),
      statsSlide(light, 'Số liệu chính', [['18,4 tỷ', 'Doanh thu'], ['+8%', 'So với kế hoạch'], ['94%', 'Hài lòng KH']]),
      bulletSlide(light, 'Kết luận & đề xuất', ['Tiếp tục đầu tư kênh online', 'Tối ưu quy trình giao hàng', 'Mục tiêu Q4: +10%']),
    ],
  },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toSvg(shapes: Shape[]): string {
  const body = shapes.map(s => {
    if (s.type === 'rect') return `<rect x="${s.x * PX}" y="${s.y * PX}" width="${s.w * PX}" height="${s.h * PX}" fill="#${s.color}"/>`;
    const px = (s.size * PX) / 72; // pt -> px
    return s.lines.map((l, i) =>
      `<text x="${s.x * PX}" y="${s.y * PX + px * (1 + i * 1.5)}" font-family="${FONT}, sans-serif" font-size="${px.toFixed(1)}" font-weight="${s.bold ? 700 : 400}" fill="#${s.color}">${esc(l)}</text>`).join('');
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * PX} ${H * PX}">${body}</svg>`;
}

function addSlide(pptx: PptxGenJS, shapes: Shape[]) {
  const slide = pptx.addSlide();
  for (const s of shapes) {
    if (s.type === 'rect') slide.addShape(pptx.ShapeType.rect, { x: s.x, y: s.y, w: s.w, h: s.h, fill: { color: s.color }, line: { color: s.color } });
    else slide.addText(s.lines.join('\n'), { x: s.x, y: s.y, w: s.w, h: s.h, fontFace: FONT, fontSize: s.size, color: s.color, bold: s.bold, valign: 'top', margin: 0, paraSpaceAfter: s.size * 0.5 });
  }
}

const manifest = [];
for (const t of samples) {
  const dir = path.join(OUT, t.id);
  await fs.mkdir(path.join(dir, 'slides'), { recursive: true });
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = t.title;
  t.slides.forEach(s => addSlide(pptx, s));
  await pptx.writeFile({ fileName: path.join(dir, 'template.pptx') });
  const previewSlides: string[] = [];
  for (const [i, s] of t.slides.entries()) {
    await fs.writeFile(path.join(dir, 'slides', `${i + 1}.svg`), toSvg(s));
    previewSlides.push(`${t.id}/slides/${i + 1}.svg`);
  }
  manifest.push({
    id: t.id, title: t.title, description: t.description, category: t.category,
    thumbnail: previewSlides[0], previewSlides, filePath: `${t.id}/template.pptx`,
  });
  console.log(`✓ ${t.id} (${t.slides.length} slides)`);
}
await fs.writeFile(path.join(OUT, 'templates.json'), JSON.stringify(manifest, null, 2) + '\n');
