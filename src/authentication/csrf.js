/**
 * Cross Site Request Forgery protection related routines
 */

const { randomID } = require("./utils");
const use_redis = process.env.REDIS_HOST && process.env.REDIS_PASS;
const validity = 60;
const REDIS = require("../redis/RedisStore");
class CSRFTokenInfo {
  /**
   * @param {string} owner The base token which the token was bound to
   * @param {"access"|"session"} type The type of base token
   */
  constructor(owner, type) {
    this.owner = owner;
    this.type = type;
    this.expiry = Date.now() + (owner === "test" ? 1000 : validity * 1000);
  }
  get isValid() {
    return this.expiry >= Date.now();
  }
  static restoreFromJson(json) {
    let ret = new CSRFTokenInfo(json.owner, json.type);
    ret.expiry = json.expiry;
    return ret;
  }
}

/**
 * In memory store w/o redis
 * @type {{[key:string]:CSRFTokenInfo}}
 */
const tokens = {};
const redisKey = (k) => `csrf$$${k}`;

/**
 * Create a crsf token
 * @param {string} owner The base token which the token was bound to
 * @param {"access"|"session"} type The type of base token
 */
async function createToken(owner, type) {
  if (!use_redis) {
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
  }
  const token = await randomID();
  if (use_redis) {
    await REDIS.set(
      redisKey(token),
      new CSRFTokenInfo(owner, type),
      owner === "test" ? 1 : validity
    );
  } else {
    tokens[token] = new CSRFTokenInfo(owner, type);
  }
  return token;
}

/**
 * Verify and delete a crsf token
 * @param {string} token
 * @param {string} owner The base token which the token was bound to
 * @param {"access"|"session"} type The type of base token
 * @returns {Promise<boolean>}
 */
async function verifyToken(token, owner, type) {
  if (use_redis) {
    let base = await REDIS.getDel(redisKey(token));
    if (!base) {
      return false;
    }
    let info = CSRFTokenInfo.restoreFromJson(base);
    if (owner !== info.owner || type !== info.type) {
      //restore the token to the database
      let ttl = Math.ceil((info.expiry - Date.now()) / 1000);
      //write it in async
      REDIS.set(redisKey(token), info, ttl, true);
      return false;
    }
    return true;
  } else {
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
}

/**
 * Remove the expired tokens
 */
function runGC() {
  if (use_redis) {
    return;
  }
  for (const token of Object.keys(tokens)) {
    const info = tokens[token];
    if (!info.isValid) {
      delete tokens[token];
    }
  }
}

module.exports = { createToken, verifyToken, runGC };
