/**
 * الاتصال بقاعدة البيانات — واجهة موحّدة لمحرّكين
 * ---------------------------------------------------------
 * SQLite (افتراضي): عبر node:sqlite المدمجة، صفر إعداد، مثالي للتطوير
 * المحلي أو استضافة بها قرص دائم (VPS، Render...).
 *
 * MySQL: للاستضافات التقليدية المشتركة/السحابية التي توفّر قاعدة MySQL
 * منفصلة عن ملفات التطبيق (مثل هوستينجر) — الخيار الأصح هناك، لأن ملفات
 * التطبيق قد تُستبدل بالكامل عند كل نشر جديد، بينما قاعدة MySQL منفصلة
 * ومستقلة عمدًا فلا تتأثر إطلاقًا.
 *
 * كل بقية الكود (المستودعات) يتعامل فقط مع الدوال الأربع أدناه
 * (query/queryOne/execute/transaction) ولا يعرف أي شيء عن أيهما يعمل
 * فعليًا خلف الكواليس — هذا بالضبط ما تعنيه "Clean Architecture": طبقة
 * العمل لا تعرف تفاصيل التخزين.
 *
 * فعّل MySQL بضبط DB_DRIVER=mysql في .env مع بيانات الاتصال MYSQL_*.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const logger = require('../utils/logger');

let impl = null;

function buildSqliteImpl() {
  const { DatabaseSync } = require('node:sqlite');

  const dbPath = config.databaseFile;
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const isNewFile = dbPath !== ':memory:' && !fs.existsSync(dbPath);

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    try { db.exec('PRAGMA journal_mode = WAL;'); } catch { /* بعض بيئات الملفات لا تدعمه، لا يوقف التشغيل */ }
  }

  const schema = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'database', 'schema.sql'), 'utf8');
  db.exec(schema);
  if (isNewFile) logger.info(`تم إنشاء قاعدة بيانات SQLite جديدة عند: ${dbPath}`);

  const run = (sql, params = []) => db.prepare(sql).run(...params);

  return {
    driver: 'sqlite',
    async query(sql, params = []) { return db.prepare(sql).all(...params); },
    async queryOne(sql, params = []) { return db.prepare(sql).get(...params); },
    async execute(sql, params = []) {
      const info = run(sql, params);
      return { changes: info.changes, lastInsertId: info.lastInsertRowid };
    },
    async upsertSetting(key, value) {
      run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [key, value]
      );
    },
    async transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const tx = {
          query: async (sql, params = []) => db.prepare(sql).all(...params),
          queryOne: async (sql, params = []) => db.prepare(sql).get(...params),
          execute: async (sql, params = []) => {
            const info = run(sql, params);
            return { changes: info.changes, lastInsertId: info.lastInsertRowid };
          },
        };
        const result = await fn(tx);
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

async function buildMysqlImpl() {
  const mysql = require('mysql2/promise');

  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // يبقي التواريخ كنصوص ISO مماثلة لسلوك SQLite بدل كائنات Date المحلية
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'database', 'schema.mysql.sql'), 'utf8');
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length && !s.startsWith('--'));
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  logger.info('تم التحقق من مخطط MySQL (الجداول تُنشأ تلقائيًا إن لم تكن موجودة)');

  return {
    driver: 'mysql',
    async query(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async queryOne(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows[0];
    },
    async execute(sql, params = []) {
      const [result] = await pool.query(sql, params);
      return { changes: result.affectedRows, lastInsertId: result.insertId };
    },
    async upsertSetting(key, value) {
      await pool.query('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, value]);
    },
    async transaction(fn) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const tx = {
          query: async (sql, params = []) => { const [rows] = await conn.query(sql, params); return rows; },
          queryOne: async (sql, params = []) => { const [rows] = await conn.query(sql, params); return rows[0]; },
          execute: async (sql, params = []) => {
            const [result] = await conn.query(sql, params);
            return { changes: result.affectedRows, lastInsertId: result.insertId };
          },
        };
        const result = await fn(tx);
        await conn.commit();
        return result;
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
  };
}

/** يُستدعى مرة واحدة عند إقلاع الخادم (server.js) قبل بدء الاستماع للطلبات */
async function initDb() {
  if (impl) return impl;
  impl = config.dbDriver === 'mysql' ? await buildMysqlImpl() : buildSqliteImpl();
  return impl;
}

/** يُستخدم من كل المستودعات بعد التهيئة — يفشل بوضوح إن استُدعي قبل initDb() عمدًا بدل فشل غامض لاحقًا */
function getDb() {
  if (!impl) throw new Error('قاعدة البيانات لم تُهيَّأ بعد — تأكد من استدعاء initDb() عند إقلاع الخادم');
  return impl;
}

module.exports = { initDb, getDb };
