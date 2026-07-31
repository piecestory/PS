const config = require('./src/config');
const logger = require('./src/utils/logger');
const { initDb } = require('./src/db/connection');

async function main() {
  const db = await initDb(); // ينشئ الجداول تلقائيًا إن لم تكن موجودة (SQLite أو MySQL حسب DB_DRIVER)
  logger.info(`قاعدة البيانات جاهزة (المحرّك: ${db.driver})`);

  const app = require('./src/app');
  app.listen(config.port, () => {
    logger.info(`الخادم يعمل على المنفذ ${config.port} (${config.env})`);
    if (config.serveFrontend) logger.info(`الواجهة الأمامية تُقدَّم من: ${config.frontendDir}`);
  });
}

main().catch((e) => {
  logger.error('فشل إقلاع الخادم', { message: e.message });
  process.exit(1);
});
