const _ready = process.env.REDIS_HOST && process.env.REDIS_PASS;
const REDIS = require("../src/redis/RedisStore");
/**
 * Redefinition to disable it in non ready environment
 */
const _it = _ready ? it : xit;
const _itif = (status, desc, func) =>
  status ? _it(desc, func) : xit(desc, func);
describe("Test on redis", () => {
  beforeAll(async () => {
    await REDIS.connector.flushall();
  });
  afterAll(async () => {
    await REDIS.quit();
  });
  _it("Basic functionality shall works", async () => {
    await REDIS.set("test", "chicken", null);
    expect(await REDIS.getOrSet("test")).toBe("chicken");
  });
  _it("Basic ttl shall works", async () => {
    await REDIS.set("test", "chicken", 2);
    expect(await REDIS.ttl("test")).toBe(2);
  });
  _it("Basic regenerator shall works", async () => {
    expect(await REDIS.getOrSet("chicken", () => "test", 1, 2)).toBe("test");
  });
  _it("Basic regenerator shall update the value for the stuffs", async () => {
    await REDIS.set("chicken", "test", 2);
    await new Promise((z) => setTimeout(z, 1000));
    let update = REDIS.getOrSet(
      "chicken",
      () => new Promise((z) => setTimeout(z.bind(null, "test2"), 800)),
      1,
      2
    );
    let race = REDIS.getOrSet("chicken", () => "test2", 1, 2);
    expect(await race).toBe("test");
    expect(await update).toBe("test2");
    expect(await REDIS.getOrSet("chicken")).toBe("test2");
  });
  _it("Invalidation shall works", async () => {
    await REDIS.set("test", "chicken", null);
    await REDIS.invalidate("test");
    expect(await REDIS.getOrSet("test")).toBe(null);
  });
});
