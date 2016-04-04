/**
 * Module dependencies.
 */
var passport = require('passport-strategy')
  , util = require('util')

function Strategy(options, verify) {
  if (typeof options == 'function') {
    verify = options;
    options = {};
  }
  if (!verify) { throw new TypeError('LocalStrategy requires a verify callback'); }
  
  this._appNameField = options.appNameField || 'appName';
  this._deviceIdField = options.deviceIdField || 'deviceId';
  this._clientIdField = options.clientIdField || 'clientId';
  
  passport.Strategy.call(this);
  this.name = 'device';
  this._verify = verify;
  this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
  options = options || {};
  var appName = lookup(req.body, this._appNameField) || lookup(req.query, this._appNameField);
  var deviceId = lookup(req.body, this._deviceIdField) || lookup(req.query, this._deviceIdField);
  var clientId = lookup(req.body, this._clientIdField) || lookup(req.query, this._clientIdField);
  
  if (!appName || !deviceId || !clientId) {
    return this.fail({ message: options.badRequestMessage || 'Missing credentials' }, 400);
  }
  
  var self = this;
  
  function verified(err, user, info) {
    if (err) { return self.error(err); }
    if (!user) { return self.fail(info); }
    self.success(user, info);
  }

  try {
    if (self._passReqToCallback) {
      this._verify(req, appName, deviceId, clientId, verified);
    } else {
      this._verify(appName, deviceId, clientId, verified);
    }
  } catch (ex) {
    return self.error(ex);
  }
};

function lookup(obj, field) {
  if (!obj) { return null; }
  var chain = field.split(']').join('').split('[');
  for (var i = 0, len = chain.length; i < len; i++) {
    var prop = obj[chain[i]];
    if (typeof(prop) === 'undefined') { return null; }
    if (typeof(prop) !== 'object') { return prop; }
    obj = prop;
  }
  return null;
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
