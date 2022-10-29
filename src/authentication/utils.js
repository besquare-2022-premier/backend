const crypto = require("crypto");
async function randomID() {
  /**
   * @type {Buffer}
   */
  let bytes = await new Promise((resolve, reject) => {
    crypto.randomBytes(10, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
  return bytes.toString("hex");
}

module.exports = { randomID };
