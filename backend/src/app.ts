import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR ?? path.join(import.meta.dirname, '..', 'uploads'));
const TEMPLATES_DIR = path.join(UPLOADS_DIR, 'templates');
const PRESENTATIONS_DIR = path.join(UPLOADS_DIR, 'presentations');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** One entry of uploads/templates/templates.json. Paths are relative to uploads/templates. */
interface TemplateRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  previewSlides: string[];
  filePath: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Resolves a path from templates.json and refuses anything that escapes uploads/templates. */
function insideTemplates(rel: unknown): string {
  if (typeof rel !== 'string') throw new Error('path must be a string');
  const p = path.resolve(TEMPLATES_DIR, rel);
  if (!p.startsWith(TEMPLATES_DIR + path.sep)) throw new Error(`path escapes templates dir: ${rel}`);
  return p;
}

// Re-read on every request: edit templates.json (add/edit/remove) and it is live without a restart or code change.
// shortcut: no cache; add one (invalidated by fs.watch) if the file grows to thousands of entries.
async function loadTemplates(): Promise<TemplateRecord[]> {
  const raw: unknown = JSON.parse(await fs.readFile(path.join(TEMPLATES_DIR, 'templates.json'), 'utf8'));
  if (!Array.isArray(raw)) throw new Error('templates.json must be an array');
  return raw.filter((t: TemplateRecord) => {
    try {
      if (!t?.id || !t.title) throw new Error('id and title are required');
      [t.filePath, t.thumbnail, ...(t.previewSlides ?? [])].forEach(insideTemplates);
      return true;
    } catch (e) {
      console.warn(`Skipping template ${JSON.stringify(t?.id)}: ${(e as Error).message}`);
      return false;
    }
  });
}

const assetUrl = (rel: string) => `/uploads/templates/${rel}`;
const toPublic = (t: TemplateRecord) => ({
  id: t.id,
  title: t.title,
  description: t.description ?? '',
  category: t.category ?? 'Khác',
  thumbnailUrl: assetUrl(t.thumbnail),
  previewSlides: (t.previewSlides ?? []).map(assetUrl),
});

export const app = express();
app.use(express.json({ limit: '10kb' }));
// Only templates are public static files; presentations go through the validated download route.
app.use('/uploads/templates', express.static(TEMPLATES_DIR, { index: false, dotfiles: 'deny' }));

app.get('/api/templates', async (_req, res) => {
  res.json((await loadTemplates()).map(toPublic));
});

app.post('/api/presentations/clone', async (req, res) => {
  const templateId: unknown = req.body?.templateId;
  if (typeof templateId !== 'string' || !templateId) throw new HttpError(400, 'templateId là bắt buộc');
  const template = (await loadTemplates()).find(t => t.id === templateId);
  if (!template) throw new HttpError(404, 'Không tìm thấy template');

  const id = crypto.randomUUID();
  const dest = path.join(PRESENTATIONS_DIR, `${id}.pptx`);
  await fs.mkdir(PRESENTATIONS_DIR, { recursive: true });
  try {
    // The template is only ever read. COPYFILE_EXCL: fail rather than overwrite an existing file.
    // COPYFILE_FICLONE: copy-on-write clone where the filesystem supports it, plain copy otherwise.
    await fs.copyFile(insideTemplates(template.filePath), dest, constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') await fs.rm(dest, { force: true }); // drop a partial copy
    throw e;
  }

  res.status(201).json({
    id,
    templateId,
    downloadUrl: `/api/presentations/${id}/download`,
    editUrl: null, // set once an online editor (OnlyOffice/Collabora) is integrated, see README
    createdAt: new Date().toISOString(),
  });
});

app.get('/api/presentations/:id/download', (req, res, next) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) throw new HttpError(404, 'Không tìm thấy bản trình chiếu');
  res.download(path.join(PRESENTATIONS_DIR, `${id}.pptx`), `presentation-${id}.pptx`, err => {
    if (err) next((err as NodeJS.ErrnoException).code === 'ENOENT' ? new HttpError(404, 'Không tìm thấy bản trình chiếu') : err);
  });
});

app.use('/api', (_req, res) => { res.status(404).json({ error: 'Endpoint không tồn tại' }); });

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  const status: number = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);
  if (res.headersSent) return next(err);
  res.status(status).json({ error: status >= 500 ? 'Lỗi máy chủ, vui lòng thử lại' : err.message });
};
app.use(errorHandler);
