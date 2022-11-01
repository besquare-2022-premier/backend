/**
 * products endpoints which are mounted under `/api/v1/product`
 */
const express = require("express");
const { asyncExpressHandler, sendJsonResponse } = require("./common_utils");
const DATABASE = require("../database/DBConfig");
const PagedResponseBase = require("../types/paged_response_base");
const app = express.Router();
const { PubliclyCacheable, NonCachable } = require("../middlewares/caching");
const { isInteger } = require("@junchan/type-check");
const ResponseBase = require("../types/response_base");
const { INEXISTANT_PRODUCT_ID, NO_ERROR } = require("../types/error_codes");
app.use(NonCachable);
app.get(
  "/stocks/:id",
  asyncExpressHandler(async function (req, res) {
    let { id } = req.params;
    if (!isInteger(id) || ((id |= 0), id <= 0)) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(
          INEXISTANT_PRODUCT_ID,
          "Invalid or inexistant product id"
        )
      );
      return;
    }
    const product = await DATABASE.getProduct(id, true);
    if (!product) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(
          INEXISTANT_PRODUCT_ID,
          "Invalid or inexistant product id"
        )
      );
      return;
    }
    //TODO maybe we will switch to streaming mode
    //so dont brother to implement the response type
    //for it
    const response = new ResponseBase(NO_ERROR);
    response.stock = product.stock;
    sendJsonResponse(res, 200, response);
  })
);
app.use(PubliclyCacheable.bind(60));
app.get(
  "/",
  asyncExpressHandler(async function (req, res) {
    let { q, page, limit, rnd } = req.query;
    page = page ?? 1;
    rnd = q ? false : rnd ?? 0;
    limit = limit ?? 50;
    let offset = limit * (page - 1);
    let ids =
      page >= 0
        ? await DATABASE.getProducts(q ?? null, offset, limit, !!rnd)
        : [];
    let products = await Promise.all(
      ids.map((z) =>
        DATABASE.getProduct(z).then((r) => {
          if (!r) {
            throw new Error(`Cannot fetch the product ${z}`);
          }
          return r;
        })
      )
    );
    sendJsonResponse(
      res,
      200,
      new PagedResponseBase(offset, page, products.length, products)
    );
  })
);
app.get(
  "/categories",
  asyncExpressHandler(async function (_req, res) {
    let categories = await DATABASE.getCategories();
    sendJsonResponse(res, Object.keys(categories));
  })
);
app.get(
  "/:category",
  asyncExpressHandler(async function (req, res) {
    let { q, page, limit, rnd } = req.query;
    page = page ?? 1;
    rnd = q ? false : rnd ?? 0;
    limit = limit ?? 50;
    let offset = limit * (page - 1);
    let ids =
      page >= 0
        ? await DATABASE.getProductsByCategory(
            req.params.category,
            q ?? null,
            offset,
            limit,
            !!rnd
          )
        : [];
    let products = await Promise.all(
      ids.map((z) =>
        DATABASE.getProduct(z).then((r) => {
          if (!r) {
            throw new Error(`Cannot fetch the product ${z}`);
          }
          return r;
        })
      )
    );
    sendJsonResponse(
      res,
      200,
      new PagedResponseBase(offset, page, products.length, products)
    );
  })
);
module.exports = app;
