/**
 * errorHandler.js  (middleware)
 *
 * Global Express error handler — the last middleware registered in app.js.
 * Any error thrown or passed to next(err) from a route or controller lands here.
 * Converts it into a consistent JSON response: { error: { message } }.
 *
 * Service and controller code should attach a .status property to errors when
 * appropriate (e.g. 400, 401, 404, 402) so the correct HTTP status is returned.
 * Undecorated errors default to HTTP 500.
 *
 * Main exports:
 *   errorHandler(err, req, res, next) – Express 4-argument error handler
 */

function errorHandler (err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: {
      message
    }
  });
}

module.exports = { errorHandler };

