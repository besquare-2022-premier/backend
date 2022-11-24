const { randomID } = require("../authentication/utils");

const Redis = require("ioredis").default;
class RedisStore {
  constructor() {
    this.connector = new Redis({
      password: process.env.REDIS_PASS,
      host: process.env.REDIS_HOST,
    });
  }
  /**
   * Get the ttl for the key
   * @param {string} key
   */
  async ttl(key) {
    return await this.connector.ttl(key);
  }
  /**
   * Set an entry in redis
   * @param {string} key
   * @param {any} object
   * @param {number|null} ttl the time to live of the entry, will never expires when it is 0 or null
   * @param {boolean} overwrite Overwrite the entry when it is there
   */
  async set(key, object, ttl, overwrite = true) {
    const opt = [];
    if (ttl) {
      opt.push("EX", ttl);
    }
    if (!(overwrite ?? true)) {
      opt.push("NX");
    }
    await this.connector.set(key, JSON.stringify(object), ...opt);
  }
  /**
   * Obtain a lock of a key, in redis
   * @param {number} ttl
   * @param {number} timeout
   */
  async obtainLock(key, ttl = 60, timeout = -1) {
    const exp = Date.now() + timeout;
    const lockid = await randomID();
    const lock_key = `lock$$kk$$${key}`;
    do {
      //try to set an entry inside the server
      let result = await this.connector.set(lock_key, lockid, "EX", ttl, "NX");
      if (result === "OK") {
        const self = this;
        //we get it
        return async function () {
          await self.connector.del(lock_key);
        };
      }
      await new Promise((pass) => {
        let id = setTimeout(() => {
          clearTimeout(id);
          pass();
        }, 100);
      });
    } while (timeout === -1 || Date.now() <= exp);
    throw new Error("Cannot obtain a lock for the key");
  }
  /**
   * Get the stuffs from the store and optionaly regenerate the data when it is missed
   * @param {string} key
   * @param {()=>Promise<any>|null} generator
   * @param {number} regenerateThreshold
   * @param {number} ttl
   */
  async getOrSet(key, generator = null, regenerateThreshold = 20, ttl = 300) {
    if (typeof generator === "function") {
      let unlock = async () => {};
      try {
        //lock the key for this
        unlock = await this.obtainLock(key, 60, 100);
        const ttl_original = await this.ttl(key);
        //when ttl is about to be expired
        if (ttl_original !== -1 && ttl_original <= regenerateThreshold) {
          //rerun the generator
          let data = await generator();
          await this.set(key, data, ttl, true);
          //update the database
          return data;
        }
      } catch (e) {
        //ignore the error
      } finally {
        await unlock();
      }
    }
    //get the content from the database
    let content = await this.connector.get(key);
    if (typeof generator === "function") {
      if (!content) {
        return await generator();
      }
    }
    return content ? JSON.parse(content) : null;
  }
  /**
   * Get the data but delete it when it succeeded
   * @param {string} key
   */
  async getDel(key) {
    //get the content from the database
    // cannot use
    // let content = await this.connector.getdel(key);
    let tx = this.connector.multi();
    tx.get(key);
    tx.del(key);
    //result of the first command [command index 0] [result index 1] (0 is error)
    let content = (await tx.exec())[0][1];
    return content ? JSON.parse(content) : null;
  }
  async invalidate(key) {
    await this.connector.del(key);
  }
  async unlinkKeys(...key) {
    await this.connector.unlink(...key);
  }
  async expire(key, ttl) {
    return await this.connector.expire(key, ttl);
  }
  async quit() {
    await this.connector.quit();
  }
}
const use_redis = process.env.REDIS_HOST && process.env.REDIS_PASS;
module.exports = use_redis ? new RedisStore() : {};
module.exports.type = RedisStore;
