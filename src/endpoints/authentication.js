/**
 * Authentication endpoints which are mounted under `/api/v1/auth`
 */
const { isString, inEnumeration, isValidDate } = require("@junchan/type-check");
const { hash } = require("bcrypt");
const express = require("express");
const { randomID, BCRYPT_ROUNDS } = require("../authentication/utils");
const DATABASE = require("../database/DBConfig");
const User = require("../models/user");
const AuthenticationResponse = require("../types/authentication_response");
const {
  INVALID_EMAIL,
  NO_ERROR,
  INVALID_VERIFICATION_CODE,
  INVALID_GENDER,
  REQUIRED_FIELD_MISSING,
  UNPROCESSABLE_ENTITY,
  UNMATCHED_PASSWORD,
  ALREADY_REGISTERED,
} = require("../types/error_codes");
const {
  asyncExpressHandler,
  assertJsonRequest,
  validEmail,
  sendJsonResponse,
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
      sendJsonResponse(
        res,
        400,
        new ResponseBase(INVALID_EMAIL, "Missing or invalid email address")
      );
      return;
    }
    //query the backend to see is the email is already used
    const user_info = await DATABASE.obtainUserPasswordHash(req, body.email);
    if (user_info) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          ALREADY_REGISTERED,
          "The email address is already registered"
        )
      );
      return;
    }
    //generate an verification_code
    const verification_code = await randomID();
    if (!(await DATABASE.addVerificationCode(email, verification_code))) {
      throw new Error("Cannot save email verification code");
    }
    //TODO send an email for this
    //we are done, ask users to check their mailbox
    sendJsonResponse(
      res,
      200,
      new ResponseBase(
        NO_ERROR,
        "Please check your email for sign up instructions"
      )
    );
  })
);
app.post(
  "/finalize-registration",
  asyncExpressHandler(async function (req, res, next) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { verification_code, gender, birthday } = req.body;
    let email;
    //check the verification code first
    if (
      !isString(verification_code) ||
      !(email = await DATABASE.verifyVerificationCode())
    ) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(INVALID_VERIFICATION_CODE, "Invalid verification code")
      );
      return;
    }
    //check all mandatory fields
    if (!inEnumeration(gender, ["male", "female", "secret"])) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(INVALID_GENDER, "Invalid gender is provided")
      );
      return;
    }
    for (const field of [
      "first_name",
      "last_name",
      "telephone_number",
      "username",
      "password",
      "password_again",
      "secure_word",
    ]) {
      if (!isString(req.body[field])) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(REQUIRED_FIELD_MISSING, `Field ${field} is required`)
        );
        return;
      }
    }
    if (!/^[+]?[0-9]{10,15}$/.test(req.body.telephone_numer)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          UNPROCESSABLE_ENTITY,
          `Field telephone_number does not contain a valid phone number`
        )
      );
      return;
    }
    //check the non-mandatory fields and ensure all are strings
    for (const field of ["residence", "address"]) {
      if (!isString(req.body[field] ?? "", true)) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(
            UNPROCESSABLE_ENTITY,
            `Field ${field} contains the value that the server could not understand`
          )
        );
        return;
      }
    }
    //check the password and ensure it is match
    if (req.body.password !== req.body.password_again) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNMATCHED_PASSWORD, "Passwords provided are not match")
      );
      return;
    }
    //try to parse the data if it is there
    if (!isValidDate(birthday ?? "", true)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNPROCESSABLE_ENTITY, "Invalid birthday")
      );
      return;
    }
    //check the username
    if (await DATABASE.obtainUserPasswordHash(req.body.username)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          ALREADY_REGISTERED,
          "The email address is already registered"
        )
      );
      return;
    }
    //process the registration now!!!
    //hash the password
    const password_hash = await hash(req.body.password, BCRYPT_ROUNDS);
    //push to db
    const user = new User(
      -1,
      req.body.first_name,
      req.body.last_name,
      req.body.username,
      email,
      req.body.telephone_numer,
      new Date(),
      "normal",
      req.body.residence ?? null,
      req.body.address | null,
      birthday ? new Date(birthday) : null,
      gender,
      req.body.secure_word
    );
    if (!(await DATABASE.addUser(user, password_hash))) {
      throw new Error("Cannot add user into database");
    }
    //void the verification first
    await DATABASE.voidVerificationCode(verification_code);
    //yey we get user register
    //create a token now
    const access_token = await randomID();
    //register it
    await DATABASE.recordAccessToken(access_token, user.loginid);
    //yey
    sendJsonResponse(res, 200, new AuthenticationResponse(access_token));
  })
);
