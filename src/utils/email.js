const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;
function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * يرسل بريد تأكيد بعد نجاح الدفع. يتطلّب ضبط SMTP_HOST/SMTP_USER/SMTP_PASS
 * في .env (أي مزوّد بريد معاملات مثل Resend أو Postmark أو Amazon SES أو
 * حتى Gmail SMTP للتجربة). إن لم تُضبط، يسجّل تحذيرًا فقط ولا يوقف تأكيد الطلب —
 * تأكيد الدفع والفوترة لا يجب أن يعتمدا على نجاح إرسال بريد إشعاري.
 */
async function sendOrderConfirmationEmail(order) {
  const to = order.address?.email || order.guestEmail;
  const t = getTransporter();
  if (!t || !to) {
    logger.info('تخطّي إرسال بريد التأكيد (SMTP غير مضبوط أو لا يوجد بريد للعميل)', { orderNumber: order.orderNumber });
    return;
  }
  const itemsHtml = order.items.map((i) => `<li>${i.title} × ${i.quantity} — ${i.lineTotal.toLocaleString('ar-SA')} ر.س</li>`).join('');
  await t.sendMail({
    from: config.smtp.fromAddress,
    to,
    subject: `تأكيد طلبك رقم ${order.orderNumber} — Piece & Story`,
    html: `<div dir="rtl" style="font-family:sans-serif">
      <h2>شكرًا لك، تم تأكيد طلبك</h2>
      <p>رقم الطلب: <b>${order.orderNumber}</b></p>
      <ul>${itemsHtml}</ul>
      <p>الإجمالي: <b>${order.total.toLocaleString('ar-SA')} ر.س</b></p>
    </div>`,
  });
}

module.exports = { sendOrderConfirmationEmail };
