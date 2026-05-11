const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Saves a base64 image string to disk and returns the public URL path.
 * If value is already a URL (not base64), returns it as-is.
 */
function saveBase64Image(base64String) {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String || null;
  }

  const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return null;

  const ext = matches[1];
  const data = matches[2];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filepath, Buffer.from(data, 'base64'));

  return `/uploads/${filename}`;
}

module.exports = { saveBase64Image };
