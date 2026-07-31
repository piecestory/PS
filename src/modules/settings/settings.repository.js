const { getDb } = require('../../db/connection');

async function getAll() {
  return getDb().query('SELECT * FROM settings', []);
}
async function get(key) {
  const row = await getDb().queryOne('SELECT value FROM settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}
async function set(key, value) {
  await getDb().upsertSetting(key, String(value));
}

module.exports = { getAll, get, set };
