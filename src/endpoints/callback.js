/**
 * NOT A PUBLIC ENDPOINT
 * This is a part of the hook that the external provider shall call us
 */
const express = require("express");
const { verifyHmacForUrl } = require("../authentication/hmac");
const { UNPROCESSABLE_ENTITY, AUTH_FAILED } = require("../types/error_codes");
const ResponseBase = require("../types/response_base");
const { asyncExpressHandler, sendJsonResponse } = require("./common_utils");
const DATABASE = require("../database/DBConfig");
const PROCESSOR = require("../payment_processors/PaymentProcessorConfig");
const Transaction = require("../models/transaction");
const app = express.Router();
app.get(
  "/",
  asyncExpressHandler(async function (req, res) {
    //authenticate the request first
    let { txid, loginid, sig } = req.query;
    if ((txid | 0) != txid || !sig || (loginid | 0) != loginid) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNPROCESSABLE_ENTITY, "Not a valid callback!")
      );
      return;
    }
    txid |= 0;
    loginid |= 0;
    if (
      !verifyHmacForUrl(
        sig,
        req.baseUrl,
        { txid, loginid },
        process.env.CALLBACK_SECRET ?? "BACKEND_PREMIER_OPS_TEST"
      )
    ) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(AUTH_FAILED, "Not a valid signature for request")
      );
      return;
    }
    //the request is now ready to be commited
    //get the ref id
    let tx = await DATABASE.getTransaction(loginid, txid);
    //query the processor for the status
    let ref = tx.tx_reference;
    if (!ref) {
      throw new Error("No reference id");
    }
    let status = await PROCESSOR.querySessionStatus(ref);
    //commit the status
    if (status === Transaction.Status.CREATED) {
      throw new Error("Unfinalized transaction");
    } else if (status !== Transaction.Status.SUCCEEDED) {
      //revert the order
      await DATABASE.revertTransaction(tx.loginid, tx.orderid);
    }
    await DATABASE.updateTransactionSubtle(txid, {
      tx_status: status,
      tx_settle_time: new Date(),
    });
    res.status(204).end();
  })
);
module.exports = app;
