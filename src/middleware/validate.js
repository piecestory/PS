/**
 * يتحقق من جسم الطلب/المعاملات/الاستعلام مقابل مخطط Zod قبل وصولها لأي
 * وحدة تحكم — بهذا لا تفترض أي وحدة تحكم صحّة البيانات إطلاقًا (دفاع
 * أساسي ضد الحقن وتلاعب المدخلات، ويمنع كذلك أخطاء منطقية صامتة).
 */
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      const err = new Error('بيانات غير صالحة');
      err.name = 'ZodError';
      err.issues = result.error.issues;
      throw err;
    }
    // نستبدل القيم بالنسخة المُتحقَّق منها والمُطبَّعة (coerced) من Zod
    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query;
    next();
  };
}

module.exports = validate;
