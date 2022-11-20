//the class defs
const IPaymentProcessor = require("./IPaymentProcessor");
//the stripe libs
const Stripe = require("stripe");
const { computeHmacForUrl } = require("../authentication/hmac");
const Transaction = require("../models/transaction");
const stripe = Stripe(process.env.STRIPE_API_KEY);
//assert on missing keys
if (!process.env.STRIPE_API_KEY) {
  throw new Error(
    "Cannot boot up the application!! Missing the STRIPE_API_KEY"
  );
}
if (!process.env.CALLBACK_SECRET) {
  throw new Error(
    "Cannot boot up the application!! Missing the CALLBACK_SECRET"
  );
}
class StripePaymentProcessor extends IPaymentProcessor {
  async createNewSession(txid, loginid, amount) {
    let hmac = computeHmacForUrl(
      "/__callback",
      { txid, loginid, resolution: "pass" },
      process.env.CALLBACK_SECRET
    );
    const BASE_URL = `https://api.merch-paradise.xyz/__callback?txid=${txid}&loginid=${loginid}`;
    let success_url = `${BASE_URL}&resolution=pass&sig=${hmac}`;
    hmac = computeHmacForUrl(
      "/__callback",
      { txid, loginid, resolution: "void" },
      process.env.CALLBACK_SECRET
    );
    let cancel_url = `${BASE_URL}&resolution=void&sig=${hmac}`;
    //construct a request to the stripe
    const session = await stripe.checkout.sessions.create({
      success_url,
      cancel_url,
      line_items: [
        {
          price_data: {
            currency: "MYR",
            product_data: {
              name: "Merch paradise item checkout",
            },
            unit_amount_decimal: amount,
            tax_behavior: "inclusive",
          },
          quantity: 1,
        },
      ],
      metadata: {
        txid,
        loginid,
      },
      mode: "payment",
      expires_at: (new Date().getTime() / 1000 + 1800) | 0,
    });
    return { session_id: session.id, url: session.url };
  }
  async querySessionStatus(session_id) {
    //get the session data from stripe first
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent"],
    });
    //check some explicit flags
    const preprocessed = this.preprocessSessionStatus(session);
    if (preprocessed) {
      return preprocessed;
    }
    //if the is completed check the payment intent itself for more info
    //map the payment_intent status into the internal status
    switch (session.payment_intent.status) {
      case "canceled":
        return Transaction.Status.CANCELLED;
      case "succeeded":
        return Transaction.Status.SUCCEEDED;
      default:
        return Transaction.Status.CREATED;
    }
  }
  preprocessSessionStatus(session) {
    if (session.status === "expired") {
      return Transaction.Status.FAILED;
    } else if (session.status === "open") {
      return Transaction.Status.CREATED;
    } else {
      return null;
    }
  }
  async destroySession(session_id) {
    try {
      await stripe.checkout.sessions.expire(session_id);
    } catch (e) {
      console.error(e);
    }
  }
  get name() {
    return "Stripe";
  }
}

module.exports = StripePaymentProcessor;
