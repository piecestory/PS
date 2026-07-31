const { getDb } = require('../../db/connection');
const { newId } = require('../../utils/ids');

async function listAuctions({ status } = {}) {
  const db = getDb();
  if (status && status !== 'all') {
    return db.query('SELECT * FROM auctions WHERE status = ? ORDER BY ends_at ASC', [status]);
  }
  return db.query('SELECT * FROM auctions ORDER BY ends_at ASC', []);
}

async function findAuctionById(id) {
  return getDb().queryOne('SELECT * FROM auctions WHERE id = ?', [id]);
}

async function listBidsForAuction(auctionId, limit = 10) {
  return getDb().query(
    `SELECT b.*, u.full_name FROM bids b JOIN users u ON u.id = b.user_id
     WHERE b.auction_id = ? ORDER BY b.created_at DESC LIMIT ?`,
    [auctionId, limit]
  );
}

/**
 * يسجّل مزايدة بأمان ضمن معاملة واحدة (تحجز الكتابة فورًا فتمنع "شرط
 * السباق" لو وصلت مزايدتان في نفس اللحظة تقريبًا): يعيد قراءة أعلى سعر
 * حالي، يتأكد أن المبلغ الجديد أعلى من الحد الأدنى المطلوب، ثم يحدّث
 * المزاد ويضيف سجل المزايدة معًا — تعمل نفس الدالة فوق SQLite أو MySQL
 * لأنها تستخدم فقط واجهة tx.queryOne/execute الموحّدة.
 */
async function placeBidTransaction({ auctionId, userId, amountHalalas, minIncrementHalalas }) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const auction = await tx.queryOne('SELECT * FROM auctions WHERE id = ?', [auctionId]);
    if (!auction) return { error: 'AUCTION_NOT_FOUND' };
    if (auction.status !== 'LIVE') return { error: 'AUCTION_NOT_LIVE' };

    const minAllowed = auction.current_bid_halalas + minIncrementHalalas;
    if (amountHalalas < minAllowed) return { error: 'BID_TOO_LOW', minAllowed };

    await tx.execute(
      `UPDATE auctions SET current_bid_halalas = ?, bids_count = bids_count + 1 WHERE id = ?`,
      [amountHalalas, auctionId]
    );
    await tx.execute(
      `INSERT INTO bids (id, auction_id, user_id, amount_halalas) VALUES (?, ?, ?, ?)`,
      [newId(), auctionId, userId, amountHalalas]
    );

    return { auction: await tx.queryOne('SELECT * FROM auctions WHERE id = ?', [auctionId]) };
  });
}

module.exports = { listAuctions, findAuctionById, listBidsForAuction, placeBidTransaction };
