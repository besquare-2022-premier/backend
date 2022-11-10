// eslint-disable-next-line no-unused-vars
const express = require("express");
const { randomID } = require("../authentication/utils");
/**
 * Middleware to deal with the sessionid
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
async function sessionIdMiddleware(req, res, next) {
  if (req.signedCookies.session_id) {
    req.session_id = req.signedCookies.session_id;
  } else {
    const session_id = await randomID();
    res.cookie("session_id", session_id, {
      expires: 0,
      httpOnly: true,
      signed: true,
      secure: req.secure,
      sameSite: "none",
    });
    req.session_id = session_id;
  }
  next();
}
module.exports = sessionIdMiddleware;
