/**
 * review endpoints which are mounted under `/api/v1/product-review`
 */
const { isInteger, isString } = require("@junchan/type-check");
const express = require("express");
const {
  asyncExpressHandler,
  sendJsonResponse,
  assertJsonRequest,
} = require("./common_utils");
const DATABASE = require("../database/DBConfig");
const AuthenticatedEndpointMiddleware = require("../middlewares/authenticated");
const { PubliclyCacheable, NonCachable } = require("../middlewares/caching");
const CSRFProtectedMiddleware = require("../middlewares/csrf_protected");
const ResponseBase = require("../types/response_base");
const {
  INEXISTANT_PRODUCT_ID,
  NO_ERROR,
  REQUIRED_FIELD_MISSING,
} = require("../types/error_codes");
const Review = require("../models/review");

const app = express.Router();
app.use(PubliclyCacheable.bind(null, 10));
app.get(
  "/:id",
  asyncExpressHandler(async function (req, res) {
    let { id } = req.params;
    if (((id |= 0), id <= 0)) {
      console.log(id);
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
    if (!(await DATABASE.getProduct(id))) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          INEXISTANT_PRODUCT_ID,
          "Invalid or inexistant product id"
        )
      );
      return;
    }
    const reviews = await DATABASE.getProductReviews(id);
    for (const review of reviews) {
      delete review.loginid;
    }
    sendJsonResponse(res, 200, reviews);
  })
);
app.use(AuthenticatedEndpointMiddleware);
app.use(asyncExpressHandler(CSRFProtectedMiddleware));
app.use(NonCachable);
app.post(
  "/add-review",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { productid, product_rating, product_review } = req.body;
    if (!isInteger(productid)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          INEXISTANT_PRODUCT_ID,
          "Invalid or inexistant product id"
        )
      );
      return;
    }
    if (!(await DATABASE.getProduct(productid))) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          INEXISTANT_PRODUCT_ID,
          "Invalid or inexistant product id"
        )
      );
      return;
    }
    if (!isInteger(product_rating)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          REQUIRED_FIELD_MISSING,
          "Rating field is empty or a valid integer"
        )
      );
      return;
    }
    if (!isString(product_review)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(REQUIRED_FIELD_MISSING, "Review field is empty")
      );
      return;
    }
    await DATABASE.addReview(
      new Review(productid, req.user, "", product_rating, product_review)
    );
    sendJsonResponse(res, 200, new ResponseBase(NO_ERROR, "OK"));
  })
);

module.exports = app;
