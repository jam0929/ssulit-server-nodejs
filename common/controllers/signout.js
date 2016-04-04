/*
 * common/controllers/logout.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * LOGOUT
 */

module.exports = function(req, res, next) {
  req.logout();
  if(req.query.redirect_uri)
    return res.redirect(req.query.redirect_uri);

  return res.json(200, {'message':'OK'});
}