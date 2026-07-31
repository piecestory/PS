const { ApiError } = require('../utils/apiResponse');

/**
 * نظام صلاحيات وأدوار
 * ---------------------------------------------------------
 * ثلاثة أدوار: CUSTOMER (عميل)، STAFF (موظف)، ADMIN (مدير).
 * بدل حراسة كل مسار بدور مباشرة (requireRole('ADMIN'))، نُسمّي كل
 * إجراء حسّاس بصلاحية واضحة المعنى (مثال: 'products:write') ونربطها
 * بالأدوار المسموحة هنا في مكان واحد. هذا يجعل الكود في الراوتات
 * مقروءًا (requirePermission('products:write')) ويسهّل توسعة النظام
 * لاحقًا إلى صلاحيات أدق دون تعديل كل مسار على حدة — فقط عدّل هذا الجدول،
 * أو استبدله بجدول قاعدة بيانات role_permissions إن احتجت مرونة أكبر.
 */
const PERMISSIONS = {
  'products:write': ['ADMIN', 'STAFF'],
  'categories:write': ['ADMIN', 'STAFF'],
  'auctions:write': ['ADMIN', 'STAFF'],
  'orders:read:all': ['ADMIN', 'STAFF'],
  'orders:write:status': ['ADMIN', 'STAFF'],
  'settings:write': ['ADMIN'],
  'users:read:all': ['ADMIN'],
  'users:write:role': ['ADMIN'],
  'audit:read': ['ADMIN'],
};

function requirePermission(permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) throw new Error(`صلاحية غير معرَّفة: ${permission}`);

  return (req, _res, next) => {
    if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'يلزم تسجيل الدخول');
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'لا تملك صلاحية القيام بهذا الإجراء');
    }
    next();
  };
}

module.exports = { requirePermission, PERMISSIONS };
