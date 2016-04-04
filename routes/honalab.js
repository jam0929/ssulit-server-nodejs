/*
 * routs/honalab.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * ROUTING RULES FOR HONALAB SERVICE
 */

module.exports = function(server) {
  // collections
  // greennuts likes
  server.get('/greennuts/articles/:id/:attribute', services.honalab.greennuts.get);
  server.post('/greennuts/articles/:id/like', services.honalab.greennuts.addLike);
  server.del('/greennuts/articles/:id/like', services.honalab.greennuts.delLike);
  
  // greennuts articles
  server.post('/greennuts/articles', services.honalab.greennuts.set);
  server.post('/greennuts/articles/:id', services.honalab.greennuts.set);
  server.get('/greennuts/articles', services.honalab.greennuts.get);
  server.get('/greennuts/articles/:id', services.honalab.greennuts.get);
  server.del('/greennuts/articles/:id', services.honalab.greennuts.del);
  
  // simplenuts likes
  server.get('/simplenuts/articles/:id/:attribute', services.honalab.simplenuts.get);
  server.post('/simplenuts/articles/:id/like', services.honalab.simplenuts.addLike);
  server.del('/simplenuts/articles/:id/like', services.honalab.simplenuts.delLike);
  
  // simplenuts articles
  server.post('/simplenuts/articles', services.honalab.simplenuts.set);
  server.post('/simplenuts/articles/:id', services.honalab.simplenuts.set);
  server.get('/simplenuts/articles', services.honalab.simplenuts.get);
  server.get('/simplenuts/articles/:id', services.honalab.simplenuts.get);
  server.del('/simplenuts/articles/:id', services.honalab.simplenuts.del);
  
  // gagnuts articles
  server.post('/gagnuts/articles', services.honalab.gagnuts.setArticle);
  server.get('/gagnuts/articles/:id', services.honalab.gagnuts.getArticle);
  server.get('/gagnuts/articles', services.honalab.gagnuts.getArticle);
  server.put('/gagnuts/articles', services.honalab.gagnuts.setArticle);
  server.del('/gagnuts/articles', services.honalab.gagnuts.delArticle);
  
  // gagnuts likes
  server.post('/gagnuts/light', services.honalab.gagnuts.setLight);
  server.get('/gagnuts/light/:id', services.honalab.gagnuts.getLight);
  server.get('/gagnuts/light', services.honalab.gagnuts.getLight);
  server.put('/gagnuts/light', services.honalab.gagnuts.setLight);
  server.del('/gagnuts/light', services.honalab.gagnuts.delLight);
};
