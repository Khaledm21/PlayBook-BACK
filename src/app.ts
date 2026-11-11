import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';
import { prisma } from './db/prisma';
import { sendSuccess, sendError } from './utils/response';

export const createApp = (): Application => {
  const app = express();

  // 1. CORS Setup
  const allowedOrigins = [
    env.CLIENT_URL,
    env.ADDITIONAL_CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('غير مسموح بالوصول من هذا المصدر عبر سياسة CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 2. Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // 3. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Static uploads folder
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 5. Comprehensive Health Check Endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      const dbLatencyMs = Date.now() - startTime;

      const healthData = {
        status: 'UP',
        service: 'PlayBook Backend API',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        database: {
          status: 'CONNECTED',
          provider: 'SQLite (dev.db)',
          latencyMs: dbLatencyMs,
        },
        memory: {
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        version: '1.0.0',
      };

      return sendSuccess(res, healthData, 200, 'النظام وقاعدة البيانات يعملان بكفاءة تامة');
    } catch (error: any) {
      return sendError(res, 'فشل الاتصال بقاعدة البيانات أو وجود خلل في النظام', 503, [
        { message: error.message },
      ]);
    }
  });

  // 6. Mount API Routes
  app.use('/api', apiRoutes);

  // 7. Handle 404 for undefined routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`المسار المطلوب (${req.method} ${req.originalUrl}) غير موجود على هذا الخادم`));
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
