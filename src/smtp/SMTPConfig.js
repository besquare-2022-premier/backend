const FakeEmailSMTPProvider = require("./FakeEmailSMTPProvider");
const SendGridSMTPProvider = require("./sendgrid");

module.exports = {
  SMTPProvider:
    process.env.NODE_ENV === "production"
      ? SendGridSMTPProvider
      : FakeEmailSMTPProvider,
};
