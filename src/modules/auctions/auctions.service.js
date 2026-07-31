const repo = require('./auctions.repository');
const { toSar, toHalalas } = require('../../utils/money');
const { fromDbDateTime } = require('../../utils/dates');
const { newId } = require('../../utils/ids');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../db/auditLog');

const MIN_BID_INCREMENT_HALALAS = toHalalas(500); // نفس حد الـ 500 ر.س المعتمد سابقًا في الواجهة

function toPublicAuction(a) {
  return {
    id: a.id,
    lot: a.lot_code,
    title: a.title_ar,
    titleEn: a.title_en || null,
    category: a.category_ar,
    categoryEn: a.category_en || null,
    description: a.description_ar,
    descriptionEn: a.description_en || null,
    image: a.image_url,
    icon: a.icon,
    startPrice: toSar(a.start_price_halalas),
    currentBid: toSar(a.current_bid_halalas),
    bidsCount: a.bids_count,
    status: a.status.toLowerCase(),
    endsAt: fromDbDateTime(a.ends_at).getTime(),
  };
}

async function getAuctions({ status } = {}) {
  const normalized = status && status !== 'all' ? status.toUpperCase() : null;
  return (await repo.listAuctions({ status: normalized })).map(toPublicAuction);
}

async function getAuction(id) {
  const a = await repo.findAuctionById(id);
  if (!a) throw new ApiError(404, 'AUCTION_NOT_FOUND', 'هذا المزاد غير موجود');
  return toPublicAuction(a);
}

async function getBidHistory(auctionId) {
  return (await repo.listBidsForAuction(auctionId)).map((b) => ({
    name: maskName(b.full_name),
    amount: toSar(b.amount_halalas),
    at: b.created_at,
  }));
}

/** نعرض الاسم الكامل مقنَّعًا جزئيًا في سجل المزايدات العام حماية لخصوصية المزايدين */
function maskName(fullName) {
  const parts = String(fullName).trim().split(/\s+/);
  const first = parts[0] || '';
  const rest = parts.slice(1).map((p) => (p ? `${p[0]}.` : ''));
  return [first, ...rest].join(' ');
}

async function placeBid({ auctionId, userId, amountSar }, req) {
  const amountHalalas = toHalalas(amountSar);
  const result = await repo.placeBidTransaction({
    auctionId,
    userId,
    amountHalalas,
    minIncrementHalalas: MIN_BID_INCREMENT_HALALAS,
  });

  if (result.error === 'AUCTION_NOT_FOUND') throw new ApiError(404, 'AUCTION_NOT_FOUND', 'هذا المزاد غير موجود');
  if (result.error === 'AUCTION_NOT_LIVE') throw new ApiError(400, 'AUCTION_NOT_LIVE', 'هذا المزاد غير مفتوح للمزايدة حاليًا');
  if (result.error === 'BID_TOO_LOW') {
    throw new ApiError(400, 'BID_TOO_LOW', `الحد الأدنى للمزايدة هو ${toSar(result.minAllowed).toLocaleString('ar-SA')} ر.س`);
  }

  recordAudit({ userId, action: 'BID_PLACED', entityType: 'auction', entityId: auctionId, req, metadata: { amountHalalas } });
  return toPublicAuction(result.auction);
}

async function createAuction(b, req) {
  const { getDb } = require('../../db/connection');
  const id = newId();
  await getDb().execute(
    `INSERT INTO auctions
     (id, lot_code, title_ar, title_en, category_ar, category_en, description_ar, description_en,
      image_url, icon, start_price_halalas, current_bid_halalas, status, ends_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, b.lotCode, b.titleAr, b.titleEn || null, b.categoryAr, b.categoryEn || null,
      b.descriptionAr || null, b.descriptionEn || null, b.imageUrl || null, b.icon || null,
      toHalalas(b.startPrice), toHalalas(b.startPrice), b.status || 'UPCOMING', b.endsAt,
    ]
  );
  recordAudit({ userId: req.user.id, action: 'AUCTION_CREATED', entityType: 'auction', entityId: id, req });
  return getAuction(id);
}

module.exports = { getAuctions, getAuction, getBidHistory, placeBid, createAuction, toPublicAuction };
