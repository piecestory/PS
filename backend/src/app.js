const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const path = require('node:path');

const config = require('./config');
const { helmetOptions, corsOptions } = require('./config/security');
const { apiLimiter } = require('./middleware/rateLimit');
const { csrfProtection } = require('./middleware/csrf');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// خلف موازن حمل/وكيل عكسي (Render, Nginx...) — ضروري كي تُقرأ IP الحقيقية للعميل بشكل صحيح (يفيد Rate Limiting)
app.set('trust proxy', 1);
// إخفاء توقيع Express من رأس X-Powered-By (تقليل تسريب معلومات عن التقنية المستخدمة)
app.disable('x-powered-by');

app.use(helmet(helmetOptions));
app.use(cors(corsOptions()));
app.use(compression());
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(
  express.json({
    limit: '1mb',
    // نحتفظ بالجسم الخام أيضًا — تحتاجه بعض بوابات الدفع (مثل Moyasar) للتحقق من توقيع HMAC للويبهوك
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(cookieParser());
app.use(csrfProtection);
app.use('/api', apiLimiter);
app.use('/api', apiRoutes);

// تقديم الواجهة الأمامية من نفس الخدمة (نشر موحّد وأبسط لمتجر بهذا الحجم) — يمكن تعطيله بـ SERVE_FRONTEND=false
if (config.serveFrontend) {
  app.use(
    express.static(config.frontendDir, {
      maxAge: config.env === 'production' ? '1d' : 0, // تخزين مؤقت للملفات الثابتة في الإنتاج فقط
      setHeaders(res, filePath) {
        // ملفات HTML نفسها بلا كاش طويل حتى تصل التحديثات فورًا؛ الأصول (CSS/JS/صور) يمكن أن تُخزَّن أطول
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );
}

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
