/**
 * This error is intentionally subclassed for the frontend api engine to differentiate the out of stock error
 * and others
 */
module.exports = class OutOfStockError extends Error {};
