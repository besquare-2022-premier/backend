/**
 * Authentication endpoints which are mounted under `/api/v1/auth`
 */
const { isString, inEnumeration, isValidDate } = require("@junchan/type-check");
const { hash, compare } = require("bcrypt");
const express = require("express");
const { randomSecureWord } = require("../authentication/random_secure_word");
const { randomID, BCRYPT_ROUNDS } = require("../authentication/utils");
const DATABASE = require("../database/DBConfig");
const { NonCachable } = require("../middlewares/caching");
const CSRFProtectedMiddleware = require("../middlewares/csrf_protected");
const User = require("../models/user");
const { SMTPProvider } = require("../smtp/SMTPConfig");
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
  AUTH_FAILED,
  NO_REAUTH,
  PASSWORD_TOO_WEAK,
} = require("../types/error_codes");
const ResponseBase = require("../types/response_base");
const SecureWordResponse = require("../types/secure_word_response");
const {
  asyncExpressHandler,
  assertJsonRequest,
  validEmail,
  sendJsonResponse,
  validPassword,
} = require("./common_utils");
const app = express.Router();
app.use(NonCachable);
app.get(
  "/revoke",
  asyncExpressHandler(async function (req, res) {
    if (req.user) {
      //just revoke the current token
      await DATABASE.revokeAccessToken(req.access_token);
    }
    res.status(204).end();
  })
);
//middleware to prevent the routes to be called on authenticated session
app.use(function (req, res, next) {
  if (req.user) {
    sendJsonResponse(
      res,
      403,
      new ResponseBase(
        NO_REAUTH,
        "Cannot perform the operation on authenticated session"
      )
    );
  } else {
    next();
  }
});
app.use(CSRFProtectedMiddleware);
app.post(
  "/register",
  asyncExpressHandler(async function (req, res) {
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
    const user_info = await DATABASE.obtainUserPasswordHash(email);
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
    await SMTPProvider.sendEmail(
      email,
      "Welcome to merch paradise",
      `Click <a href="http://localhost:3000/finalize-sign-up?code=${verification_code}">here</a> to complete the sign up`
    );
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
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { verification_code, gender, birthday } = req.body;
    let email;
    //check the verification code first
    if (
      !isString(verification_code) ||
      !(email = await DATABASE.verifyVerificationCode(verification_code))
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
    if (!/^[+]?[0-9]{10,15}$/.test(req.body.telephone_number)) {
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
          "The username is already registered"
        )
      );
      return;
    }
    //check the phone number too
    if (await DATABASE.isPhoneNumberUsed(req.body.telephone_number)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          ALREADY_REGISTERED,
          "The phone number is already registered"
        )
      );
      return;
    }
    //check password strength
    if (!validPassword(req.body.password)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          PASSWORD_TOO_WEAK,
          "Password given too weak. It should consists of mixed case of letters, digits and a special character"
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
      req.body.telephone_number,
      new Date(),
      "normal",
      req.body.residence ?? null,
      req.body.address ?? null,
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

app.post(
  "/login",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { username, password } = req.body;
    if (!isString(username) || !isString(password)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          REQUIRED_FIELD_MISSING,
          "Both email and password are required"
        )
      );
      return;
    }
    const user_data = await DATABASE.obtainUserPasswordHash(username);
    /**
     * It is very important for us to provide the same reaction not matter the input to
     * prevent timing attack
     */
    const hash =
      user_data?.hash ??
      "$2a$15$u.yOYKgQZSwfav5pkmc01eSzMJ6lo/yhdEwC7.b.E.MrfrFZYOoR.";
    /**
     * NOTE: the comparator code inside the bcrypt are not time safe but it should not matter
     * as the noise in the nodejs environment will make it difficult
     */
    const result = await compare(password, hash);
    if (!result || !user_data) {
      sendJsonResponse(
        res,
        401,
        new ResponseBase(AUTH_FAILED, "Authentication Failed")
      );
      return;
    }
    //auth success
    const token = await randomID();
    await DATABASE.recordAccessToken(token, user_data.loginid);
    //yey
    sendJsonResponse(res, 200, new AuthenticationResponse(token));
  })
);
app.post(
  "/secure-word",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { username } = req.body;
    if (!isString(username)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(REQUIRED_FIELD_MISSING, "The email are required")
      );
      return;
    }
    let secure_word =
      (await DATABASE.getUserSecureWord(username)) ||
      (await randomSecureWord());
    sendJsonResponse(res, 200, new SecureWordResponse(secure_word));
  })
);

module.exports = app;
