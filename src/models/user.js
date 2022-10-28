/**
 * Represents a user
 */
class User {
  /**
   *
   * @param {number} loginid
   * @param {string?} firstname
   * @param {string?} lastname
   * @param {string} username
   * @param {string} email
   * @param {string?} tel_no
   * @param {Date} first_join
   * @param {"normal"|"admin"} access_level
   * @param {string?} residence
   */
  constructor(
    loginid,
    firstname,
    lastname,
    username,
    email,
    tel_no,
    first_join,
    access_level,
    residence
  ) {
    this.loginid = loginid;
    this.firstname = firstname;
    this.lastname = lastname;
    this.username = username;
    this.email = email;
    this.tel_no = tel_no;
    this.first_join = first_join;
    this.access_level = access_level;
    this.residence = residence;
  }
}

module.exports = User;
