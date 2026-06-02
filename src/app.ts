import path from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import dashboardRouter from './routes/dashboard';
import visualsRouter from './routes/visuals';
import organizationsRouter from './routes/organizations';
import filtersRouter from './routes/filters';
import hotlinesRouter from './routes/hotlines';
import clientErrorsRouter from './routes/clientErrors';
import adminRouter from './routes/admin';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFound } from './middleware/error';
import { apiLimiter, clientErrorLimiter } from './middleware/rateLimit';

const app = express();

// Behind the platform Caddy reverse proxy — trust the first hop so client IPs
// (used by rate limiting and logging) reflect the real caller, not Caddy.
app.set('trust proxy', 1);

// Server-rendered admin dashboard views (EJS). Views are copied into dist on
// build (see package.json "build"), so __dirname resolves to dist at runtime.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin/views'));

// Security headers. CSP is widened only as far as the admin login page needs to
// load the Firebase Web SDK and run Google sign-in; the JSON API is unaffected.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.gstatic.com'],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://www.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://identitytoolkit.googleapis.com',
        ],
        frameSrc: [
          "'self'",
          'https://*.firebaseapp.com',
          'https://accounts.google.com',
          'https://apis.google.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(requestLogger);
app.use(apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (_req, res) => {
  res.json({
    name: 'lbresponse-api',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/admin', adminRouter);

app.use('/api/dashboard', dashboardRouter);
app.use('/api/visuals', visualsRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/hotlines', hotlinesRouter);
app.use('/api/client-errors', clientErrorLimiter, clientErrorsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
