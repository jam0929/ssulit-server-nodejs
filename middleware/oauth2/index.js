var oauth2orize = require('oauth2orize');
exports.oauth2Server = oauth2orize.createServer();

exports.authorization = require('./authorization');
exports.decision = require('./decision');
exports.grant_token = require('./grant_token');

exports.TOKEN_LENGTH = 16;
exports.CODE_LENGTH = 12;
exports.TRANSACTION_ID_LENGTH = 12;
exports.TOKEN_LIFE_TIME = 10 * 60 * 60 * 1000;
