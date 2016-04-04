/*
 * routes/controllers.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * ROUTING RULES FOR COMMON CONTROLLERS
 * DO SOME ACTIONS
 */

module.exports = function(server) {
  server.post('/signin', common.controllers.signin);
  server.post('/signout', common.controllers.signout);
  server.post('/regist', common.controllers.regist);
  server.post('/notification', common.controllers.notification.sendNotification);
}
