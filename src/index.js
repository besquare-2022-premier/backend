const express = require("express");
const application = express();
const cookie_parser = require("cookie-parser");
const AccessTokenMiddleware = require("./middlewares/access_token");
const sessionIdMiddleware = require("./middlewares/session_id");
const {
  asyncExpressHandler,
  sendJsonResponse,
} = require("./endpoints/common_utils");
const DATABASE = require("./database/DBConfig");
const ResponseBase = require("./types/response_base");
const { INEXISTANT_ENDPOINT, SERVER_FAILURE } = require("./types/error_codes");
application.disable("x-powered-by");
if (process.env.NODE_ENV === "production") {
  application.set("trust proxy", 2);
  application.use((req, res, next) => {
    res.set("Strict-Transport-Security", "max-age=86400");
    const origin = req.get("Origin");
    if (
      ["https://merch-paradise.xyz", "https://www.merch-paradise.xyz"].includes(
        origin
      )
    ) {
      res.set("Acess-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Max-Age", "300");
      res.set(
        "Access-Control-Allow-Headers",
        "X-Access-Token,X-CSRF-Token,Content-Type"
      );
      res.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
    }
    next();
  });
}
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
application.use("/__callback", require("./endpoints/callback"));
application.get("/", function (req, res) {
  res.write("Hurray");
  res.end();
});
application.use(function (req, res) {
  sendJsonResponse(
    res,
    404,
    new ResponseBase(
      INEXISTANT_ENDPOINT,
      "The endpoint you have specified is not exists"
    )
  );
});
application.use(function (err, req, res, next) {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  sendJsonResponse(
    res,
    500,
    new ResponseBase(
      SERVER_FAILURE,
      "Server have encounter an issue while processing the request"
    )
  );
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
