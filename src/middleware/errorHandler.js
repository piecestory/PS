const config = require('../config');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/apiResponse');

/** يُستخدم في نهاية سلسلة الميدلوير — أي خطأ في أي راوت (بما فيها async بفضل Express 5) ينتهي هنا */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // أخطاء التحقق من صحة المدخلات (Zod)
  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'البيانات المُرسلة غير صالحة',
        details: err.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  // أي خطأ غير متوقّع — سجّله بالتفصيل داخليًا، لكن أعطِ العميل رسالة عامة فقط
  logger.error('خطأ غير متوقع', { message: err?.message, stack: config.env !== 'production' ? err?.stack : undefined });
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ غير متوقع من جهتنا. حاول مجددًا خلال لحظات.',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'المسار المطلوب غير موجود' } });
}

module.exports = { errorHandler, notFoundHandler };
