const FakePaymentProcessor = require("./FakePaymentProcessor");
const IPaymentProcessor = require("./IPaymentProcessor");

/**
 * @type {IPaymentProcessor}
 */
module.exports = new FakePaymentProcessor();

if (!(module.exports instanceof IPaymentProcessor)) {
  throw new Error(
    "The payment processor is not an instance of IPaymentProcessor"
  );
}
