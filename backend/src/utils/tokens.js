const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const config = require('../config');

/** توكن دخول قصير العمر يُخزَّن في كوكي httpOnly (لا يقرأه جافاسكربت من المتصفح) */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwtAccessSecret,
    { expiresIn: config.accessTokenTtl }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret);
}

/** رمز تحديث عشوائي طويل — نخزّن في القاعدة "بصمته" (hash) فقط، تمامًا كما مع كلمات المرور،
 *  حتى لا يستفيد أي مخترق لقاعدة البيانات من الرموز الفعلية. */
function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshTokenValue,
  hashToken,
};
