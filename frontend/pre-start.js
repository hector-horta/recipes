import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, 'index.html');
const envLocalPath = path.resolve(__dirname, '.env.local');

let umamiId = process.env.VITE_UMAMI_WEBSITE_ID || '';
let umamiUrl = process.env.VITE_UMAMI_SCRIPT_URL || '';
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  const matchId = content.match(/^VITE_UMAMI_WEBSITE_ID=(.+)$/m);
  if (matchId && !umamiId) umamiId = matchId[1].trim();
  
  const matchUrl = content.match(/^VITE_UMAMI_SCRIPT_URL=(.+)$/m);
  if (matchUrl && !umamiUrl) umamiUrl = matchUrl[1].trim();
}

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  const newHtml = html
    .replace(/__CSP_CONNECT_SRC__/g, process.env.VITE_API_URL || 'http://localhost:5001')
    .replace(/__UMAMI_WEBSITE_ID__/g, umamiId)
    .replace(/__UMAMI_SCRIPT_URL__/g, umamiUrl);
  
  if (newHtml !== html) {
    fs.writeFileSync(indexPath, newHtml, 'utf-8');
    console.log(`[pre-start] Injected UMAMI_WEBSITE_ID: ${umamiId}, UMAMI_SCRIPT_URL: ${umamiUrl}`);
  }
}
