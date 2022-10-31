/**
 * products endpoints which are mounted under `/api/v1/product`
 */
const express = require("express");
const { asyncExpressHandler, sendJsonResponse } = require("./common_utils");
const DATABASE = require("../database/DBConfig");
const PagedResponseBase = require("../types/paged_response_base");
const app = express.Router();
app.get(
  "/",
  asyncExpressHandler(async function (req, res, next) {
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
  asyncExpressHandler(async function (req, res, next) {
    let categories = await DATABASE.getCategories();
    sendJsonResponse(res, Object.keys(categories));
  })
);
app.get(
  "/:category",
  asyncExpressHandler(async function (req, res, next) {
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
