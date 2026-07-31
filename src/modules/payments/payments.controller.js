const service = require('./payments.service');
const { ok, created } = require('../../utils/apiResponse');

async function initiate(req, res) {
  const result = await service.initiatePayment({ orderId: req.body.orderId, providerName: req.body.provider }, req);
  created(res, result);
}

async function confirm(req, res) {
  const result = await service.confirmByReference(req.params.reference, {
    providerPaymentId: req.query.id || req.query.providerPaymentId,
  });
  ok(res, result);
}

/** كل بوابة دفع تصل من نطاقها الخاص بجسم مختلف الشكل — المسار يحدّد أي مزوّد عبر :provider */
async function webhook(req, res) {
  await service.handleWebhook(req.params.provider.toUpperCase(), req);
  // نُعيد 200 دومًا لإشعارات نجحت المعالجة كي لا يُعيد المزوّد الإرسال بلا داعٍ
  res.status(200).json({ received: true });
}

module.exports = { initiate, confirm, webhook };
