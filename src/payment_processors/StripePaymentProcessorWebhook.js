const express = require("express");
const { asyncExpressHandler } = require("../endpoints/common_utils");
const PaymentProcessor = require("./PaymentProcessorConfig");
const StripePaymentProcessor = require("./StripePaymentProessor");
const DATABASE = require("../database/DBConfig");

if (!(PaymentProcessor instanceof StripePaymentProcessor)) {
  throw new Error(
    "Cannot load the webhook as stripe payment is not used as processor"
  );
}

//assert on missing keys
if (!process.env.STRIPE_API_KEY) {
  throw new Error(
    "Cannot boot up the application!! Missing the STRIPE_API_KEY"
  );
}
if (!process.env.STRIPE_HOOK_SECRET) {
  throw new Error(
    "Cannot boot up the application!! Missing the STRIPE_HOOK_SECRET"
  );
}

/**
 * Webhook processor for the stripe payment processor
 */
const app = express.Router();
app.post(
  "/",
  express.raw({ type: "application/json" }),
  asyncExpressHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_HOOK_SECRET
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        //a checkout is completed, its trigger the database update on this
        let session = event.data.object;
        let status = PaymentProcessor.preprocessSessionStatus(session);
        if (status) {
          //update the database
          let { txid } = session.metadata;
          if (!txid) {
            res.status(400).send(`Webhook Error: Missing metadata`);
            return;
          }
          await DATABASE.updateTransactionSubtle(txid, { tx_status: status });
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  })
);
module.exports = app;
