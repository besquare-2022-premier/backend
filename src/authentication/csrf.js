/**
 * Cross Site Request Forgery protection related routines
 */

const { randomID } = require("./utils");

class CSRFTokenInfo {
  /**
   * @param {string} owner The base token which the token was bound to
   * @param {"access"|"session"} type The type of base token
   */
  constructor(owner, type) {
    this.owner = owner;
    this.type = type;
    this.expiry = Date.now() + (owner === "test") ? 1000 : 600000;
  }
  get isValid() {
    return this.expiry >= Date.now();
  }
}

/**
 * @type {{[key:string]:CSRFTokenInfo}}
 */
const tokens = {};

/**
 * Create a crsf token
 * @param {string} owner The base token which the token was bound to
 * @param {"access"|"session"} type The type of base token
 */
async function createToken(owner, type) {
  //first destroy token related to a owner
  for (const token of Object.keys(tokens)) {
    const info = tokens[token];
    if (!info.isValid) {
      delete tokens[token];
      continue;
    }
    if (owner === info.owner && type === info.type) {
      delete tokens[token];
      break;
    }
  }
  const token = await randomID();
  tokens[token] = new CSRFTokenInfo(owner, type);
  return token;
}

/**
 * Verify and delete a crsf token
 * @param {string} token
 * @param {string} owner The base token which the token was bound to
 * @param {"access"|"session"} type The type of base token
 * @returns {boolean}
 */
function verifyToken(token, owner, type) {
  const info = tokens[token];
  if (!info) {
    return false;
  }
  if (!info.isValid) {
    delete tokens[token];
    return false;
  }
  if (owner !== info.owner || type !== info.type) {
    return false;
  }
  delete tokens[token];
  return true;
}

/**
 * Remove the expired tokens
 */
function runGC() {
  for (const token of Object.keys(tokens)) {
    const info = tokens[token];
    if (!info.isValid) {
      delete tokens[token];
    }
  }
}

module.exports = { createToken, verifyToken, runGC };
