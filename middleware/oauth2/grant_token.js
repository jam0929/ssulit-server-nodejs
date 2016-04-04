var oauth2 = require('./index');

module.exports = function grant_token(grant_type, req_info, done) {
  if (!grant_type) {
    return done('cannot find grant type', null);
  }

  switch (grant_type) {
    case 'code':
    case 'authorization_code':
      // check validation of parameter
      if (!req_info.code || !req_info.client_id || !req_info.client_secret || !req_info.redirect_uri) {
        return done('cannot find authorization info!', null);
      }
      
      //check validation of authorization code
      db.authorizationCodes.find(req_info.code, function cbFindAuthCode(aerr, auth) {
        if (aerr) {
          return done(aerr, null);
        } else if (req_info.client_id === auth.client_id) {
          var keyClient = {'id': auth.client.id};
          db.clients.find(keyClient, function cbFindClient(cerr, client) {
            if (client.secret === req.query.secret) {
              // delete old one
              db.accessTokens.delete(req_info.access_token);
              
              // grant token
              var access_token = utils.uid(oauth2.TOKEN_LENGTH);
              var refresh_token = utils.uid(oauth2.TOKEN_LENGTH);
              
              var keyNewToken = {'key': access_token};
              var reqBody = req_info;
              delete reqBody.access_token;
              reqBody['refresh_token'] = refresh_token;
              reqBody['expires'] = (+new Date()) + oauth2.TOKEN_LIFE_TIME;
              
              db.accessTokens.save(keyNewToken, reqBody, function(nerr, newToken) {
                if (nerr) {
                  return done(nerr, null);
                }
                
                newToken['type'] = 'bearer';
                return done(null, newToken);
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
      var keyTemplate = {
        'AttributeValueList': [],
        'ComparisonOperator': ''
      };
      
      var key = {};
      var options = {};
      var keyRefreshToken = JSON.parse(JSON.stringify(keyTemplate));
      keyRefreshToken['AttributeValueList'].push({'S': req_info.refresh_token});
      keyRefreshToken.ComparisonOperator = 'EQ';
      key['refresh_token'] = keyRefreshToken;
  
      options.IndexName = 'refresh_token-index';
      options.Limit = 1;

      db.accessTokens.query(key, options, function(terr, info) {
        var token = info ? (info.data.length === 1 ? info.data[0] : null) : null;
        if (token.client_id === req_info.client_id) {
          // generate new access token
          var access_token = utils.uid(oauth2.TOKEN_LENGTH);
          
          // remove old one
          var keyOldToken = {'key': req_info.access_token};
          db.accessTokens.delete(keyOldToken);
          
          // save new one
          var keyNewToken = {'key': access_token};
          var reqBody = req_info;
          delete reqBody.access_token;
          reqBody['expires'] = (+new Date()) + oauth2.TOKEN_LIFE_TIME;
          
          db.accessTokens.save(keyNewToken, reqBody, function(nerr, newToken) {
            if (nerr) {
              return done(nerr, null);
            }

            return done(null, newToken);
          });
        } else {
          return done('invalid client id', null); 
        }
      });
      break;
    case 'implicit':
      var access_token = utils.uid(oauth2.TOKEN_LENGTH);
      var refresh_token = utils.uid(oauth2.TOKEN_LENGTH);
      
      var key = {
        'key': access_token
      };
      
      var reqBody = req_info;
      reqBody['refresh_token'] = refresh_token;
      reqBody['expires'] = (+new Date()) + oauth2.TOKEN_LIFE_TIME;
      
      db.accessTokens.save(key, reqBody, function(err, newToken) {
        if (err) { return done(err, null); }

                
        newToken['type'] = 'bearer';
        return done(null, newToken);
      });
      break;
  }
}
