const crypto = require('node:crypto');
const config = require('../config');
const { ApiError } = require('../utils/apiResponse');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * حماية CSRF بنمط "الإرسال المزدوج" (Double-Submit Cookie)
 * ---------------------------------------------------------
 * لأن رموز الدخول محفوظة في كوكي (وليس Authorization header)، يرسلها
 * المتصفح تلقائيًا مع أي طلب لنفس الدومين — بما فيها طلبات مزوَّرة من
 * موقع خبيث آخر. الحل: عند كل جلسة نضع كوكي ثانٍ غير httpOnly يحمل
 * رمزًا عشوائيًا؛ الواجهة الأمامية تقرأه وترسله كـ Header مع كل طلب
 * معدِّل للبيانات (POST/PUT/PATCH/DELETE)؛ الخادم يقارن الاثنين. موقع
 * خارجي يقدر يجعل المتصفح يرسل الكوكي تلقائيًا، لكنه لا يقدر يقرأه
 * ليضعه في الـ Header (سياسة نفس المصدر تمنعه) — فتفشل المطابقة.
 * يُضاف هذا فوق حماية SameSite على كوكي الجلسة نفسها كطبقة دفاع إضافية.
 */
function issueCsrfCookie(req, res) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // يجب أن تقرأه الواجهة الأمامية
      secure: config.env === 'production',
      sameSite: config.crossSiteCookies ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  return token;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfProtection(req, res, next) {
  // نضمن وجود كوكي CSRF لأي طلب (يفيد أول تحميل للصفحة)
  issueCsrfCookie(req, res);

  if (SAFE_METHODS.has(req.method)) return next();
  // نقاط استقبال الإشعارات (webhooks) من بوابات الدفع تأتي من خوادمهم لا من متصفح المستخدم،
  // ولا تحمل كوكي أصلًا — تحميها توقيعاتها الخاصة بدل CSRF (انظر وحدات الدفع)
  if (req.path.startsWith('/api/payments/webhooks/')) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ApiError(403, 'CSRF_FAILED', 'تعذّر التحقق من صحة الطلب (CSRF)، أعد تحميل الصفحة وحاول مجددًا');
  }
  next();
}

module.exports = { csrfProtection, CSRF_COOKIE, CSRF_HEADER };
