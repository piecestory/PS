const service = require('./auctions.service');
const { ok, created } = require('../../utils/apiResponse');

async function listAuctions(req, res) {
  ok(res, await service.getAuctions({ status: req.query.status }));
}

async function getAuction(req, res) {
  const auction = await service.getAuction(req.params.id);
  const bids = await service.getBidHistory(req.params.id);
  ok(res, { ...auction, recentBids: bids });
}

async function placeBid(req, res) {
  const auction = await service.placeBid({ auctionId: req.params.id, userId: req.user.id, amountSar: req.body.amount }, req);
  ok(res, auction);
}

async function createAuction(req, res) {
  created(res, await service.createAuction(req.body, req));
}

module.exports = { listAuctions, getAuction, placeBid, createAuction };
