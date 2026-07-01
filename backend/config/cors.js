import { config } from './env.js';

export const corsOptions = {
  origin: function (origin, callback) {
    // 1. Direct requests / Mobile apps (no origin header)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allowed static hosts or custom env configuration
    if (config.FRONTEND_URL && origin === config.FRONTEND_URL) {
      return callback(null, true);
    }

    // 3. Localhost & 127.0.0.1 (any port)
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    // 4. mDNS / local network hosts (e.g., mx-mini.local:5173, wati.local:5174)
    const isLocalMDNS = /^https?:\/\/[a-zA-Z0-9.-]+\.local(:\d+)?$/.test(origin);

    // 5. Private IP subnets (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
    const isPrivateIP = (
      /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
    );

    // 6. Production & cloudflare subdomains
    const isWatiDomain = /^https?:\/\/([a-zA-Z0-9-]+\.)*wati\.health(:\d+)?$/.test(origin);
    const isCloudflarePages = /\.pages\.dev$/.test(origin);

    if (isLocalhost || isLocalMDNS || isPrivateIP || isWatiDomain || isCloudflarePages) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      error.code = 'CORS_FORBIDDEN';
      callback(error);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
