/**
 * Profile endpoints which are mounted under `/api/v1/whoami`
 */
const { isString, isValidDate } = require("@junchan/type-check");
const { hash, compare } = require("bcrypt");
const express = require("express");
const { BCRYPT_ROUNDS } = require("../authentication/utils");
const DATABASE = require("../database/DBConfig");
const AuthenticatedEndpointMiddleware = require("../middlewares/authenticated");
const { ClientOnlyCacheable } = require("../middlewares/caching");
const CSRFProtectedMiddleware = require("../middlewares/csrf_protected");
const {
  UNPROCESSABLE_ENTITY,
  REQUIRED_FIELD_MISSING,
  IMMUTABLE_FIELD_MODIFICATION,
  AUTH_FAILED,
  UNMATCHED_PASSWORD,
  ALREADY_REGISTERED,
  NO_ERROR,
  PASSWORD_TOO_WEAK,
} = require("../types/error_codes");
const ResponseBase = require("../types/response_base");
const {
  asyncExpressHandler,
  sendJsonResponse,
  assertJsonRequest,
  validPassword,
} = require("./common_utils");

const schema_model_map = {
  email: "email",
  first_name: "firstname",
  last_name: "lastname",
  username: "username",
  address: "address",
  residence: "residence",
  first_join: "first_join",
  gender: "gender",
  birthday: "birthday",
  telephone_number: "tel_no",
};
const schema_keys = Object.keys(schema_model_map);

const app = express.Router();
app.use(ClientOnlyCacheable.bind(null, 60));
app.use(AuthenticatedEndpointMiddleware);
app.get(
  "/",
  asyncExpressHandler(async function (req, res) {
    const user = await DATABASE.getUser(req.user);
    if (!user) {
      throw new Error("Cannot get the user");
    }
    let response = {};
    for (const key of schema_keys) {
      response[key] = user[schema_model_map[key]];
    }
    sendJsonResponse(res, 200, response);
  })
);
app.use(CSRFProtectedMiddleware);
app.patch(
  "/",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    //get the current state of the user
    let user = await DATABASE.getUser(req.user);
    if (!user) {
      throw new Error("Cannot get the user");
    }
    const { body } = req;
    const mandatory = ["first_name", "last_name", "username"];
    const patch_list = {};
    for (const key of mandatory) {
      if (key in body) {
        const value = body[key];
        if (!value) {
          sendJsonResponse(
            res,
            400,
            new ResponseBase(
              REQUIRED_FIELD_MISSING,
              "Cannot clear off the mandatory fields"
            )
          );
          return;
        } else if (!isString(value)) {
          sendJsonResponse(
            res,
            400,
            new ResponseBase(
              UNPROCESSABLE_ENTITY,
              `Invalid value for the field ${key}`
            )
          );
          return;
        } else {
          if (key === "username" && user.username != value) {
            const user_info = await DATABASE.obtainUserPasswordHash(value);
            if (user_info) {
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
          } else if (key === "telephone_number" && user.tel_no != value) {
            if (await DATABASE.isPhoneNumberUsed(value)) {
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
          }
          patch_list[schema_model_map[key]] = value;
        }
      }
    }
    const immutables = ["email", "first_join", "gender"];
    for (const key of immutables) {
      if (key in body) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(
            IMMUTABLE_FIELD_MODIFICATION,
            `Cannot modify immutable field ${key}`
          )
        );
        return;
      }
    }
    const optionals = ["address", "residence"];
    for (const key of optionals) {
      if (key in body) {
        const value = body[key];
        if (!value) {
          patch_list[schema_model_map[key]] = null;
        } else if (!isString(value)) {
          sendJsonResponse(
            res,
            400,
            new ResponseBase(
              UNPROCESSABLE_ENTITY,
              `Invalid value for the field ${key}`
            )
          );
          return;
        } else {
          patch_list[schema_model_map[key]] = value;
        }
      }
    }
    if ("birthday" in body) {
      if (user.birthday) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(
            IMMUTABLE_FIELD_MODIFICATION,
            `Cannot modify immutable field birthday`
          )
        );
        return;
      } else if (!isValidDate(body.birthday)) {
        sendJsonResponse(
          res,
          400,
          new ResponseBase(
            UNPROCESSABLE_ENTITY,
            `Invalid value for the field birthday`
          )
        );
        return;
      } else {
        patch_list.birthday = new Date(body.birthday);
      }
    }
    //the patch list is generated, lets update the product
    await DATABASE.updateUserSubtle(req.user, patch_list);
    //reload the users and return to the caller
    user = await DATABASE.getUser(req.user);
    if (!user) {
      throw new Error("Cannot get the user");
    }
    let response = {};
    for (const key of schema_keys) {
      response[key] = user[schema_model_map[key]];
    }
    sendJsonResponse(res, 200, response);
  })
);
app.post(
  "/change-password",
  asyncExpressHandler(async function (req, res) {
    if (!assertJsonRequest(req, res)) {
      return;
    }
    const { password, new_password, new_password_again } = req.body;
    if (!isString(password)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(REQUIRED_FIELD_MISSING, "password field is empty")
      );
      return;
    }
    if (!isString(new_password)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(REQUIRED_FIELD_MISSING, "new_password field is empty")
      );
      return;
    }
    if (!isString(new_password_again)) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(
          REQUIRED_FIELD_MISSING,
          "new_password_again field is empty"
        )
      );
      return;
    }
    if (!validPassword(new_password)) {
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
    if (new_password !== new_password_again) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNMATCHED_PASSWORD, "Passwords provided are not match")
      );
      return;
    }
    //authenticate with the engine
    const user_data = await DATABASE.obtainUserPasswordHash(req.user);
    /**
     * It is very important for us to provide the same reaction not matter the input to
     * prevent timing attack
     */
    let password_hash = user_data.hash;
    /**
     * NOTE: the comparator code inside the bcrypt are not time safe but it should not matter
     * as the noise in the nodejs environment will make it difficult
     */
    const result = await compare(password, password_hash);
    if (!result) {
      sendJsonResponse(
        res,
        401,
        new ResponseBase(AUTH_FAILED, "Authentication Failed")
      );
      return;
    }
    //hash the password
    password_hash = await hash(new_password, BCRYPT_ROUNDS);
    //push to db
    await DATABASE.updateUserSubtle(req.user, {
      password: password_hash,
    });
    sendJsonResponse(res, 200, new ResponseBase(NO_ERROR, "OK"));
  })
);
module.exports = app;
