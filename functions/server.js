const serverless = require('serverless-http');
const app = require('../src/index.ts');
module.exports.handler = serverless(app);
