import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';

// Isolated uploads dir: one template whose original must survive cloning untouched.
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tpl-'));
await fs.mkdir(path.join(dir, 'templates', 'demo'), { recursive: true });
const original = Buffer.from('fake pptx bytes');
await fs.writeFile(path.join(dir, 'templates', 'demo', 'template.pptx'), original);
await fs.writeFile(path.join(dir, 'templates', 'templates.json'), JSON.stringify([
  { id: 'demo', title: 'Demo', description: 'd', category: 'Test', thumbnail: 'demo/1.svg', previewSlides: ['demo/1.svg'], filePath: 'demo/template.pptx' },
  { id: 'evil', title: 'Evil', thumbnail: 'x.svg', filePath: '../../etc/passwd' },
]));
process.env.UPLOADS_DIR = dir;
const { app } = await import('../src/app.js');

let server: Server;
let base: string;
before(() => new Promise<void>(r => { server = app.listen(0, () => { base = `http://localhost:${(server.address() as { port: number }).port}`; r(); }); }));
after(() => { server.close(); return fs.rm(dir, { recursive: true, force: true }); });

const clone = (body: unknown) => fetch(`${base}/api/presentations/clone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('lists valid templates only, without server file paths', async () => {
  const list = await (await fetch(`${base}/api/templates`)).json();
  assert.deepEqual(list.map((t: { id: string }) => t.id), ['demo']);
  assert.equal(list[0].filePath, undefined);
  assert.equal(list[0].thumbnailUrl, '/uploads/templates/demo/1.svg');
});

test('clone makes an independent copy and leaves the original intact', async () => {
  const res = await clone({ templateId: 'demo' });
  assert.equal(res.status, 201);
  const p = await res.json();
  const copyPath = path.join(dir, 'presentations', `${p.id}.pptx`);
  await fs.writeFile(copyPath, 'edited by user');
  assert.deepEqual(await fs.readFile(path.join(dir, 'templates', 'demo', 'template.pptx')), original);

  const dl = await fetch(base + p.downloadUrl);
  assert.equal(dl.status, 200);
  assert.match(dl.headers.get('content-disposition') ?? '', /attachment/);
  assert.equal(await dl.text(), 'edited by user');
});

test('rejects bad input', async () => {
  assert.equal((await clone({})).status, 400);
  assert.equal((await clone({ templateId: 'nope' })).status, 404);
  assert.equal((await clone({ templateId: 'evil' })).status, 404);
  assert.equal((await fetch(`${base}/api/presentations/../../x/download`)).status, 404);
  assert.equal((await fetch(`${base}/api/presentations/00000000-0000-0000-0000-000000000000/download`)).status, 404);
});
