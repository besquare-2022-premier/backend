/**
 * Represents a product
 */
class Product {
  /**
   *
   * @param {number} product_id
   * @param {string} name
   * @param {string?} description
   * @param {number} stock
   * @param {number} price
   * @param {string} category
   * @param {string} image
   */
  constructor(product_id, name, description, stock, price, category, image) {
    this.product_id = product_id;
    this.name = name;
    this.description = description;
    this.stock = stock;
    this.price = price;
    this.category = category;
    this.image = image;
  }
}

module.exports = Product;
