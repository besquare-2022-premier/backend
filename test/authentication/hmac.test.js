const {
  computeHmacForUrl,
  verifyHmacForUrl,
} = require("../../src/authentication/hmac");
const SECRET = "123";

describe("Hmac tests", () => {
  let hash;
  it("Normal Hmac generation should be success", function () {
    hash = computeHmacForUrl("/callback", { txid: 2 }, SECRET);
  });
  it("Normal Hmac verification should be success", function () {
    expect(verifyHmacForUrl(hash, "/callback", { txid: 2 }, SECRET)).toBe(true);
  });
  it("Hmac should vary by secret", function () {
    expect(verifyHmacForUrl(hash, "/callback", { txid: 2 }, "124")).toBe(false);
  });
  it("Hmac should vary by url", function () {
    expect(verifyHmacForUrl(hash, "/callback2", { txid: 2 }, SECRET)).toBe(
      false
    );
  });
  it("Hmac should vary by payload", function () {
    expect(verifyHmacForUrl(hash, "/callback", { txid: 3 }, SECRET)).toBe(
      false
    );
  });
  it("Hmac should vary by payload even by type", function () {
    expect(verifyHmacForUrl(hash, "/callback", { txid: "2" }, SECRET)).toBe(
      false
    );
  });
});
