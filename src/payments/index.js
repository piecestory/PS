const MoyasarProvider = require('./MoyasarProvider');
const TabbyProvider = require('./TabbyProvider');
const TamaraProvider = require('./TamaraProvider');

const providers = {
  MOYASAR: new MoyasarProvider(),
  TABBY: new TabbyProvider(),
  TAMARA: new TamaraProvider(),
};

/**
 * لإضافة بوابة سعودية جديدة مستقبلًا (HyperPay, PayTabs, Geidea...):
 * 1) أنشئ ملفًا جديدًا هنا يرث من PaymentProvider وينفّذ نفس الدوال.
 * 2) أضِفه إلى القاموس أدناه بسطر واحد.
 * لا حاجة لتعديل أي شيء آخر في orders أو checkout.
 */
function getProvider(name) {
  const provider = providers[name];
  if (!provider) throw new Error(`مزوّد دفع غير مدعوم: ${name}`);
  return provider;
}

module.exports = { getProvider, providers };
