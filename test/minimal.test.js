const application = require("../src/index.js");
const request = require("supertest");
const { NO_ERROR } = require("../src/types/error_codes.js");
describe("Minimal ExpressJS execution environment is up", () => {
  it("The server shall connect", function (done) {
    request(application).get("/").expect(200).end(done);
  });
  let cookies = [];
  it("All the requests should have assigned an session id", async () => {
    const res = await request(application).get("/");
    expect(res.statusCode).toBe(200);
    cookies = res.headers["set-cookie"];
    expect(cookies.findIndex((z) => z.split("=")[0] == "session_id"));
  });
  it("/api/v1/csrf should succeeded even it is unauthenticated call", async () => {
    const res = await request(application)
      .get("/api/v1/csrf")
      .set("Cookie", cookies);
    expect(res.statusCode).toBe(200);
    const { body } = res;
    expect(body.status).toBe(NO_ERROR);
    expect(body.token).toBeTruthy();
  });
});
