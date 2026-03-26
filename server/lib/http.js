function sendBadRequest(res, error) {
  return res.status(400).json({ error });
}

function sendServerError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
}

module.exports = {
  sendBadRequest,
  sendServerError,
};
