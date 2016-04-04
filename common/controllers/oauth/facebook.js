exports.auth = function(req, res, next) {
  var fbCallback = req.query.returnTo;
  for(var prop in req.query) {
    if (prop !== 'returnTo')
      fbCallback += '&' + prop + '=' + req.query[prop];
  }
  
  req.session.fbCallback = fbCallback;
  var callbackURL = '/auth/facebook/callback';
  passport.authenticate('facebook', { scope: ['email'] }) (req,res,next);
};

exports.callback = function(req, res, next) {
  passport.authenticate('facebook', function(err, connection, info) {
    if (err) {
      console.log(err);
    }

    var fbCallback = req.session.fbCallback;
    delete req.session.fbCallback;
    
    return res.redirect(fbCallback);
  })(req,res,next);
}