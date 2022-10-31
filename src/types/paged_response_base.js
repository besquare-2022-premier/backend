/**
 * @template T
 * The base class for paged response
 */
class PagedResponseBase {
  /**
   * @param {number} offset The offset of the result set
   * @param {number} page The page number
   * @param {number} items Number of items
   * @param {T[]} results The results
   */
  constructor(offset, page, items, results) {
    this.offset = offset;
    this.page = page;
    this.items = items;
    this.results = results;
  }
}
module.exports = PagedResponseBase;
