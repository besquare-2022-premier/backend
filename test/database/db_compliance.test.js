const { hash } = require("bcrypt");
const { randomID, BCRYPT_ROUNDS } = require("../../src/authentication/utils");
const DATABASE = require("../../src/database/DBConfig");
const IDatabase = require("../../src/database/IDatabase");
const User = require("../../src/models/user");
const _ready = process.env.HAVE_DB && DATABASE.constructor != IDatabase;
/**
 * Redefinition to disable it in non ready environment
 */
const _it = _ready ? it : xit;
const _itif = (status, desc, func) =>
  status ? _it(desc, func) : xit(desc, func);
describe("Compliance test on current implementation", () => {
  beforeAll(() => _ready && DATABASE.init());
  afterAll(() => _ready && DATABASE.shutdown());
  _it(
    "The list of product ids returned by getProducts should be in stock",
    async () => {
      let products = await DATABASE.getProducts();
      expect(Array.isArray(products)).toBe(true);
      for (const id of products) {
        const product = await DATABASE.getProduct(id);
        expect(product).toBeTruthy();
        expect(product).not.toBe(0);
      }
    }
  );
  let verification_code, random_email;
  _it("addVerificationCode should have effect", async () => {
    //generate the thing
    verification_code = await randomID();
    random_email = (await randomID()) + "@merch-paradise.ci";
    expect(
      await DATABASE.addVerificationCode(random_email, verification_code)
    ).toBe(true);
    expect(await DATABASE.verifyVerificationCode(verification_code)).toBe(
      random_email
    );
  });
  _it("voidVerificationCode should have effect", async () => {
    await DATABASE.voidVerificationCode(verification_code);
    expect(await DATABASE.verifyVerificationCode(verification_code)).toBe(null);
  });
  let user = {},
    random_hash,
    password;
  _it("addUser should works", async () => {
    user = new User(
      -1,
      "Kazuha",
      "Minamoto",
      await randomID(),
      random_email,
      null,
      null,
      "normal",
      "JP",
      "Oosaka",
      new Date("9/9/2000"),
      "secret",
      "hanayamata"
    );
    random_hash = await hash((password = await randomID()), BCRYPT_ROUNDS);
    expect(await DATABASE.addUser(user, random_hash)).toBe(true);
    expect(user.loginid).not.toBe(-1);
  });
  _itif(
    user.loginid != -1,
    "obtainUserPasswordHash should return the correct hash not matter what is passed in",
    async function () {
      for (const input of [random_email, user.loginid, user.username]) {
        const obj = await DATABASE.obtainUserPasswordHash(input);
        expect(obj).toBeTruthy();
        expect(obj.hash).toBe(random_hash);
        expect(obj.loginid).toBe(user.loginid);
      }
    }
  );
  _it(
    "obtainUserPasswordHash should return the null for the wrong input",
    async function () {
      const obj = await DATABASE.obtainUserPasswordHash(await randomID());
      expect(obj).toBe(null);
    }
  );
  _itif(
    user.loginid != -1,
    "getUser should return the similar object EXCEPT secure word and first join",
    async function () {
      const u = await DATABASE.getUser(user.loginid);
      expect(u).toBeTruthy();
      for (const key of Object.keys(u)) {
        if (["secure_word", "first_join"].includes(key)) {
          continue;
        }
        expect(u[key]).toStrictEqual(user[key]);
      }
    }
  );
  _itif(
    user.loginid != 1,
    "updateUserSubtle shall update only the field specified",
    async function () {
      const patch = {
        firstname: "Hanabi",
      };
      await DATABASE.updateUserSubtle(user.loginid, patch);
      //update the local reference copy
      user.firstname = patch.firstname;
      const u = await DATABASE.getUser(user.loginid);
      expect(u).toBeTruthy();
      for (const key of Object.keys(u)) {
        if (["secure_word", "first_join"].includes(key)) {
          continue;
        }
        expect(u[key]).toStrictEqual(user[key]);
      }
    }
  );
  let token;
  _itif(
    user.loginid != -1,
    "recordAccessToken should have effects",
    async function () {
      token = await randomID();
      await DATABASE.recordAccessToken(token, user.loginid);
      expect(await DATABASE.touchAccessToken(token)).toBe(user.loginid);
    }
  );
  _itif(
    user.loginid != -1,
    "removeAccessToken should have effects",
    async function () {
      expect(await DATABASE.revokeAccessToken(token)).toBe(true);
      expect(await DATABASE.touchAccessToken(token)).toBe(null);
    }
  );
  let categories = {};
  _it("getCategories should always succeeded", async function () {
    categories = await DATABASE.getCategories();
    console.log(categories);
  });
  _itif(
    true,
    "getProductsByCategory should always succeeded",
    async function () {
      await DATABASE.getProductsByCategory(
        categories[Object.keys(categories)[0]] //first category
      );
    }
  );
  _it("Randomization inside the getProducts should work", async function () {
    const r1 = await DATABASE.getProducts(null, 0, 5, true),
      r2 = await DATABASE.getProducts(null, 0, 5, true);
    expect(r1).not.toBe(r2);
  });
  _itif(
    true,
    "Randomization inside the getProductsByCategory should work",
    async function () {
      const cat = categories[Object.keys(categories)[0]]; //first category
      const r1 = await DATABASE.getProductsByCategory(cat, null, 0, 5, true),
        r2 = await DATABASE.getProductsByCategory(cat, null, 0, 5, true);
      expect(r1).not.toBe(r2);
    }
  );
  _itif(
    user.loginid != -1,
    "getUserCart should always succeeded",
    async function () {
      await DATABASE.getUserCart(user.loginid);
    }
  );
});
