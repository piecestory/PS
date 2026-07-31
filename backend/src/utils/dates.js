/**
 * MySQL (بعكس SQLite) يرفض صيغة ISO القياسية (2026-07-27T12:44:23.000Z)
 * لعمود DATETIME ويتطلّب '2026-07-27 12:44:23' — فرق صياغة بسيط لكنه
 * يُسقط الاتصال بقاعدة البيانات كليًا إن لم يُعالَج. هاتان الدالتان
 * تضمنان أن كل تاريخ نكتبه ونقرأه يبقى UTC صريحًا على كلا المحرّكين،
 * بدل الاعتماد على توقيت الخادم المحلي غير المضمون.
 */
function toDbDateTime(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function fromDbDateTime(value) {
  if (!value) return null;
  const iso = String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`;
  return new Date(iso);
}

module.exports = { toDbDateTime, fromDbDateTime };
