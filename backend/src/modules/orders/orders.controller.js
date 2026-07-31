const service = require('./orders.service');
const { ok, created } = require('../../utils/apiResponse');

async function checkout(req, res) {
  const order = await service.checkout(req.body, req);
  created(res, order);
}

async function getOrder(req, res) {
  ok(res, await service.getOrder(req.params.id));
}

async function getByNumber(req, res) {
  ok(res, await service.getOrderByNumber(req.params.orderNumber));
}

async function myOrders(req, res) {
  ok(res, await service.getMyOrders(req.user.id));
}

async function allOrders(req, res) {
  ok(res, await service.getAllOrders({ status: req.query.status }));
}

async function updateStatus(req, res) {
  ok(res, await service.setOrderStatus(req.params.id, req.body.status, req));
}

module.exports = { checkout, getOrder, getByNumber, myOrders, allOrders, updateStatus };
