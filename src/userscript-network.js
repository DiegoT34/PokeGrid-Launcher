'use strict';

function userScriptResponseTarget(response, requestedTarget) {
  const responseUrl = String(response?.url || '').trim();
  if (!responseUrl) return requestedTarget;
  try {
    return new URL(responseUrl);
  } catch {
    throw new Error('La red devolvió una URL final no válida.');
  }
}

module.exports = { userScriptResponseTarget };
