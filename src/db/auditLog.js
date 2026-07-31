const { getDb } = require('./connection');
const { newId } = require('../utils/ids');
const logger = require('../utils/logger');
const { toDbDateTime } = require('../utils/dates');

/**
 * سجل الأنشطة (Audit Log)
 * ---------------------------------------------------------
 * يُستدعى عند: تسجيل الدخول (نجاح/فشل)، إنشاء حساب، تغيير حالة طلب،
 * تغيير حالة دفعة، وضع مزايدة، أي إجراء إداري. ضروري للتحقيق في أي
 * حادثة أمنية أو نزاع مع عميل لاحقًا.
 *
 * ملاحظة: لا نستخدم await هنا عمدًا في نقاط الاستدعاء (fire-and-forget)
 * لأن فشل تسجيل السجل يجب ألا يفشل الطلب الأصلي أبدًا؛ الدالة نفسها async
 * وتُمسك أي خطأ داخليًا وتسجّله كتحذير فقط.
 */
async function recordAudit({ userId = null, action, entityType = null, entityId = null, req = null, metadata = null }) {
  try {
    const db = getDb();
    await db.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        userId,
        action,
        entityType,
        entityId,
        req?.ip || null,
        req?.get?.('user-agent') || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (e) {
    logger.warn('تعذّر كتابة سجل النشاط', { action, message: e.message });
  }
}

/** عدد محاولات الدخول الفاشلة الأخيرة لبريد معيّن — نحسب الحد الزمني في جافاسكربت ليعمل بلا فرق بين SQLite وMySQL */
async function recentFailedLogins(email, sinceMinutes = 15) {
  const db = getDb();
  const sinceIso = toDbDateTime(new Date(Date.now() - sinceMinutes * 60 * 1000));
  const rows = await db.query(
    `SELECT id, metadata FROM audit_logs WHERE action = 'LOGIN_FAILED' AND created_at >= ?`,
    [sinceIso]
  );
  return rows.filter((r) => {
    try { return JSON.parse(r.metadata || '{}').email === email; } catch { return false; }
  }).length;
}

module.exports = { recordAudit, recentFailedLogins };
