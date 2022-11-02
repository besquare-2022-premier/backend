/**
 * Orders endpoints which are mounted under `/api/v1/orders`
 */
const { isInteger } = require("@junchan/type-check");
const express = require("express");
const DATABASE = require("../database/DBConfig");
const IDatabase = require("../database/IDatabase");
const AuthenticatedEndpointMiddleware = require("../middlewares/authenticated");
const { NonCachable, ClientOnlyCacheable } = require("../middlewares/caching");
const CSRFProtectedMiddleware = require("../middlewares/csrf_protected");
const {
  INEXISTANT_ORDER_ID,
  INEXISTANT_PRODUCT_ID,
  ITEMS_OUT_OF_STOCK,
  UNPROCESSABLE_ENTITY,
} = require("../types/error_codes");
const PagedResponseBase = require("../types/paged_response_base");
const ResponseBase = require("../types/response_base");
const {
  asyncExpressHandler,
  sendJsonResponse,
  assertJsonRequest,
} = require("./common_utils");

const app = express.Router();
app.use(AuthenticatedEndpointMiddleware);
app.use(ClientOnlyCacheable.bind(60));
app.get(
  "/",
  asyncExpressHandler(async function (req, res) {
    let { page, limit } = req.query;
    page = page | 0 || 1;
    limit = limit | 0 || 50;
    let offset = limit * (page - 1);
    let orders = await DATABASE.getOrdersOfUser(req.user);
    orders = page >= 1 ? orders.slice(offset, offset + 50) : [];
    let transactions = await Promise.all(
      orders.map((z) =>
        DATABASE.searchTransactionForOrder(req.user, z.orderid).then((y) => {
          if (!y) throw new Error("Cannot get transaction for it. Why?");
          return y;
        })
      )
    );
    /**
     * @type {{order_id:number,time:Date,transaction_id:number,transaction_status:keyof(Transaction.Status),total_amount:number}[]}
     */
    let response = [];
    for (let i = 0; i < orders.length; i++) {
      let order = orders[i];
      let transaction = transactions[i];
      response.push({
        order_id: order.orderid,
        transaction_id: transaction.tx_id,
        transaction_status: transaction.tx_status.description,
        time: transaction.tx_time,
        total_amount: transaction.amount,
      });
      sendJsonResponse(
        res,
        200,
        new PagedResponseBase(offset, page, orders.length, response)
      );
    }
  })
);
app.get(
  "/:order_id",
  asyncExpressHandler(async function (req, res) {
    let { order_id } = req.params;
    if (((order_id |= 0), order_id <= 0)) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_ORDER_ID, "Invalid or inexistant order id")
      );
      return;
    }
    const order = await DATABASE.getUserOrder(req.user, order_id);
    let transaction_promise = DATABASE.searchTransactionForOrder(
      req.user,
      order_id
    );
    if (!order) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_ORDER_ID, "Invalid or inexistant order id")
      );
      return;
    }
    let transaction = await transaction_promise;
    if (!transaction) {
      throw new Error("Cannot get transaction for it. Why?");
    }
    let response = {
      order_id: order.orderid,
      transaction_id: transaction.tx_id,
      transaction_status: transaction.tx_status.description,
      time: transaction.tx_time,
      total_amount: transaction.amount,
      items: await order.items.map((z) =>
        DATABASE.getProduct(z.product_id).then((y) => {
          z.product_name = y.name;
          return z;
        })
      ),
    };
    sendJsonResponse(res, 200, response);
  })
);
app.use(CSRFProtectedMiddleware);
app.use(NonCachable);
/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function getCart(req, res) {
  const cart = await DATABASE.getUserCart(req.user);
  const items = await cart.items.map((z) =>
    DATABASE.getProduct(z.product_id).then((y) => {
      z.product_name = y.name;
      z.available = y.stock !== 0;
      return z;
    })
  );
  sendJsonResponse(res, 200, items);
}
app.get("/cart", asyncExpressHandler(getCart));
app.patch(
  "/cart",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { body } = req;
    const cart = await DATABASE.getUserCart(req.user);
    let patch_list = {};
    if (!Array.isArray(req.body)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          UNPROCESSABLE_ENTITY,
          `Request cannot be processed by the server`
        )
      );
      return;
    }
    for (const changes of body) {
      if (
        !isInteger(changes.product_id) ||
        !isInteger(changes.quantity) ||
        changes.quantity < 0
      ) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(
            UNPROCESSABLE_ENTITY,
            `Request cannot be processed by the server as it contains invalid data`
          )
        );
        return;
      }
      //we need the stock count
      const product = await DATABASE.getProduct(changes.product, true);
      if (!product || product.stock === 0) {
        sendJsonResponse(
          res,
          404,
          new ResponseBase(
            INEXISTANT_PRODUCT_ID,
            "Invalid or inexistant product id"
          )
        );
        return;
      } else if (changes.amount <= 0) {
        if (
          cart.items.findIndex((z) => z.product_id === changes.product_id) != -1
        ) {
          patch_list[changes.product_id] = IDatabase.DELETED;
        }
      } else if (product.stock !== 0 && product.stock < changes.amount) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(
            ITEMS_OUT_OF_STOCK,
            "Attempted to add more products that we have!"
          )
        );
        return;
      } else {
        patch_list[changes.product_id] = changes.amount;
      }
      await DATABASE.updateOrderSubtle(cart.orderid, patch_list);
      await getCart(req, res);
    }
  })
);
app.delete(
  "/cart",
  asyncExpressHandler(async function (req, res) {
    //just simply remove all the items from the cart
    const cart = await DATABASE.getUserCart(req.user);
    const patch_list = {};
    for (const item of cart.items) {
      patch_list[item.product_id] = IDatabase.DELETED;
    }
    if (cart.items.length > 0) {
      await DATABASE.updateOrderSubtle(cart.orderid, patch_list);
    }
    sendJsonResponse(res, 200, []);
  })
);
app.post(
  "/cart/populate",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    //get the order
    const { order_id } = req.body;
    const cart = await DATABASE.getUserCart(req.user);
    if ((order_id | 0, order_id <= 0)) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_ORDER_ID, "Invalid or inexistant order id")
      );
      return;
    }
    const order = await DATABASE.getUserOrder(req.user, order_id);
    if (!order) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_ORDER_ID, "Invalid or inexistant order id")
      );
      return;
    }
    //now fill in the cart using the order details
    const patch_list = {};
    for (const item of order.items) {
      patch_list[item.product_id] = item.quantity;
    }
    await DATABASE.updateOrderSubtle(cart.orderid, patch_list);
    await getCart(req, res);
  })
);
app.get(
  "/cart/checkout",
  asyncExpressHandler(async function () {
    ///TODO
  })
);
module.exports = app;