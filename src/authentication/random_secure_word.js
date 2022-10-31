const crypto = require("crypto");
const valid_chars =
  "abcedfghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_@#! ";
/**
 * Generate a random secure word
 */
async function randomSecureWord() {
  const chars = (Math.random() * 10000000) % 20;
  const range = valid_chars.length;
  /**
   * @type {Buffer}
   */
  let bytes = await new Promise((resolve, reject) => {
    crypto.randomBytes(chars, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
  let byte_array = Array.from(bytes);
  return byte_array.map((z) => valid_chars[z % range]).join("");
}
module.exports = { randomSecureWord };
