const express = require("express");
const application = express();
const cookie_parser = require("cookie-parser");
const AccessTokenMiddleware = require("./middlewares/access_token");
const sessionIdMiddleware = require("./middlewares/session_id");
const { asyncExpressHandler } = require("./endpoints/common_utils");
const DATABASE = require("./database/DBConfig");

application.use(express.json());
application.use(
  cookie_parser(
    process.env.COOKIE_SECRET ??
      "s4df4s4fd4fw1g8weg1weg4e0ge84fw838238f2w5f4te0fe51wf8w2fw8g2g5vuusfmwisdkfei"
  )
);
application.use(asyncExpressHandler(sessionIdMiddleware));
application.use(asyncExpressHandler(AccessTokenMiddleware));
application.use("/api/v1", require("./endpoints/_defs"));
application.get("/", function (req, res) {
  res.write("Hurray");
  res.end();
});

if (process.env.JEST_WORKER_ID) {
  //export the application as a module when it is being tested
  module.exports = application;
} else {
  //otherwise run it as nodejs application
  const PORT = process.env.PORT || 8080;
  let server;
  (async function () {
    await DATABASE.init();
    server = application.listen(PORT);
    console.log(`Listening on port ${PORT}`);
  })(); //init it
  //attach signal handler to shutdown
  process.on("SIGTERM", function () {
    server?.close(DATABASE.shutdown());
  });
}
