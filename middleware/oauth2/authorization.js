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
var oauth2 = require('./index');

module.exports = function(req, res, next) {
  var result = {
    code: 400,
    message: 'bad request'
  };
  
  if (!req.query.client_id || !req.query.redirect_uri || !req.query.response_type || !req.query.scope) {
    result['code'] = 400;
    result['message'] = 'bad request';
    return res.json(400, result);
  }
  
  var client_id = req.query.client_id;
  var redirect_uri = req.query.redirect_uri;
  var open_type = req.query.open_type ? req.query.open_type : 'self';

  // check validation
  var keyClient = {'id': client_id};
  db.clients.find(keyClient, function cbFindClient(cerr, client) {
    // ckeck authorization
    if (cerr) {
      result['code'] = 500;
      result['message'] = cerr;
      return res.json(500, result);
    }

    var keyTemplate = {
      'AttributeValueList': [],
      'ComparisonOperator': ''
    };
    
    var key = {};
    var options = {};
    var keyUserID = JSON.parse(JSON.stringify(keyTemplate));
    keyUserID['AttributeValueList'].push({'N': req.user.id});
    keyUserID.ComparisonOperator = 'EQ';    
    key['user_id'] = keyUserID;
    
    var keyClientID = JSON.parse(JSON.stringify(keyTemplate));
    keyClientID['AttributeValueList'].push({'S': client_id});
    keyClientID.ComparisonOperator = 'EQ';    
    key['client_id'] = keyClientID;

    options.IndexName = 'user_id-client_id-index';

    options.Limit = 1;
    
    db.accessTokens.query(key, options, function(terr, info) {
      var token = info ? (info.data.length === 1 ? info.data[0] : null) : null;
      if (terr) {
        result['code'] = 500;
        result['message'] = terr;
        return res.json(500, result);
      } else if (!token) {
        // not authorized yet
        // serialize transaction (async)
        var tid = utils.uid(oauth2.TRANSACTION_ID_LENGTH);
  
        var txn = {};
        txn.protocol = 'oauth2';
        txn.client = client;
        txn.redirect_uri = req.query.redirect_uri;
        txn.responseType = req.query.response_type;
        txn.scope = Array.isArray(req.query.scope) ? req.query.scope : req.query.scope.split('|');
        txn.expire = (+new Date()) + oauth2.TOKEN_LIFE_TIME;
        txn.open_type = open_type;

        if (req.query.state) {
          txn.state = req.query.state;
        }
        
        if (req.query.from) {
          txn.from = req.query.from;
        }

        // store transaction in session
        var txns = req.session['authorize'] = req.session['authorize'] || {};
        txns[tid] = txn;
        return res.render('authorization', { transactionID: tid, user: req.user, client: txn.client, scope: txn.scope });
      } else if (token.expires > +new Date()) {
        // already granted
        // check scope validation
        var scope = Array.isArray(req.query.scope) ? req.query.scope : req.query.scope.split('|');
        
        for (var value in scope) {
          if (token.scope.indexOf(scope[value]) < 0) {
            var tid = utils.uid(oauth2.TRANSACTION_ID_LENGTH);

            var txn = {};
            txn.protocol = 'improve';
            txn.client = client;
            txn.access_token = token.key;
            txn.redirect_uri = req.query.redirect_uri;
            txn.responseType = req.query.response_type;
            txn.refresh_token = token.refresh_token;
            txn.scope = scope;
            txn.expire = (+new Date()) + oauth2.TOKEN_LIFE_TIME;
            txn.open_type = open_type;

            if (req.query.state) {
              txn.state = req.query.state;
            }

            if (req.query.from) {
              txn.from = req.query.from;
            }
                        
            // store transaction in session
            var txns = req.session['authorize'] = req.session['authorize'] || {};
            txns[tid] = txn;
            return res.render('require_addtional_scope', { transactionID: tid, user: req.user, client: txn.client, oldscope: token.scope, newscope: scope });
          }
        }
        var location = req.query.redirect_uri;
        location += '?scope=' + token.scope.join('|') + (req.query.state ? '&state=' + req.query.state : '') + (req.query.from ? '&from=' + req.query.from : '');
        location += '&access_token=' + token.key + '&token_type=bearer&expire_in=' + token.expires;
        location += '&code=200&message=OK';

        return res.render('close_parent', { redirect_uri: encodeURIComponent(location), open_type: open_type });
      } else {
        // need to refresh
        var location = req.query.redirect_uri;
        location += '?scope=' + token.scope.join('|') + (req.query.state ? '&state=' + req.query.state : '') + (req.query.from ? '&from=' + req.query.from : '');

        var req_info = {};
        req_info.client_id = req.query.client_id;
        req_info.user_id = req.user.id;
        req_info.scope = Array.isArray(req.query.scope) ? req.query.scope : req.query.scope.split('|');
        req_info.access_token = token.key;
        req_info.refresh_token = token.refresh_token;

        oauth2.grant_token('refresh_token', req_info, function(gterr, rtoken) {
          location += '&access_token=' + rtoken.key + '&token_type=bearer&expire_in=' + rtoken.expires;
          location += '&code=200&message=OK';
          return res.render('close_parent', { redirect_uri: encodeURIComponent(location), open_type: open_type });
        });
      }
    });
  });
};
