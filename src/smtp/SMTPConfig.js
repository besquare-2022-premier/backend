const FakeEmailSMTPProvider = require("./FakeEmailSMTPProvider");

module.exports = {
  SMTPProvider: new FakeEmailSMTPProvider(),
};
