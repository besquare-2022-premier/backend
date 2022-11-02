const { isString } = require("@junchan/type-check");
const nodemailer = require("nodemailer");
class FakeEmailSMTPProvider {
  /**
   *
   * @param {string} email
   * @param {string} subject
   * @param {string} content
   * @param {string} from
   */
  static async sendEmail(
    email,
    subject,
    content,
    from = "no-reply@merch-paradise.xyz"
  ) {
    if (!FakeEmailSMTPProvider.transporter) {
      const { FAKE_MAIL_USER, FAKE_MAIL_PASS } = process.env;
      let account;
      if (isString(FAKE_MAIL_PASS) && isString(FAKE_MAIL_USER)) {
        account = {
          user: FAKE_MAIL_USER,
          pass: FAKE_MAIL_PASS,
        };
      } else {
        account = await nodemailer.createTestAccount();
      }
      console.log(account);
      FakeEmailSMTPProvider.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        pool: true,
        secure: false, // true for 465, false for other ports
        auth: {
          user: account.user, // generated ethereal user
          pass: account.pass, // generated ethereal password
        },
      });
    }
    /**
     * @type{nodemailer.Transporter}
     */
    const { transporter } = FakeEmailSMTPProvider;
    await transporter.sendMail({
      from,
      to: email,
      subject,
      html: content,
    });
  }
}

module.exports = FakeEmailSMTPProvider;
