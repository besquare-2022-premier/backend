/**
 * Community endpoints which are mounted under `/api/v1/community`
 */
const { isString } = require("@junchan/type-check");
const express = require("express");
const DATABASE = require("../database/DBConfig");
const AuthenticatedEndpointMiddleware = require("../middlewares/authenticated");
const { NonCachable, PubliclyCacheable } = require("../middlewares/caching");
const CSRFProtectedMiddleware = require("../middlewares/csrf_protected");
const CommunityMessage = require("../models/community_message");
const {
  UNPROCESSABLE_ENTITY,
  REQUIRED_FIELD_MISSING,
  INEXISTANT_TOPIC_OR_MESSAGE,
  NO_ERROR,
} = require("../types/error_codes");
const PagedResponseBase = require("../types/paged_response_base");
const ResponseBase = require("../types/response_base");
const {
  asyncExpressHandler,
  sendJsonResponse,
  assertJsonRequest,
} = require("./common_utils");
const app = express.Router();
//almost never changed
app.use(PubliclyCacheable.bind(null, 6000));
app.get(
  "/topics",
  asyncExpressHandler(async function (req, res) {
    let topics = await DATABASE.getCommunityTopics();
    sendJsonResponse(res, 200, topics);
  })
);
//actively changed
app.use(PubliclyCacheable.bind(null, 600));
app.get(
  "/:topic",
  asyncExpressHandler(async function (req, res) {
    const { topic } = req.params;
    if (!topic) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNPROCESSABLE_ENTITY, "No topic for the endpoint")
      );
      return;
    }
    //get the pagination params
    let { page, limit } = req.query;
    page = page | 0 || 1;
    limit = limit | 0 || 50;
    let offset = limit * (page - 1);
    //send the request to the database
    let messages = await DATABASE.getCommunityMessageForTopic(
      topic,
      offset,
      limit
    );
    //dont leak the internal id, nuke off all the ids from the message
    for (const message of messages) {
      delete message.loginid;
    }
    //send the response to the caller
    sendJsonResponse(
      res,
      200,
      new PagedResponseBase(offset, page, messages.length, messages)
    );
  })
);
app.get(
  "/:topic/:message",
  asyncExpressHandler(async function (req, res) {
    const { topic } = req.params;
    let { message } = req.params;
    if (!topic) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNPROCESSABLE_ENTITY, "No topic for the endpoint")
      );
      return;
    }
    if (((message |= 0), message <= 0)) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Message not found")
      );
      return;
    }
    if (!(await DATABASE.isCommunityTopicExists(topic))) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Topic not found")
      );
      return;
    }
    let message_obj = await DATABASE.getCommunityMessage(message);
    if (!message_obj || message_obj.topic !== topic) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Message not found")
      );
      return;
    }
    delete message_obj.loginid;
    sendJsonResponse(res, 200, message_obj);
  })
);
app.get(
  "/:topic/:message/replies",
  asyncExpressHandler(async function (req, res) {
    const { topic } = req.params;
    let { message } = req.params;
    if (!topic) {
      sendJsonResponse(
        res,
        400,
        new ResponseBase(UNPROCESSABLE_ENTITY, "No topic for the endpoint")
      );
      return;
    }
    if (((message |= 0), message <= 0)) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Message not found")
      );
      return;
    }
    if (!(await DATABASE.isCommunityTopicExists(topic))) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Topic not found")
      );
      return;
    }
    let message_obj = await DATABASE.getCommunityMessage(message);
    if (!message_obj || message_obj.topic !== topic) {
      sendJsonResponse(
        res,
        404,
        new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Message not found")
      );
      return;
    }
    //get the pagination params
    let { page, limit } = req.query;
    page = page | 0 || 1;
    limit = limit | 0 || 50;
    let offset = limit * (page - 1);
    //send the request to the database
    let replies = await DATABASE.getCommunityRepliesForMessage(
      message,
      offset,
      limit
    );
    for (const reply of replies) {
      delete reply.loginid;
    }
    //send the response to the caller
    sendJsonResponse(
      res,
      200,
      new PagedResponseBase(offset, page, replies.length, replies)
    );
  })
);
//never cachable
app.use(NonCachable);
app.use(AuthenticatedEndpointMiddleware);
app.use(CSRFProtectedMiddleware);
app.post("/:topic", async function (req, res) {
  if (!assertJsonRequest(req, res)) {
    return;
  }
  const { topic } = req.params;
  if (!topic) {
    sendJsonResponse(
      res,
      400,
      new ResponseBase(UNPROCESSABLE_ENTITY, "No topic for the endpoint")
    );
    return;
  }
  let { message } = req.body;
  if (!isString(message)) {
    sendJsonResponse(
      res,
      400,
      new ResponseBase(REQUIRED_FIELD_MISSING, "Field message required")
    );
    return;
  }
  if (!(await DATABASE.isCommunityTopicExists(topic))) {
    sendJsonResponse(
      res,
      404,
      new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Topic not found")
    );
    return;
  }
  //construct the object
  const obj = new CommunityMessage(
    -1,
    topic,
    req.user,
    "",
    message,
    new Date(),
    null
  );
  await DATABASE.addCommunityMessage(obj);
  sendJsonResponse(res, 200, new ResponseBase(NO_ERROR, "OK"));
});
app.post("/:topic/:message_id", async function (req, res) {
  if (!assertJsonRequest(req, res)) {
    return;
  }
  const { topic } = req.params;
  let { message_id } = req.params;
  if (!topic) {
    sendJsonResponse(
      res,
      400,
      new ResponseBase(UNPROCESSABLE_ENTITY, "No topic for the endpoint")
    );
    return;
  }
  if (((message_id |= 0), message_id <= 0)) {
    sendJsonResponse(
      res,
      404,
      new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Message not found")
    );
    return;
  }
  let { message } = req.body;
  if (!isString(message)) {
    sendJsonResponse(
      res,
      400,
      new ResponseBase(REQUIRED_FIELD_MISSING, "Field message required")
    );
    return;
  }
  if (!(await DATABASE.isCommunityTopicExists(topic))) {
    sendJsonResponse(
      res,
      404,
      new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Topic not found")
    );
    return;
  }
  //check for the message also
  let message_obj = await DATABASE.getCommunityMessage(message_id);
  if (!message_obj || message_obj.topic !== topic) {
    sendJsonResponse(
      res,
      404,
      new ResponseBase(INEXISTANT_TOPIC_OR_MESSAGE, "Message not found")
    );
    return;
  }
  //construct the object
  const obj = new CommunityMessage(
    -1,
    topic,
    req.user,
    "",
    message,
    new Date(),
    message_id
  );
  await DATABASE.addCommunityMessage(obj);
  sendJsonResponse(res, 200, new ResponseBase(NO_ERROR, "OK"));
});
module.exports = app;
