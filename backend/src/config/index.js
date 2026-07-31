/**
 * كل متغيرات البيئة تُقرأ من مكان واحد فقط هنا، بقيم افتراضية آمنة
 * للتطوير المحلي. لا تضع أي قيمة حساسة مباشرة في الكود — استخدم .env
 * (انظر .env.example) ولا ترفع ملف .env الحقيقي إلى أي مستودع Git.
 */
require('dotenv').config();
const path = require('node:path');

function required(name, devFallback) {
  const val = process.env[name];
  if (val) return val;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`متغيّر البيئة المطلوب غير موجود: ${name}. راجع .env.example`);
  }
  return devFallback;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),

  // محرّك قاعدة البيانات: "sqlite" (افتراضي، بلا إعداد، مثالي للتطوير المحلي)
  // أو "mysql" (للاستضافات التقليدية التي توفّر MySQL مُدارة، مثل هوستينجر)
  dbDriver: process.env.DB_DRIVER || 'sqlite',

  // قاعدة البيانات
  databaseFile: process.env.DATABASE_FILE || path.join(__dirname, '..', '..', 'data', 'store.db'),
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  },

  // الجلسات و JWT — يجب توليد أسرار عشوائية طويلة فعلية في الإنتاج
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-only-access-secret-change-me-32chars-min'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-change-me-32chars-min'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),

  // الأصل المسموح له بالتخاطب (CORS) — دومين الواجهة الأمامية إن كانت منفصلة
  frontendOrigin: process.env.FRONTEND_ORIGIN || null,
  // اجعلها true فقط إذا كانت الواجهة والخادم على نطاقين مختلفين (نشر منفصل)
  crossSiteCookies: process.env.CROSS_SITE_COOKIES === 'true',

  // تقديم ملفات الواجهة الأمامية الثابتة من نفس خدمة الـ backend (نشر موحّد وأبسط)
  serveFrontend: process.env.SERVE_FRONTEND !== 'false',
  frontendDir: process.env.FRONTEND_DIR || path.join(__dirname, '..', '..', '..', 'frontend'),

  // بوابات الدفع
  moyasar: {
    secretKey: process.env.MOYASAR_SECRET_KEY || '',
    publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.MOYASAR_WEBHOOK_SECRET || '',
    apiBase: 'https://api.moyasar.com/v1',
  },
  tabby: {
    secretKey: process.env.TABBY_SECRET_KEY || '',
    publicKey: process.env.TABBY_PUBLIC_KEY || '',
    merchantCode: process.env.TABBY_MERCHANT_CODE || 'SA',
    apiBase: process.env.TABBY_API_BASE || 'https://api.tabby.ai/api',
  },
  tamara: {
    apiToken: process.env.TAMARA_API_TOKEN || '',
    notificationToken: process.env.TAMARA_NOTIFICATION_TOKEN || '',
    apiBase: process.env.TAMARA_API_BASE || 'https://api-sandbox.tamara.co',
  },

  // البريد الإلكتروني (تأكيدات الطلبات)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromAddress: process.env.SMTP_FROM || 'no-reply@pieceandstory.com',
  },

  storeName: process.env.STORE_NAME || 'Piece & Story',
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:4000',
};

module.exports = config;
