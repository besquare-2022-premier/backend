const { isString } = require("@junchan/type-check");
const { default: fetch } = require("node-fetch-commonjs");
class SendGridSMTPProvider {
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
    const { SENDGRID_KEY } = process.env;
    if (!isString(SENDGRID_KEY)) {
      throw new Error("Missing configuration");
    }
    const url = "https://rapidprod-sendgrid-v1.p.rapidapi.com/mail/send";
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": SENDGRID_KEY,
        "X-RapidAPI-Host": "rapidprod-sendgrid-v1.p.rapidapi.com",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email,
              },
            ],
            subject,
          },
        ],
        from: {
          email: from,
        },
        content: [
          {
            type: "text/html",
            value: content,
          },
        ],
      }),
    };
    fetch(url, options);
  }
}

module.exports = SendGridSMTPProvider;
