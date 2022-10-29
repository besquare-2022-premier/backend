const { createToken, verifyToken } = require("../../src/authentication/csrf");

describe("CSRF Token routines", () => {
  let token;
  it("The token shall generate", async function () {
    token = await createToken("test", "access");
  });
  it("The token shall verifies", function () {
    expect(verifyToken(token, "test", "access")).toBe(true);
  });
  it("The token NOT able to be reused", function () {
    expect(verifyToken(token, "test", "access")).toBe(false);
  });
  it("The token shall bound to owner", async function () {
    token = await createToken("test", "access");
    expect(verifyToken(token, "test2", "access")).toBe(false);
    expect(verifyToken(token, "test", "session")).toBe(false);
  });
  it("The expired token shall NOT able to be reused", async function () {
    token = await createToken("test", "access");
    await new Promise((r) => setTimeout(r, 1000));
    expect(verifyToken(token, "test", "access")).toBe(false);
  });
});
