/*
 * routes/index.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * ROUTING RULES
 */
 
controllers = require('../controllers');
common = require('../common');
services = require('../services');
oauth2 = require('../oauth2');
middleware = require('../middleware')

// export a function that accepts `app` as a param
module.exports = function(server) {
//  require('./route_v0')(server);
  
  // routes for controllers
  require('./controllers')(server);
  
  // routes for common resources
  require('./common')(server);

  // add new lines for each other module, or use an array with a forEach
  require('./honalab')(server);
  require('./ssulit')(server);

  require('./dialogs')(server);

  // default routing rule
  server.get('/', function(req, res) {
    if (req.headers['user-agent'] === 'ELB-HealthChecker/1.0') {
      return req.session.destroy(function(err) {res.json(200, {'message': 'OK'}) });
    }
    
    return res.json(404, {'message': 'not found'});
  });
  server.options('/*', function(req, res) { return res.json(200, {'message': 'OK'}); });
  server.all('/*', function(req, res) { return res.json(404, {'message': 'not found'}); });
};
