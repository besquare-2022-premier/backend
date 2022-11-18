/**
 * Class for every community message
 */
class CommunityMessage {
  /**
   * Construct the object
   * @param {number} message_id The id of the message
   * @param {number} topic_id the topic which the message belonging to
   * @param {number} loginid The loginid of the sender
   * @param {string} username The resolved username for the sender
   * @param {string} message The message body
   * @param {Date} time The time when the message is sent
   * @param {number|null} replying_to If it is a reply then it is the message_id it refers to
   */
  constructor(
    message_id,
    topic_id,
    loginid,
    username,
    message,
    time,
    replying_to
  ) {
    this.message_id = message_id;
    this.topic_id = topic_id;
    this.loginid = loginid;
    this.username = username;
    this.message = message;
    this.time = time;
    this.replying_to = replying_to;
  }
}
