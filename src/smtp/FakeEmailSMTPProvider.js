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
      const account = await nodemailer.createTestAccount();
      console.log(account);
      FakeEmailSMTPProvider.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
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
    await transporter.sendEmail({
      from,
      to: email,
      subject,
      html: content,
    });
  }
}

module.exports = FakeEmailSMTPProvider;
