const { default: fetch } = require("node-fetch-commonjs");
const { computeHmacForUrl } = require("../authentication/hmac");
const Transaction = require("../models/transaction");
const IPaymentProcessor = require("./IPaymentProcessor");
const MOCK_API_BASE = "http://localhost:5000";
class FakePaymentProcessor extends IPaymentProcessor {
  constructor() {
    super();
  }
  async createNewSession(txid, amount) {
    const hmac = computeHmacForUrl(
      "/__callback",
      { txid },
      FakePaymentProcessor.secret
    );
    //prepare a request to the mock backend
    const payload = {
      vendor: "Backend Dev",
      amount: amount,
      currency: "MYR",
      return_url: `http://localhost:8080/__callback?txid=${txid}&sig=${hmac}`,
    };
    let res = await fetch(`${MOCK_API_BASE}/session`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Cannot send request to the endpoint");
    }
    const { session_id } = await res.json();
    if (!session_id) {
      throw new Error("Invalid response from backend");
    }
    //lets build the url
    const url = `${MOCK_API_BASE}/session/checkout?session_id=${session_id}`;
    return { session_id, url };
  }
  async querySessionStatus(session_id) {
    //
    let res = await fetch(`${MOCK_API_BASE}/session/${session_id}`, {});
    if (!res.ok) {
      throw new Error("Cannot send request to the endpoint");
    }
    const { status } = await res.json();
    if (!status) {
      throw new Error("Invalid response from backend");
    }
    return Transaction.Status[status];
  }
}
//safe to do it as this is not for production use
FakePaymentProcessor.secret = "BACKEND_PREMIER_OPS_TEST";
module.exports = FakePaymentProcessor;
