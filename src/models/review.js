/**
 * Represents a review
 */
class Review {
  /**
   *
   * @param {number} productid
   * @param {number} loginid
   * @param {string} username
   * @param {"1"|"2"|"3"|"4"|"5"} rating
   * @param {string?} review
   * @param {Date} time
   */
  constructor(productid, loginid, username, rating, review, time) {
    this.productid = productid;
    this.loginid = loginid;
    this.username = username;
    this.rating = rating;
    this.review = review;
    this.time = time;
  }
}

module.exports = Review;
