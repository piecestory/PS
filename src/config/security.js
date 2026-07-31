const config = require('./index');

/**
 * سياسة أمان المحتوى (CSP)
 * ---------------------------------------------------------
 * نطاقات بوابات الدفع أدناه هي الأفضل معرفة وقت الكتابة استنادًا لتوثيق
 * كل مزوّد — لكن هذه النطاقات قابلة للتغيير من جهتهم، فتحقّق منها في
 * لوحة/توثيق كل بوابة قبل الإطلاق الفعلي وحدّثها هنا إن لزم.
 * لماذا لا "unsafe-inline" في script-src؟ لأن كل الأكواد البرمجية هنا
 * منقولة لملفات JS خارجية (انظر frontend/js/pages) بدل <script> مضمّن
 * داخل الصفحات — هذا بالتحديد ما يسمح بسياسة صارمة تمنع حقن XSS.
 */
const scriptSrc = ["'self'", 'https://cdn.moyasar.com', 'https://checkout.tabby.ai'];
const connectSrc = ["'self'", 'https://api.moyasar.com', 'https://api.tabby.ai', 'https://checkout.tamara.co', 'https://api.tamara.co', 'https://api-sandbox.tamara.co'];
const frameSrc = ["'self'", 'https://cdn.moyasar.com', 'https://checkout.tabby.ai', 'https://checkout.tamara.co'];
const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];
const fontSrc = ["'self'", 'https://fonts.gstatic.com', 'data:'];

const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc,
      fontSrc,
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc,
      frameSrc,
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", 'https://checkout.tabby.ai', 'https://checkout.tamara.co'],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: config.env === 'production' ? [] : null,
    },
  },
  // HSTS يفرض HTTPS على المتصفح لمدة سنتين — لا يُفعَّل محليًا لتفادي مشاكل http://localhost
  hsts: config.env === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  crossOriginEmbedderPolicy: false, // قد يمنع تحميل عناصر بوابات الدفع المضمَّنة
};

function corsOptions() {
  return {
    origin: config.frontendOrigin || true, // true = نفس الأصل تلقائيًا عند عدم ضبط نطاق منفصل
    credentials: true, // ضروري كي يُرسَل كوكي الجلسة مع الطلبات
  };
}

module.exports = { helmetOptions, corsOptions };
