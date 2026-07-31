const { getDb } = require('../../db/connection');
const { newId } = require('../../utils/ids');
const { toDbDateTime, fromDbDateTime } = require('../../utils/dates');

async function findByEmail(email) {
  return getDb().queryOne('SELECT * FROM users WHERE email = ?', [email]);
}

async function findById(id) {
  return getDb().queryOne('SELECT * FROM users WHERE id = ?', [id]);
}

async function createUser({ fullName, email, phone, passwordHash, role = 'CUSTOMER' }) {
  const id = newId();
  await getDb().execute(
    `INSERT INTO users (id, email, phone, password_hash, full_name, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email, phone || null, passwordHash, fullName, role]
  );
  return findById(id);
}

async function saveRefreshToken({ userId, tokenHash, expiresAt, userAgent, ipAddress }) {
  const id = newId();
  await getDb().execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, tokenHash, userAgent || null, ipAddress || null, expiresAt]
  );
  return id;
}

async function findActiveRefreshToken(tokenHash) {
  // نقارن تاريخ الانتهاء في جافاسكربت (وليس بدالة قاعدة بيانات كـ datetime('now')) كي تعمل نفس الجملة على SQLite وMySQL بلا فرق
  const row = await getDb().queryOne(
    `SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL`,
    [tokenHash]
  );
  if (!row) return null;
  return fromDbDateTime(row.expires_at).getTime() > Date.now() ? row : null;
}

async function revokeRefreshToken(id) {
  await getDb().execute(`UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?`, [toDbDateTime(), id]);
}

async function revokeAllUserTokens(userId) {
  await getDb().execute(
    `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
    [toDbDateTime(), userId]
  );
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  saveRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
