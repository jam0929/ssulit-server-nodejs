var controllers = require('../controllers');
var login = require('connect-ensure-login');
var gl_server = require('../controllers/gl_server');

module.exports = function(server) {
  server.get('/dialog/login', controllers.auth.loginForm);
  server.get('/dialog/logout', controllers.auth.logoutForm);
  server.get('/dialog/regist', login.ensureLoggedOut({ redirectTo: '/dialog/logout' }), controllers.user.registForm);
  server.get('/dialog/client/create', login.ensureLoggedIn({ redirectTo: '/dialog/login' }), controllers.client.createForm);

// apis for developers (developer center)
// authentication
  server.post('/auth/user', controllers.auth.signin);
  server.post('/auth', controllers.auth.signin);
  server.get('/auth/user', controllers.auth.self);
  server.del('/auth/user', controllers.auth.logout);
  server.get('/auth/logout/', controllers.auth.logout); // for test
  server.get('/auth/connect/', controllers.auth.connect);

// user
  server.post('/user', controllers.user.regist);
  server.get('/user', controllers.user.get);
  server.put('/user', controllers.user.update);
  server.del('/user', controllers.user.withdraw);

//  server.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
//  server.get('/auth/facebook/callback', controllers.auth.connect);
//    passport.authenticate('facebook', { successRedirect: '/auth/connect/', failureRedirect: '/dialog/regist' }));


// ------- api ------- //
// client
  server.post('/api/client',
    login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }), controllers.client.create); // create new project
  server.get('/api/client/:id',
    login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }), controllers.client.info);  // get project detail
  server.get('/api/client',
    login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }), controllers.client.list);  // get project list
  server.put('/api/client/:id',
    login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }), controllers.client.update);  // update project info
  server.del('/api/client/:id',
    login.ensureLoggedIn({ redirectTo: '/dialog/login', setReturnTo: true }), controllers.client.delete);  // delete project

  
  
  //Common 
  server.post('/api/login', controllers.auth.loginForm);
  server.post('/api/user', controllers.auth.signin);
  server.get('/api/user', controllers.user.getSelf);
  server.del('/api/user', controllers.auth.logout);
  server.get('/api/user/:id', controllers.user.get);  


  //Greenlight
  server.post('/api/greenlight/article', gl_server.greenlight.setArticle);
  server.get('/api/greenlight/article', gl_server.greenlight.getArticle);
  server.get('/api/greenlight/article/:id', gl_server.greenlight.getArticle);
  server.put('/api/greenlight/article/:id', gl_server.greenlight.setArticle);
  server.del('/api/greenlight/article/:id', gl_server.greenlight.delArticle);
  
  server.post('/api/greenlight/light', gl_server.greenlight.setLight);
  server.get('/api/greenlight/light', gl_server.greenlight.getLight);
  server.get('/api/greenlight/light/:id', gl_server.greenlight.getLight);
  server.put('/api/greenlight/light/:id', gl_server.greenlight.setLight);
  server.del('/api/greenlight/light/:id', gl_server.greenlight.delLight);
  
  //gag
  server.post('/api/gag/article', gl_server.gag.setArticle);
  server.get('/api/gag/article', gl_server.gag.getArticle);
  server.get('/api/gag/article/:id', gl_server.gag.getArticle);
  server.put('/api/gag/article/:id', gl_server.gag.setArticle);
  server.del('/api/gag/article/:id', gl_server.gag.delArticle);
  
  server.post('/api/gag/like', gl_server.gag.setLike);
  
  server.post('/api/gag/light', gl_server.gag.setLight);
  server.get('/api/gag/light', gl_server.gag.getLight);
  server.get('/api/gag/light/:id', gl_server.gag.getLight);
  server.put('/api/gag/light/:id', gl_server.gag.setLight);
  server.del('/api/gag/light/:id', gl_server.gag.delLight);
  
  //kakaoapp
  server.post('/api/kakaoapp/app', gl_server.kakaoapp.setApp);
  server.get('/api/kakaoapp/app', gl_server.kakaoapp.getApp);
  server.get('/api/kakaoapp/app/:id', gl_server.kakaoapp.getApp);
  server.put('/api/kakaoapp/app/:id', gl_server.kakaoapp.setApp);
  server.del('/api/kakaoapp/app/:id', gl_server.kakaoapp.delApp);
  
  server.post('/api/kakaoapp/like', gl_server.kakaoapp.setLike);
  server.get('/api/kakaoapp/like', gl_server.kakaoapp.getLike);
  server.get('/api/kakaoapp/like/:id', gl_server.kakaoapp.getLike);
  server.put('/api/kakaoapp/like/:id', gl_server.kakaoapp.setLike);
  server.del('/api/kakaoapp/like/:id', gl_server.kakaoapp.delLike);
/*

  server.post('/api/comment', controllers.comment.setComment);
  server.get('/api/comment', controllers.comment.getComment);
  server.get('/api/comment/:id', controllers.comment.getComment);
  server.put('/api/comment/:id', controllers.comment.setComment);
  server.del('/api/comment/:id', controllers.comment.delComment);
  */
  
  server.post('/api/userConnection', controllers.user.setUserConnection);
  server.get('/api/userConnection', controllers.user.getUserConnection);
  server.get('/api/userConnection/:id', controllers.user.getUserConnection);
  server.put('/api/userConnection/:id', controllers.user.setUserConnection);
  server.del('/api/userConnection/:id', controllers.user.delUserConnection);


// userinfo
  server.get('/api/userinfo', controllers.user.get);
  server.get('/me/userinfo', controllers.user.getSelf);

  //notification
  server.post('/api/notification/send', controllers.notification.send);
  server.post('/api/notification/regist', controllers.notification.regist);
};