function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, meta = null) {
  const parts = [timestamp(), level, message];
  if (meta != null && Object.keys(meta).length > 0) {
    parts.push(JSON.stringify(meta));
  }
  return parts.join(' ');
}

function info(message, meta = null) {
  console.log(formatMessage('INFO', message, meta));
}

function warn(message, meta = null) {
  console.warn(formatMessage('WARN', message, meta));
}

function error(message, err = null) {
  const meta = err
    ? {
        message: err.message,
        ...(err.stack ? { stack: err.stack } : {}),
      }
    : null;
  console.error(formatMessage('ERROR', message, meta));
}

module.exports = {
  info,
  warn,
  error,
};
