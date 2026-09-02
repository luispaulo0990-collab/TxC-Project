import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import serverless from 'serverless-http';
import dotenv from 'dotenv';

import { assertRequiredEnv, config } from '../server/config/env.js';
import jwtMiddleware, { optionalJwtMiddleware } from '../server/middleware/jwtMiddleware.js';
import atividadesRouter from '../server/routes/atividades.js';
import authRouter from '../server/routes/auth.js';
import healthRouter from '../server/routes/health.js';
import projetosRouter from '../server/routes/projetos.js';

dotenv.config();
assertRequiredEnv();

const app = express();

const allowedOrigins = (config.corsOrigin || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json({ limit: '50mb' }));

app.get('/', (_req, res) => {
  res.json({ name: 'Tempo X Caminho', status: 'ok' });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/projetos', optionalJwtMiddleware, projetosRouter);
app.use('/api/atividades', jwtMiddleware, atividadesRouter);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: config.isProduction ? 'Internal server error' : err.message,
  });
});

export default app;
export const handler = serverless(app);
