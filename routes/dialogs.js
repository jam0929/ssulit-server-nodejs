var login = require('connect-ensure-login');
  
module.exports = function(server) {
  server.get('/dialog/signin', common.dialogs.signin);
  server.get('/dialog/signout', common.dialogs.signout);
  server.get('/dialog/regist', login.ensureLoggedOut({ redirectTo: '/dialog/signout' }), common.dialogs.regist);
  server.get('/dialog/client/create', login.ensureLoggedIn({ redirectTo: '/dialog/signin' }), common.dialogs.createClient);

  server.get('/dialog/reset_password', common.dialogs.reset_password);
  server.get('/dialog/find_password', common.dialogs.find_password);
  
// oauth: authorization
  server.get('/dialog/authorize',
    login.ensureLoggedIn({ redirectTo: '/dialog/signin', setReturnTo: true }), middleware.oauth2.authorization);
  server.post('/dialog/authorize/decision',
    login.ensureLoggedIn({ redirectTo: '/dialog/signin', setReturnTo: true }), middleware.oauth2.decision);
}
