/** شكل استجابة موحّد لكل نقاط الـ API حتى تتعامل الواجهة الأمامية معه بثبات */
function ok(res, data, meta) {
  return res.json({ success: true, data, ...(meta ? { meta } : {}) });
}
function created(res, data) {
  return res.status(201).json({ success: true, data });
}
function fail(res, status, code, message, details) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

/** خطأ عملية (Business Error) يُترجَم تلقائيًا عبر errorHandler إلى استجابة JSON مناسبة */
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { ok, created, fail, ApiError };
