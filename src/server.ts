import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`
  ⚽ ==================================================== ⚽
     🚀 خادم PlayBook جاهز ويعمل بكفاءة!
     📡 الرابط: http://localhost:${env.PORT}
     🩺 الفحص التشخيصي: http://localhost:${env.PORT}/api/health
     🌍 البيئة: ${env.NODE_ENV}
  ⚽ ==================================================== ⚽
  `);
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ استلام إشارة ${signal}: بدء إيقاف الخادم بسلاسة...`);

  server.close(async () => {
    console.log('🛑 تم إغلاق خادم HTTP بنجاح.');
    try {
      await prisma.$disconnect();
      console.log('🔌 تم فصل الاتصال بقاعدة البيانات Prisma بنجاح.');
      process.exit(0);
    } catch (err) {
      console.error('❌ خطأ أثناء فصل قاعدة البيانات:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('⏰ انتهت مهلة الإغلاق الآمن، جاري الإنهاء الجبري.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
