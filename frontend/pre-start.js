import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, 'index.html');
const envLocalPath = path.resolve(__dirname, '.env.local');

let umamiId = '';
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  const match = content.match(/^VITE_UMAMI_WEBSITE_ID=(.+)$/m);
  if (match) umamiId = match[1].trim();
}

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  const newHtml = html
    .replace(/__CSP_CONNECT_SRC__/g, process.env.VITE_API_URL || 'http://localhost:5001')
    .replace(/__UMAMI_WEBSITE_ID__/g, umamiId);
  
  if (newHtml !== html) {
    fs.writeFileSync(indexPath, newHtml, 'utf-8');
    console.log(`[pre-start] Injected UMAMI_WEBSITE_ID: ${umamiId}`);
  }
}
