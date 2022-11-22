const { hash } = require("bcrypt");
const { randomID, BCRYPT_ROUNDS } = require("../../src/authentication/utils");
const DATABASE = require("../../src/database/DBConfig");
const IDatabase = require("../../src/database/IDatabase");
const CommunityMessage = require("../../src/models/community_message");
const Review = require("../../src/models/review");
const Transaction = require("../../src/models/transaction");
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
  let products = [];
  _it(
    "The list of product ids returned by getProducts should be in stock",
    async () => {
      products = await DATABASE.getProducts();
      expect(Array.isArray(products)).toBe(true);
      for (const id of products) {
        const product = await DATABASE.getProduct(id);
        expect(product).toBeTruthy();
        expect(product).not.toBe(0);
      }
    }
  );
  _it(
    "Provided the same list the getProductsMulti shall yield the same result",
    async () => {
      let products = await DATABASE.getProducts();
      let products_data = await DATABASE.getProductMulti(products);
      expect(
        products_data.reduce((prev, cur) => prev && cur.stock !== 0, true)
      ).toBe(true);
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
      "+601234" + ((Math.random() * 1000000) | 0),
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
    "isPhoneNumberUsed should return the correct value",
    async function () {
      expect(await DATABASE.isPhoneNumberUsed(user.tel_no)).toBe(true);
      expect(await DATABASE.isPhoneNumberUsed("+60123456889")).toBe(false);
    }
  );
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
      expect(await DATABASE.getUserCart(user.loginid)).toBeTruthy();
    }
  );
  let id = 0;
  _itif(
    user.loginid != -1,
    "updateOrderSubtle shall have effect on the cart",
    async function () {
      let cart = await DATABASE.getUserCart(user.loginid);
      //get a random product
      id = products.sort(() => Math.random() - 0.5)[0];
      //issue the change
      let change = {};
      change[id] = 10;
      await DATABASE.updateOrderSubtle(user.loginid, cart.orderid, change);
      //perform the check
      cart = await DATABASE.getUserOrder(user.loginid, cart.orderid);
      expect(cart.items.find((z) => z.product_id === id)?.quantity).toBe(10);
    }
  );
  _itif(
    user.loginid != -1,
    "updateOrderSubtle shall react to DELETED by removing the product from the order",
    async function () {
      let cart = await DATABASE.getUserCart(user.loginid);
      let change = {};
      change[id] = IDatabase.DELETED;
      //issue the change
      await DATABASE.updateOrderSubtle(user.loginid, cart.orderid, change);
      //perform the check
      cart = await DATABASE.getUserOrder(user.loginid, cart.orderid);
      expect(cart.items.findIndex((z) => z.product_id === id)).toBe(-1);
    }
  );
  let tx = {};
  _itif(user.loginid != -1, "commitUserCart should success", async function () {
    let cart = await DATABASE.getUserCart(user.loginid);
    //get a random product
    id = products.sort(() => Math.random() - 0.5)[0];
    //issue the change
    let change = {};
    change[id] = 10;
    await DATABASE.updateOrderSubtle(user.loginid, cart.orderid, change);
    tx = await DATABASE.commitUserCart(user.loginid);
    //we need it for reference
    cart = await DATABASE.getUserOrder(user.loginid, cart.orderid);
    expect(tx.loginid).toBe(user.loginid);
    expect(tx.orderid).toBe(cart.orderid);
    expect(tx.tx_status).toBe(Transaction.Status.CREATED);
    expect(tx.amount).toBe(
      cart.items.reduce((prev, now) => prev + now.price * now.quantity, 0)
    );
  });
  _itif(
    user.loginid != -1 && tx.tx_id != -1,
    "getTransaction get return a similar transaction to commit",
    async function () {
      expect(tx).toStrictEqual(
        await DATABASE.getTransaction(user.loginid, tx.tx_id)
      );
    }
  );
  _itif(
    user.loginid != -1 && tx.tx_id != -1,
    "searchTransactionForOrder should return the correct transaction",
    async function () {
      expect(
        (await DATABASE.searchTransactionForOrder(user.loginid, tx.orderid))
          ?.tx_id
      ).toBe(tx.tx_id);
    }
  );
  _itif(
    user.loginid != -1 && tx.tx_id != -1,
    "revertTransaction should always succeeded",
    async function () {
      expect(await DATABASE.revertTransaction(user.loginid, tx.orderid)).toBe(
        true
      );
    }
  );
  _itif(
    user.loginid != -1 && tx.tx_id != -1,
    "updateTransactionSubtle should have effect",
    async function () {
      let changes = {
        tx_status: Transaction.Status.CANCELLED,
      };
      await DATABASE.updateTransactionSubtle(tx.tx_id, changes);
      expect(
        (await DATABASE.getTransaction(user.loginid, tx.tx_id))?.tx_status
      ).toBe(Transaction.Status.CANCELLED);
    }
  );
  _itif(user.loginid != -1, "Product review should works", async function () {
    let review = new Review(
      products[0],
      user.loginid,
      user.username,
      "5",
      "Nice",
      new Date()
    );
    await DATABASE.addReview(review);
  });
  _itif(
    user.loginid != -1,
    "addReview should brings effect",
    async function () {
      let reviews = await DATABASE.getProductReviews(products[0]);
      expect(reviews.findIndex((z) => z.loginid === user.loginid)).not.toBe(-1);
    }
  );
  let community_topics;
  _it("Community topics should be always enumerable", async function () {
    community_topics = await DATABASE.getCommunityTopics();
    expect(Array.isArray(community_topics)).toBe(true);
  });
  _it(
    "The existance query for the community topic shall works for the valids",
    async function () {
      for (const topic of community_topics) {
        expect(await DATABASE.isCommunityTopicExists(topic)).toBe(true);
      }
      expect(await DATABASE.isCommunityTopicExists("Never")).toBe(false);
    }
  );
  let community_message;
  _itif(
    user.loginid != -1,
    "The message should always be addable",
    async function () {
      community_message = new CommunityMessage(
        -1,
        community_topics[0],
        user.loginid,
        user.username,
        "Hello",
        new Date(),
        null
      );
      await DATABASE.addCommunityMessage(community_message);
      expect(community_message.message_id).not.toBe(-1);
    }
  );
  _itif(
    user.loginid != -1,
    "The addCommunityMessage should have effect toward the database",
    async function () {
      let ret = await DATABASE.getCommunityMessageForTopic(
        community_topics[0],
        0,
        100
      );
      expect(ret.findIndex((z) => z.loginid === user.loginid)).not.toBe(-1);
    }
  );
  _itif(
    user.loginid != -1,
    "The getCommunityMessageForTopic and getMessage should returns te similar object",
    async function () {
      let ret = await DATABASE.getCommunityMessageForTopic(
        community_topics[0],
        0,
        100
      );
      let obj = ret.find((z) => z.message_id === community_message.message_id);
      expect(obj).toBeTruthy();
      const message = await DATABASE.getCommunityMessage(
        community_message.message_id
      );
      expect(message).toBeTruthy();
      for (const key of Object.keys(message)) {
        if (["secure_word", "first_join"].includes(key)) {
          continue;
        }
        expect(obj[key]).toStrictEqual(message[key]);
      }
    }
  );
  _itif(
    user.loginid != -1,
    "The addCommunityMessage (reply) shall works",
    async function () {
      let message = new CommunityMessage(
        -1,
        community_topics[0],
        user.loginid,
        user.username,
        "Hello",
        new Date(),
        community_message.message_id
      );
      await DATABASE.addCommunityMessage(message);
      expect(message.message_id).not.toBe(-1);
      let replies = await DATABASE.getCommunityRepliesForMessage(
        message.message_id
      );
      expect(replies.findIndex((z) => z.message_id === message.message_id));
    }
  );
});
