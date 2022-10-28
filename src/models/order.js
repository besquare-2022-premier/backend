/**
 * Represents a flatten order
 */
class Order {
  /**
   *
   * @param {number} orderid
   * @param {number} loginid
   * @param {string} shipping_address
   * @param {string} country
   * @param {{product_id:number,price:number,quantity:number}[]} items
   */
  constructor(orderid, loginid, shipping_address, country, items) {
    this.orderid = orderid;
    this.loginid = loginid;
    this.shipping_address = shipping_address;
    this.country = country;
    this.items = items;
  }
}

module.exports = Order;
