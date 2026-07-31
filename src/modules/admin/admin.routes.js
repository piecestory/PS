const router = require('express').Router();
const { z } = require('zod');
const { getDb } = require('../../db/connection');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { recordAudit } = require('../../db/auditLog');

/**
 * مسارات إدارية أساسية تُثبت عمل نظام الأدوار والصلاحيات فعليًا.
 * لبناء لوحة تحكم كاملة (واجهة رسومية) لاحقًا، هذه المسارات جاهزة
 * لتُستهلك مباشرة من أي تطبيق إداري تُضيفه فوقها دون تعديل الخادم.
 */

router.get('/audit-logs', requireAuth, requirePermission('audit:read'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = await getDb().query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  ok(res, rows.map((r) => ({
    id: r.id, userId: r.user_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id,
    ip: r.ip_address, at: r.created_at, metadata: r.metadata ? JSON.parse(r.metadata) : null,
  })));
});

router.get('/users', requireAuth, requirePermission('users:read:all'), async (req, res) => {
  const rows = await getDb().query('SELECT id, email, phone, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC', []);
  ok(res, rows.map((u) => ({ id: u.id, email: u.email, phone: u.phone, fullName: u.full_name, role: u.role, isActive: !!u.is_active, createdAt: u.created_at })));
});

const roleSchema = z.object({
  body: z.object({ role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']) }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional(),
});

router.patch('/users/:id/role', requireAuth, requirePermission('users:write:role'), validate(roleSchema), async (req, res) => {
  await getDb().execute('UPDATE users SET role = ? WHERE id = ?', [req.body.role, req.params.id]);
  recordAudit({ userId: req.user.id, action: 'USER_ROLE_CHANGED', entityType: 'user', entityId: req.params.id, req, metadata: { role: req.body.role } });
  ok(res, { id: req.params.id, role: req.body.role });
});

module.exports = router;
