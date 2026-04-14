/**
 * Express middleware to wrap asynchronous route handlers and catch errors.
 * Any error caught is passed to the next() function to be handled by the global error handler.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
