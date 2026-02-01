const logger = require('../utils/logger');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, next) {
  logger.error('Request error', err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Resource already exists';
  }

  const body = { error: message };
  if (err.name === 'ValidationError' && err.errors) {
    body.details = Object.values(err.errors).map((e) => e.message);
  }
  if (process.env.NODE_ENV === 'development' && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
