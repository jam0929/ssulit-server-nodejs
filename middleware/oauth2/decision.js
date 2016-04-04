// user decision endpoint
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application.  Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.
var oauth2 = require('./index');

module.exports = function(req, res, next){
  var tid = req.body.transaction_id;
  
  if (req.session['authorize'] && req.session['authorize'][tid] && req.session['authorize'][tid].expire > new Date()) {
    req.oauth2 = req.session['authorize'][tid];
    
    var location = req.oauth2.redirect_uri;
    location += '?scope=' + req.oauth2.scope.join('|') + (req.oauth2.state ? '&state=' + req.oauth2.state : '') + (req.oauth2.from ? '&from=' + req.oauth2.from : '');

    if (req.oauth2.protocol === 'improve') {
      var req_info = {};
      req_info.client_id = req.oauth2.client.id;
      req_info.access_token = req.oauth2.access_token;
      req_info.refresh_token = req.oauth2.refresh_token;
      req_info.user_id = req.user.id;
      req_info.scope = req.oauth2.scope;
      oauth2.grant_token('refresh_token', req_info, function(err, data) {
        if (err) { return res.send(err); }
        location += '&access_token=' + data.key + '&token_type=bearer&expire_in=' + data.expires;
        // location += '&refresh_token' + reftoken;
        location += '&code=200&message=OK';
        return res.render('close_parent', { redirect_uri: encodeURIComponent(location), open_type: req.oauth2.open_type });
      });
    } else {
      switch (req.oauth2.responseType) {
        case 'code':
        case 'authorization_code':
          var code = utils.uid(CODE_LENGTH);
          db.authorizationCodes.save(code, req.oauth2.client.id, req.oauth2.redirect_uri, req.user.id, function(err) {
            if (err) { return res.send(err); }
            location += '&code=' + code;
            location += '&code=200&message=OK';
            return res.render('close_parent', { redirect_uri: encodeURIComponent(location), open_type: req.oauth2.open_type });
          });
          break;
  
        case 'access_token':
        case 'token':
        case 'implicit':
          var req_info = {};
          req_info.client_id = req.oauth2.client.id;
          req_info.user_id = req.user.id;
          req_info.scope = req.oauth2.scope;

          oauth2.grant_token('implicit', req_info, function(err, data) {
            if (err) { return res.send(err); }
            location += '&access_token=' + data.key + '&token_type=bearer&expire_in=' + data.expires;
            location += '&code=200&message=OK';
            location += '?scope=' + req.oauth2.scope.join('|') + (req.oauth2.state ? '&state=' + req.oauth2.state : '') + (req.oauth2.from ? '&from=' + req.oauth2.from : '');
    
            // location += '&refresh_token' + reftoken;
            return res.render('close_parent', { redirect_uri: encodeURIComponent(location), open_type: req.oauth2.open_type });
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
