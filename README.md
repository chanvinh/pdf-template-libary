# Thư viện mẫu trình chiếu (PowerPoint Template Library)

Next.js 16 (App Router, Tailwind 4, TypeScript) + Express 5 (TypeScript).
Người dùng chọn template → backend sao chép `.pptx` gốc thành bản độc lập → người dùng tải file về.

## Cấu trúc thư mục

```
pdf-template-libary/
├── backend/                          Express + TypeScript (cổng 4000)
│   ├── src/
│   │   ├── app.ts                    Toàn bộ API, logic clone, xử lý lỗi
│   │   └── server.ts                 Khởi động server
│   ├── scripts/seed.ts               Sinh 3 template mẫu (.pptx + ảnh preview + templates.json)
│   ├── tests/app.test.ts             Test: clone an toàn, chặn path traversal, lỗi đầu vào
│   └── uploads/
│       ├── templates/
│       │   ├── templates.json        Metadata, đọc lại mỗi request (thêm/sửa/xóa không cần sửa code)
│       │   └── <id>/template.pptx, <id>/slides/1.svg …
│       └── presentations/<uuid>.pptx Bản sao của người dùng (tự tạo, đã gitignore)
└── frontend/                         Next.js (cổng 3000)
    ├── next.config.ts                Proxy /api và /uploads/templates sang backend (không cần CORS)
    └── src/
        ├── app/layout.tsx, page.tsx, globals.css
        ├── components/
        │   ├── TemplateGallery.tsx   Lưới + tìm kiếm + lọc danh mục + trạng thái tải/lỗi
        │   ├── TemplateCard.tsx      Thumbnail, tên, mô tả, nút Xem trước / Sử dụng
        │   └── PreviewModal.tsx      Xem từng slide, tạo bản sao, tải xuống
        └── lib/api.ts                Gọi API + kiểu dữ liệu + chuẩn hóa lỗi
```

## Chạy thử

```bash
cd backend  && npm install && npm run seed && npm run dev   # http://localhost:4000
cd frontend && npm install && npm run dev                   # http://localhost:3000
cd backend  && npm test                                     # 3 test
```

Biến môi trường: `PORT` (backend, mặc định 4000), `UPLOADS_DIR` (mặc định `backend/uploads`), `API_URL` (frontend, mặc định `http://localhost:4000`).

## Dữ liệu: `uploads/templates/templates.json`

```json
{
  "id": "business-pitch",
  "title": "Business Pitch",
  "description": "…",
  "category": "Kinh doanh",
  "thumbnail": "business-pitch/slides/1.svg",
  "previewSlides": ["business-pitch/slides/1.svg", "…"],
  "filePath": "business-pitch/template.pptx"
}
```

Mọi đường dẫn đều tương đối với `uploads/templates/`. Mục nào sai (thiếu `id`/`title`, hoặc đường dẫn trỏ ra ngoài thư mục) sẽ bị bỏ qua và ghi cảnh báo vào log. Thêm template mới: chép thư mục vào rồi thêm một mục vào JSON, không cần khởi động lại.

## API

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/templates` | – | `200 [{ id, title, description, category, thumbnailUrl, previewSlides[] }]` (không lộ `filePath`) |
| POST | `/api/presentations/clone` | `{ "templateId": "business-pitch" }` | `201 { id, templateId, downloadUrl, editUrl: null, createdAt }` |
| GET | `/api/presentations/:id/download` | – | `200` file `.pptx`, `Content-Disposition: attachment` |
| GET | `/uploads/templates/*` | – | Ảnh thumbnail/preview (static) |

Lỗi luôn có dạng `{ "error": "…" }`: `400` (thiếu `templateId`, JSON sai), `404` (template/bản trình chiếu không tồn tại, id không phải UUID), `500` (chỉ trả thông báo chung, chi tiết nằm trong log server).

## Sao chép file an toàn

- File template chỉ được **đọc**, không bao giờ mở để ghi.
- `fs.copyFile` với `COPYFILE_EXCL` (không bao giờ ghi đè file có sẵn) và `COPYFILE_FICLONE` (dùng copy-on-write nếu hệ thống file hỗ trợ: btrfs/APFS/ReFS; nếu không thì copy thường).
- Tên file đích là `crypto.randomUUID()`, không lấy từ dữ liệu người dùng. Nếu copy lỗi giữa chừng thì xóa file dở dang.
- Chỉ thư mục `templates/` được phục vụ dạng static. Bản trình chiếu chỉ tải qua route download, route này kiểm tra id là UUID trước khi đọc file.

## Thư viện sử dụng

| Thư viện | Vai trò | Giấy phép |
|---|---|---|
| express 5 | HTTP server | MIT |
| next 16, react 19 | Frontend | MIT |
| tailwindcss 4 | CSS | MIT |
| pptxgenjs 3 (chỉ dev) | Sinh `.pptx` mẫu trong `seed.ts` | MIT |
| typescript, tsx | Build/chạy TS | Apache-2.0 / MIT |

## Giới hạn hiện tại

- Chưa có trình soạn thảo trực tuyến: nút "Mở chỉnh sửa" đang tắt, `editUrl` luôn là `null`. Người dùng phải tải về rồi sửa bằng PowerPoint/LibreOffice.
- Chưa có xác thực người dùng: ai có link download (UUID, khó đoán) đều tải được.
- Metadata nằm trong file JSON, chưa có DB, chưa có trang admin. Lọc/tìm kiếm chạy ở client trên toàn bộ danh sách (phù hợp vài trăm template).
- Ảnh preview của 3 mẫu được vẽ lại bằng SVG từ cùng dữ liệu slide. Với template thật, nên sinh ảnh bằng LibreOffice headless: `soffice --headless --convert-to pdf template.pptx`, sau đó chuyển PDF sang PNG bằng `pdftoppm`.
- Bản sao không bao giờ bị dọn. Cần thêm cron xóa các file cũ hoặc gắn vòng đời file với tài khoản người dùng.

## Hướng mở rộng: trình soạn thảo trực tuyến

**OnlyOffice Docs (khuyến nghị; bản Community dùng AGPL-3.0, tự host bằng Docker `onlyoffice/documentserver`)**

1. Thêm `GET /api/presentations/:id/editor-config`. Route này trả config đã ký JWT: `document.url` = link download (dạng signed URL), `document.key` = id + phiên bản, `editorConfig.callbackUrl` = `/api/presentations/:id/onlyoffice-callback`.
2. Frontend thêm trang `app/editor/[id]/page.tsx`, dùng `@onlyoffice/document-editor-react` (Apache-2.0) với config trên. Backend trả `editUrl = /editor/{id}`, nút "Mở chỉnh sửa" sẽ tự bật.
3. Callback: khi `status === 2` (đã lưu), tải file từ `body.url` về `<id>.pptx.tmp` rồi `rename` đè lên (atomic). Template gốc vẫn không bị động tới.

**Collabora Online / Microsoft Office Online Server**: tích hợp qua giao thức WOPI. Backend cần thêm 3 endpoint: `CheckFileInfo`, `GetFile`, `PutFile` tại `/wopi/files/:id`. Collabora dùng MPL-2.0. Office Online Server cần giấy phép Microsoft.

**PptxGenJS**: chỉ *tạo mới* file `.pptx` (MIT), không mở hay sửa được file có sẵn. Phù hợp cho tính năng "tạo slide từ dữ liệu/form" (ví dụ điền tên công ty, số liệu vào khung sinh sẵn). Không thay thế được một trình soạn thảo thật.
