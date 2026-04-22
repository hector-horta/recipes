import { config } from './env.js';

export const corsOptions = {
  origin: function (origin, callback) {
    const allowedHosts = [
      config.FRONTEND_URL,
      'http://localhost',
      'https://localhost',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://wati.health',
      'https://www.wati.health',
      'https://app.wati.health'
    ];
    
    // Allow localhost, local network IPs, and undefined (mobile apps, direct requests)
    const isLocalhost = !origin || allowedHosts.includes(origin);
    const isLocalNetwork = origin && (
      /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
    );
    const isCloudflarePages = origin && /\.pages\.dev$/.test(origin);
    
    if (isLocalhost || isLocalNetwork || isCloudflarePages) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
