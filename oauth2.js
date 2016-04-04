/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize')
var passport = require('passport')
var login = require('connect-ensure-login')
var db = require('./db')
var utils = require('./utils');

var TOKEN_LENGTH = 16;
var CODE_LENGTH = 12;
var TRANSACTION_ID_LENGTH = 12;

var oneDayInMilliseconds = 86400000;

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTP request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient(function(client, done) {
  return done(null, client.id);
});

server.deserializeClient(function(id, done) {
  db.clients.find(id, function(err, client) {
    if (err) { return done(err); }
    return done(null, client);
  });
});

// Register supported grant types.
//
// OAuth 2.0 specifies a framework that allows users to grant client
// applications limited access to their protected resources.  It does this
// through a process of the user granting access, and the client exchanging
// the grant for an access token.

// Grant authorization codes.  The callback takes the `client` requesting
// authorization, the `redirectURI` (which is used as a verifier in the
// subsequent exchange), the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a code, which is bound to these
// values, and will be exchanged for an access token.

server.grant(oauth2orize.grant.code(function grantCode(client, redirectURI, user, ares, done) {
  var code = utils.uid(CODE_LENGTH);
  
  db.authorizationCodes.save(code, client.id, redirectURI, user.id, function(err) {
    if (err) { return done(err); }
    done(null, code);
  });
}));

// Grant implicit authorization.  The callback takes the `client` requesting
// authorization, the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application.  The application issues a token, which is bound to these
// values.

server.grant(oauth2orize.grant.token(function grantToken(client, user, ares, done) {
  var token = utils.uid(CODE_LENGTH);

  db.accessTokens.save(token, user, client.client_id, function(err) {
    if (err) { return done(err); }
    done(null, token);
  });
}));

// Exchange authorization codes for access tokens.  The callback accepts the
// `client`, which is exchanging `code` and any `redirectURI` from the
// authorization request for verification.  If these values are validated, the
// application issues an access token on behalf of the user who authorized the
// code.

server.exchange(oauth2orize.exchange.code(function(client, code, redirectURI, done) {
  db.authorizationCodes.find(code, function(err, authCode) {
    if (err) { return done(err); }
    if (client.id !== authCode.client_id) { return done(null, false); }
    if (redirectURI !== authCode.redirect_uri) { return done(null, false); }
    
    var token = utils.uid(TOKEN_LENGTH);
    db.accessTokens.save(token, authCode.user_id, authCode.client_id, function(err) {
      if (err) { return done(err); }
      done(null, token);
    });
  });
}));

// Exchange user id and password for access tokens.  The callback accepts the
// `client`, which is exchanging the user's name and password from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the user who authorized the code.

server.exchange(oauth2orize.exchange.password(function(client, id, password, scope, done) {

    //Validate the client
    db.clients.find(client.client_id, function(err, localClient) {
        if (err) { return done(err); }
        if(localClient === null) {
            return done(null, false);
        }
        if(localClient.clientSecret !== client.clientSecret) {
            return done(null, false);
        }
        //Validate the user
        db.users.find(id, function(err, user) {
            if (err) { return done(err); }
            if(user === null) {
                return done(null, false);
            }
            if(password !== user.password) {
                return done(null, false);
            }
            //Everything validated, return the token
            var token = utils.uid(16);
            db.accessTokens.save(token, user.id, client.client_id, function(err) {
                if (err) { return done(err); }
                done(null, token);
            });
        });
    });
}));

// Exchange the client id and password/secret for an access token.  The callback accepts the
// `client`, which is exchanging the client's id and password/secret from the
// authorization request for verification. If these values are validated, the
// application issues an access token on behalf of the client who authorized the code.

server.exchange(oauth2orize.exchange.clientCredentials(function(client, scope, done) {

    //Validate the client
    db.clients.find(client.clien, function(err, localClient) {
        if (err) { return done(err); }
        if(localClient === null) {
            return done(null, false);
        }
        if(localClient.clientSecret !== client.clientSecret) {
            return done(null, false);
        }
        var token = utils.uid(16);
        //Pass in a null for user id since there is no user with this grant type
        db.accessTokens.save(token, null, client.client_id, function(err) {
            if (err) { return done(err); }
            done(null, token);
        });
    });
}));

// user authorization endpoint
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request.  In
// doing so, is recommended that the `redirectURI` be checked against a
// registered value, although security requirements may vary accross
// implementations.  Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectURI` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction.  It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization).  We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view. 

exports.authorization = function(req, res, next){
  if (!req.query.client_id || !req.query.redirect_uri || !req.query.response_type || !req.query.scope) {
    return res.json({ 'response': 400, 'message': 'invalid parameter' });
  }

  server.authorization('local', function cbCheckAuthorization(client_id, redirect_uri, done) {
    var reqInfo = {'id': client_id};
    
    db.clients.find(reqInfo, function cbFindClient(err, client) {
      // ckeck authorization
      if(err) {
        return res.json({ 'response': 400, 'message': 'invalid client id' });
      }
      
      db.accessTokens.findByID(req.user.id, client_id, function(err, data) {
        if (err) {
          return res.json({ 'response': 500, 'message': err.message });
        } else if (!data) {
          // not authorized yet
          // request resoure owner to authorize
          var tid = utils.uid(TRANSACTION_ID_LENGTH);
    
          var txn = {};
          txn.protocol = 'oauth2';
          txn.client = client;
          txn.redirect_uri = req.query.redirect_uri;
          txn.responseType = req.query.response_type;
          txn.scope = Array.isArray(req.query.scope) ? req.query.scope : req.query.scope.split('|');
          txn.expire = (+new Date()) + 1000 * 60 * 10;       

          if (req.query.state) {
            txn.state = req.query.state;
          }

          // store transaction in session
          var txns = req.session['authorize'] = req.session['authorize'] || {};
          txns[tid] = txn;

          return res.render('dialog', { transactionID: tid, user: req.user, client: txn.client, scope: txn.scope });
        } else if (data.message === 'authorized') {
          // already granted
          // check scope validation
          var scope = Array.isArray(req.query.scope) ? req.query.scope : req.query.scope.split('|');
          
          for (var value in scope) {
            if (data.scope.indexOf(scope[value]) < 0) {
              var tid = utils.uid(TRANSACTION_ID_LENGTH);

              var txn = {};
              txn.protocol = 'improve';
              txn.client = client;
              txn.access_token = data.access_token;
              txn.redirect_uri = req.query.redirect_uri;
              txn.responseType = req.query.response_type;
              txn.refresh_token = data.refresh_token;
              txn.scope = scope;
              txn.expire = (+new Date()) + 1000 * 60 * 10;

              if (req.query.state) {
                txn.state = req.query.state;
              }
              
              // store transaction in session
              var txns = req.session['authorize'] = req.session['authorize'] || {};
              txns[tid] = txn;
              
              return res.render('require_addtional_scope', { transactionID: tid, user: req.user, client: txn.client, oldscope: data.scope, newscope: scope });
            }
          }
          var location = decodeURIComponent(req.query.redirect_uri);
          location += '?scope=' + data.scope.join('|') + '&state=' + req.query.state;
          location += '&access_token=' + data.access_token + '&token_type=bearer&expire_in=' + data.expires;
          
          return res.render('close_parent', { redirect_uri: location });
        } else if (data.message === 'expired') {
          // need to refresh
          var location = decodeURIComponent(req.query.redirect_uri);
          location += '?scope=' + data.scope.join('|') + '&state=' + req.query.state;

          var req_info = {};
          req_info.client_id = req.query.client_id;
          req_info.user_id = req.user.id;
          req_info.scope = Array.isArray(req.query.scope) ? req.query.scope : req.query.scope.split('|');
          req_info.access_token = data.access_token;
          req_info.refresh_token = data.refresh_token;

          grant_token('refresh_token', req_info, function(gterr, token) {
            location += '&access_token=' + token.access_token + '&token_type=bearer&expire_in=' + token.expires;
  
            return res.render('close_parent', { redirect_uri: location });
          });
        } else {
          return res.json({ 'response': 500, 'message': 'illregal request' });
        }
      });
    });
  })(req, res, next);

};

// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.
exports.decision = function(req, res, next){
  var tid = req.body.transaction_id;
  
  if (req.session['authorize'][tid] && req.session['authorize'][tid].expire > new Date()) {
    req.oauth2 = req.session['authorize'][tid];
    
    var location = decodeURIComponent(req.oauth2.redirect_uri);
    location += '?scope=' + req.oauth2.scope.join('|') + '&state=' + req.oauth2.state;

    if (req.oauth2.protocol === 'improve') {
      var req_info = {};
      req_info.client_id = req.oauth2.client.id;
      req_info.access_token = req.oauth2.access_token;
      req_info.refresh_token = req.oauth2.refresh_token;
      req_info.user_id = req.user.id;
      req_info.scope = req.oauth2.scope;
      grant_token('refresh_token', req_info, function(err, data) {
        if (err) { return res.send(err); }
        location += '&access_token=' + data.access_token + '&token_type=bearer&expire_in=' + data.expires;
        // location += '&refresh_token' + reftoken;

        return res.redirect(location);
//        return res.render('close_parent', { redirect_uri: location });
      });
    } else {
      switch (req.oauth2.responseType) {
        case 'code':
        case 'authorization_code':
          var code = utils.uid(CODE_LENGTH);
          db.authorizationCodes.save(code, req.oauth2.client.id, req.oauth2.redirect_uri, req.user.id, function(err) {
            if (err) { return res.send(err); }
            location += '&code=' + code;
  
            return res.render('close_parent', { redirect_uri: location });
          });
          break;
  
        case 'access_token':
        case 'token':
        case 'implicit':
          var req_info = {};
          req_info.client_id = req.oauth2.client.id;
          req_info.user_id = req.user.id;
          req_info.scope = req.oauth2.scope;
          
          grant_token('implicit', req_info, function(err, data) {
            if (err) { return res.send(err); }
            location += '&access_token=' + data.access_token + '&token_type=bearer&expire_in=' + data.expires;
            // location += '&refresh_token' + reftoken;
            return res.render('close_parent', { redirect_uri: location });
          });
          break;
        }
      }
    } else {
      // expired
      res.json({ 'response': 400, 'message': 'authorization code expired' });
  }
  
  delete req.session['authorize'][tid];
};

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

exports.token = [
  login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }),
  server.token(),
  server.errorHandler()
];
/*
exports.token = [
  passport.authenticate('local', { session: false }),
  server.token(),
  server.errorHandler()
];
*/
function grant_token(grant_type, req_info, done){
  if (!grant_type) {
    return done('cannot find grant type', null);
  }
  
  switch (grant_type) {
    case 'code':
    case 'authorization_code':
      // check validation of parameter
      if (!req_info.code || !req_info.client_id || !req_info.clientSecret || !req_info.redirect_uri) {
        return done('cannot find authorization info!', null);
      }
      
      //check validation of authorization code
      db.authorizationCodes.find(req_info.code, function cbFindAuthCode(err, auth) {
        if (req_info.client_id === auth.client_id) {
          db.clients.find(auth.client_id, function cbFindClient(err, client) {
            if (client.secret === req.query.secret) {
              // grant token
              var access_token = utils.uid(TOKEN_LENGTH);
              var refresh_token = utils.uid(TOKEN_LENGTH);
              
              // delete old one
              db.accessTokens.delete(req_info.access_token);
              db.accessTokens.save(access_token, refresh_token, req_info.user_id, req_info.client_id, req_info.scope, function(err, data) {
                if (err) { return done(err.log, null); }

                var result = { access_token: token, type: 'bearer' };
                return done(null, result);
              });
            } else {
              return done('invalid client secret', null);
            }
          });
        } else {
          return done('invalid client id', null);
        }
      });
      break;
    case 'refresh_token':
      db.accessTokens.findByRefreshToken(req_info.refresh_token, function(err, data) {
        if (data.client_id === req_info.client_id) {
          // generate new access token
          var access_token = utils.uid(TOKEN_LENGTH);
          // remove old one
          db.accessTokens.delete(req_info.access_token);
          
          // save new one
          db.accessTokens.save(access_token, req_info.refresh_token, data.user_id, data.client_id, req_info.scope, 
          function(err, data2) {
              return done(null, data2);
          });
        } else {
          return done('invalid client id', null); 
        }
      });
      break;
    case 'implicit':
      var access_token = utils.uid(TOKEN_LENGTH);
      var refresh_token = utils.uid(TOKEN_LENGTH);
      
      db.accessTokens.save(access_token, refresh_token, req_info.user_id, req_info.client_id, req_info.scope, 
      function(err, data) {
        if (err) { return done(err, null); }

        var result = {};
        result.access_token = access_token;
        result.refresh_token = refresh_token;
        result.expires = data.expires;
        result.token_type = 'bearer';

        return done(null, result);
      });
      break;
  }
}

exports.tokenInfo = [
  passport.authenticate('bearer', { session: false, assignProperty: 'token' }),
  function(req, res) {
    res.json(req.token);
  }
]

exports.facebook = function(req, res) {
  passport.authenticate('facebook', function(err, profile) {
console.log(profile);
    res.send(200);
  });
}


exports.callback = function(accessToken, refreshToken, req, res) {
console.log(res);
  res.send(200);
}