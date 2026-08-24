const assert = require('node:assert/strict');
const { userScriptResponseTarget } = require('../src/userscript-network');

const requested = new URL('https://api.telegram.org/bot123/getMe');

assert.equal(
  userScriptResponseTarget({ url: '' }, requested),
  requested,
  'An empty Electron Response.url must retain the requested URL object.'
);
assert.equal(
  userScriptResponseTarget({}, requested),
  requested,
  'A missing Electron Response.url must retain the requested URL object.'
);
assert.equal(
  userScriptResponseTarget({ url: 'https://api.telegram.org/bot123/getMe' }, requested).href,
  requested.href,
  'A valid final response URL must be preserved.'
);
assert.throws(
  () => userScriptResponseTarget({ url: 'not a url' }, requested),
  /URL final no válida/,
  'A malformed non-empty response URL must still be rejected.'
);

console.log(JSON.stringify({
  emptyResponseUrlFallback: true,
  missingResponseUrlFallback: true,
  validResponseUrl: true,
  malformedResponseUrlRejected: true
}));
