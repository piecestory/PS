/**
 * مسجّل أحداث بسيط. في الإنتاج يُفضَّل توجيه المخرجات إلى خدمة مراقبة
 * مركزية (مثل Better Stack أو Datadog أو CloudWatch) بدل الطرفية فقط —
 * أضف ذلك في هذا الملف عند التفعيل دون تغيير بقية الكود.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function ts() {
  return new Date().toISOString();
}

function line(level, msg, meta) {
  if (LEVELS[level] > currentLevel) return;
  const base = `[${ts()}] [${level.toUpperCase()}] ${msg}`;
  if (meta) console.log(base, JSON.stringify(meta));
  else console.log(base);
}

module.exports = {
  error: (msg, meta) => line('error', msg, meta),
  warn: (msg, meta) => line('warn', msg, meta),
  info: (msg, meta) => line('info', msg, meta),
  debug: (msg, meta) => line('debug', msg, meta),
};
