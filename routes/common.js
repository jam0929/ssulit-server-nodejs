/*
 * routes/common.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * ROUTING RULES FOR COMMON COLLECTIONS
 * LIKE DIRECTORY
 * CAN MAKE NEW URI AS A RESULT
 */

module.exports = function(server) {
  // clients
  server.post('/clients', common.client.set);
  server.get('/clients/:id', common.client.get);
  server.get('/clients', common.client.get);
  server.put('/clients/:id', common.client.set);
  server.del('/clients/:id', common.client.del);
  
  // comments
  server.post('/comments/:key', common.comment.removeOverhead, common.comment.set);
//  server.get('/comments/:author/:created', common.comment.get);
//  server.get('/comments/:author', common.comment.get);
  server.get('/comments/:key', common.comment.removeOverhead, common.comment.get);
  server.put('/comments/:key/:created', common.comment.removeOverhead, common.comment.set);
  server.del('/comments/:key/:created', common.comment.removeOverhead, common.comment.del);
  
  server.post('/comments/:key/:created/like', common.comment.removeOverhead, common.comment.like);
  server.post('/comments/:key/:created/unlike', common.comment.removeOverhead, common.comment.unlike);
  
  // users
  server.post('/users', common.user.set);
  server.post('/users/reset', common.user.reset);
  server.get('/users/:id', common.user.get);
  server.get('/users', common.user.get);
  server.put('/users/:id/:attribute', common.user.set);
  server.put('/users/:id', common.user.set);
  server.del('/users/:id', common.user.del);

  // devices
  server.post('/devices', common.device.regist);
  server.post('/devices/merge', common.device.merge);

  // oauth  
  server.get('/auth/facebook', common.controllers.oauth.facebook.auth);
  server.get('/auth/facebook/callback', common.controllers.oauth.facebook.callback);
  server.get('/auth/facebook/callback/:encoded', common.controllers.oauth.facebook.callback);
  
  // notice
  server.get('/:service/notice', common.operation.notice.get);
  server.post('/:service/notice', common.operation.notice.set);
  
  // version check
  server.get('/:service/version', common.operation.version.get);
}
