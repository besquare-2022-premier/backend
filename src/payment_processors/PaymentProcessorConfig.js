const FakePaymentProcessor = require("./FakePaymentProcessor");
const IPaymentProcessor = require("./IPaymentProcessor");

/**
 * @type {IPaymentProcessor}
 */
module.exports =
  process.env.NODE_ENV === "production"
    ? new (require("./StripePaymentProessor"))() //the require must be inlined or it might breaks debug build
    : new FakePaymentProcessor();

if (!(module.exports instanceof IPaymentProcessor)) {
  throw new Error(
    "The payment processor is not an instance of IPaymentProcessor"
  );
}
