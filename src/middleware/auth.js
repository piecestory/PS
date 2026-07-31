const { verifyAccessToken } = require('../utils/tokens');
const { ApiError } = require('../utils/apiResponse');

/**
 * نقرأ رمز الدخول من كوكي httpOnly (وليس من localStorage أو Header) —
 * هذا يمنع أي كود جافاسكربت خبيث (XSS) من سرقة الرمز مباشرة، لأن
 * httpOnly تجعله غير قابل للقراءة من جافاسكربت أصلًا.
 */
function readToken(req) {
  return req.cookies?.access_token || null;
}

/** يتطلب تسجيل دخول صالح — يرفض الطلب إن لم يوجد */
function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'يلزم تسجيل الدخول للوصول لهذا المورد');
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا');
  }
}

/** يُرفق المستخدم إن وُجد رمز صالح، لكن لا يرفض الطلب إن لم يوجد (تسوّق كضيف) */
function attachUserIfPresent(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
      /* رمز غير صالح لضيف — تجاهله بصمت ولا تُسقط الطلب */
    }
  }
  next();
}

module.exports = { requireAuth, attachUserIfPresent };
