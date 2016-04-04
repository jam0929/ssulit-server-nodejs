/*
 * routs/honalab.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 28
 * ROUTING RULES FOR SSULIT SERVICE
 */

module.exports = function(server) {
  server.get('/ssul.it/ssuls/ch', services.ssulit.ssul.ch);
  server.get('/ssul.it/ssuls/channels', services.ssulit.ssul.getChannel);

  server.post('/ssul.it/ssuls', services.ssulit.ssul.set);
  server.put('/ssul.it/ssuls', services.ssulit.ssul.set);
  server.get('/ssul.it/ssuls', services.ssulit.ssul.get);


  server.get('/ssul.it/ssuls/me', services.ssulit.ssul.getMine);
  server.get('/ssul.it/ssuls/:id', services.ssulit.ssul.get);
  server.get('/ssul.it/ssuls/:id/:created', services.ssulit.ssul.getDetail);
  server.put('/ssul.it/ssuls/:id/:created', services.ssulit.ssul.set);
  server.del('/ssul.it/ssuls/:id/:created', services.ssulit.ssul.del);

  server.get('/ssul.it/ssuls/:id/:created/toks/:tokCreated', services.ssulit.tok.getDetail);
  server.del('/ssul.it/ssuls/:id/:created/toks/:tokCreated', services.ssulit.tok.del);
  server.put('/ssul.it/ssuls/:id/:created/toks/:tokCreated', services.ssulit.tok.update);

  server.get('/ssul.it/ssuls/:id/:created/toks', services.ssulit.tok.get);
  server.post('/ssul.it/ssuls/:id/:created/toks', services.ssulit.tok.set);

  // actions for specific tok
  server.post('/ssul.it/ssuls/:id/:created/toks/:tokCreated/:action', function(req, res) {
    if (services.ssulit.tok[req.params.action])
      services.ssulit.tok[req.params.action](req, res)
    else
      return res.json(404, {'message': 'not found'});
  });

  // actions for specific ssul
  server.post('/ssul.it/ssuls/:id/:created/:action', function(req, res) {
    if (services.ssulit.ssul[req.params.action])
      services.ssulit.ssul[req.params.action](req, res)
    else
      return res.json(404, {'message': 'not found'});
  });
};