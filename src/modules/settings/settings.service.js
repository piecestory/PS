const repo = require('./settings.repository');
const config = require('../../config');
const { recordAudit } = require('../../db/auditLog');

const DEFAULTS = {
  whatsapp_number: '966500000000',
  currency: 'SAR',
  // افتراضيًا شحن مجاني للجميع — يطابق سلوك الموقع الأصلي تمامًا (لا توجد رسوم شحن ظاهرة حاليًا).
  // لإضافة رسوم شحن لاحقًا: غيّر هذه القيمة من لوحة التحكم (PATCH /api/settings) دون أي نشر كود جديد.
  shipping_flat_rate_halalas: '0',
  free_shipping_threshold_halalas: '0',
};

async function readSetting(key) {
  const value = await repo.get(key);
  return value ?? DEFAULTS[key] ?? null;
}

/** الإعدادات الآمنة فقط للعرض العام في الواجهة الأمامية (لا نُخرج أي شيء حسّاس) */
async function getPublicSettings() {
  return {
    whatsapp: await readSetting('whatsapp_number'),
    currency: await readSetting('currency'),
    storeName: config.storeName,
  };
}

async function getShippingHalalas(subtotalHalalas) {
  const threshold = Number(await readSetting('free_shipping_threshold_halalas'));
  const flatRate = Number(await readSetting('shipping_flat_rate_halalas'));
  if (threshold > 0 && subtotalHalalas >= threshold) return 0;
  return flatRate;
}

async function updateSetting(key, value, req) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
    throw new Error(`إعداد غير معروف: ${key}`);
  }
  await repo.set(key, value);
  recordAudit({ userId: req.user.id, action: 'SETTING_UPDATED', entityType: 'setting', entityId: key, req, metadata: { value } });
  return readSetting(key);
}

module.exports = { getPublicSettings, getShippingHalalas, updateSetting, readSetting, DEFAULTS };
