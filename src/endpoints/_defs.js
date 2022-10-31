/**
 * Definitions for the endpoints
 */
const express = require("express");

const app = express.Router();
app.use("/auth", require("./authentication"));
app.use("/csrf", require("./csrf"));
