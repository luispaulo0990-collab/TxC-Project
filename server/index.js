// server/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { assertRequiredEnv, config } from './config/env.js';
import jwtMiddleware, { optionalJwtMiddleware } from './middleware/jwtMiddleware.js';
import atividadesRouter from './routes/atividades.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import projetosRouter from './routes/projetos.js';

assertRequiredEnv();

const app = express();
const PORT = config.port;

const allowedOrigins = (config.corsOrigin || '')
 .split(',')
 .map((origin) => origin.trim())
 .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(
 cors({
   origin(origin, callback) {
     if (!origin) return callback(null, true);
     if (allowedOrigins.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
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

// Auth routes (public)
app.use('/api/auth', authRouter);

// Projetos routes (with optional or verified JWT)
app.use('/api/projetos', optionalJwtMiddleware, projetosRouter);

// Atividades routes (protected with JWT)
app.use('/api/atividades', jwtMiddleware, atividadesRouter);

app.use((err, _req, res, _next) => {
 console.error('Unhandled error:', err);
 res.status(500).json({
   error: config.isProduction ? 'Internal server error' : err.message,
 });
});

app.listen(PORT, () => {
 console.log(`🚀 Server listening on http://localhost:${PORT}`);
 if (config.missingEnv.length > 0) {
   console.warn(`⚠️  Env check: ${config.missingEnv.join(', ')} still need values`);
 }
});
