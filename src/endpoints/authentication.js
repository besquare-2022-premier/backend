/**
 * Authentication endpoints which are mounted under `/api/v1/auth`
 */
const { isString } = require("@junchan/type-check");
const express = require("express");
const { randomID } = require("../authentication/utils");
const DATABASE = require("../database/DBConfig");
const { INVALID_EMAIL, NO_ERROR } = require("../types/error_codes");
const {
  asyncExpressHandler,
  assertJsonRequest,
  validEmail,
} = require("./common_utils");
const app = express.Router();
//TODO implement CRSF middleware and install it here
app.post(
  "/register",
  asyncExpressHandler(async function (req, res, next) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { email } = req.body ?? {};
    if (!isString(email) || !validEmail(email)) {
      res
        .status(400)
        .json(
          new ResponseBase(INVALID_EMAIL, "Missing or invalid email address")
        )
        .end();
      return;
    }
    //query the backend to see is the email is already used
    const user_info = await DATABASE.obtainUserPasswordHash(req, body.email);
    if (user_info) {
      res
        .status(400)
        .json(
          new ResponseBase(
            INVALID_EMAIL,
            "The email address is already registered"
          )
        )
        .end();
      return;
    }
    //generate an verification_code
    const verification_code = await randomID();
    if (!(await DATABASE.addVerificationCode(email, verification_code))) {
      throw new Error("Cannot save email verification code");
    }
    //TODO send an email for this
    //we are done, ask users to check their mailbox
    res
      .status(200)
      .json(
        new ResponseBase(
          NO_ERROR,
          "Please check your email for sign up instructions"
        )
      );
  })
);
