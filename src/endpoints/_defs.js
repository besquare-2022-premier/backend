/**
 * Definitions for the endpoints
 */
const express = require("express");

const app = express.Router();
app.use("/auth", require("./authentication"));
app.use("/csrf", require("./csrf"));
app.use("/product", require("./product"));
app.use("/whoami", require("./profile"));
app.use("/orders", require("./order"));
app.use("/__callback", require("./callback"));

module.exports = app;
