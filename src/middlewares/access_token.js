// eslint-disable-next-line no-unused-vars
const express = require("express");
const DATABASE = require("../database/DBConfig");
/**
 * Middleware to deal with the access_token
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
async function AccessTokenMiddleware(req, _res, next) {
  let access_token;
  if ((access_token = req.get("X-Access-Token"))) {
    let loginid = await DATABASE.touchAccessToken(access_token);
    if (loginid) {
      //the token is valid so lets get the user data
      req.user = await DATABASE.getUser(loginid);
      if (req.user) {
        //expose the access token
        req.access_token = access_token;
      }
    }
  }
  next();
}
module.exports = AccessTokenMiddleware;
