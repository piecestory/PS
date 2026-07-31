const rateLimit = require('express-rate-limit');

/**
 * ملاحظة إنتاج: هذا التحديد يعمل في الذاكرة (per-process). إن شغّلت
 * أكثر من نسخة (instance) واحدة من الخادم خلف موازن حمل، بدّل الخيار
 * `store` هنا إلى مخزن مشترك (rate-limit-redis مع Redis) ليُطبَّق الحد
 * عبر كل النسخ معًا. لنسخة واحدة (الحالة الشائعة لمتجر بهذا الحجم) لا
 * حاجة لذلك.
 */
function jsonRateLimitHandler(req, res) {
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'طلبات كثيرة جدًا خلال وقت قصير، حاول لاحقًا' },
  });
}

// حد عام لكل مسارات الـ API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// حد أشد على تسجيل الدخول والتسجيل — يمنع هجمات القوة الغاشمة على كلمات المرور
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// حد على المزايدات لمنع إغراق مزاد بمزايدات آلية
const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = { apiLimiter, authLimiter, bidLimiter };
