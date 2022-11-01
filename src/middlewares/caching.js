/**
 * Caching related middlewares
 */
// eslint-disable-next-line no-unused-vars
const express = require("express");
/**
 * Everyone MUST never cache it
 * @param {express.Request} _req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function NonCachable(_req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}
/**
 * CDN MUST never cache it
 * @param {number} age maximum age
 * @param {express.Request} _req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function ClientOnlyCacheable(age, _req, res, next) {
  res.set("Cache-Control", `private, max-age=${age}, must-revalidate`);
  next();
}
/**
 * Everyone can cache it
 * @param {number} age maximum age
 * @param {express.Request} _req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function PubliclyCacheable(age, _req, res, next) {
  res.set("Cache-Control", `public, max-age=${age}, must-revalidate`);
  next();
}
module.exports = {
  NonCachable,
  ClientOnlyCacheable,
  PubliclyCacheable,
};
