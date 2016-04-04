
exports.signin = function(req, res) {
  var options = {};
  if (req.session.returnTo) {
    options.returnTo = req.session.returnTo;
//    delete req.session.returnTo;
  }
  
  for (var prop in req.query) {
    options[prop] = req.query[prop];
  }
  
  // check required parameter
  var response = { 'response': 500, 'message': 'unknown' };
  if (!options.returnTo && !options.redirect_uri) {
    response.response = 400;  // Bad Request
    response.message = 'Bad Request'
    return res.json(response);
  }
  options.returnTo = encodeURIComponent(options.returnTo);
  return res.render('signin', options);
};

exports.signout = function(req, res) {
  res.render('signout');
};

exports.regist = function(req, res) {
  if (req.query.redirect_uri) {
    var returnTo = '/dialog/authorize?';
    
    for(var prop in req.query) {
      returnTo = returnTo + '&' + prop + '=' + req.query[prop];
    }
    req.session.returnTo = returnTo;
  }

  res.render('regist', { returnTo: encodeURIComponent(returnTo) });
};

exports.createClient = function(req, res) {
  res.render('create_client');
};

exports.reset_password = function(req, res) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };
  
  if (!req.query.id || !req.query.key || !req.query.returnTo) {
    return res.json(400, {'message': 'missing parameter'});
  }
  
  db.users.find(req.query.id, function(err, user) {
    if (err) {
      result['code'] = 500;
      result['message'] = err;
      return res.json(500, result);
    }

    if (!user || !user.reset || user.reset !== req.query.key) {
      return res.json(400, {'message': 'invalid request'});
    }
    
    // dialog
    var options = {};
    options.user = user;
    options.returnTo = req.query.returnTo;
    
    res.render('reset_password', options);
  });
}

exports.find_password = function(req, res, next) {
  var result = {
    'code': 400,
    'message': 'bad request'
  };
  
  if (!req.query.returnTo) {
    return res.json(400, {'message': 'missing parameter'});
  }

  var options = {};
  options.returnTo = req.query.returnTo;
  res.render('find_password', options);
}
