var development = {
  address: '127.0.0.1',
  domain: '127.0.0.1',
  port: 9000,
  env: global.process.env.NODE_ENV || 'development' 
};

var production = {
  address: 'api.jumpingnuts.com',
  domain: '.jumpingnuts.com',
  port: 9000,
  env: global.process.env.NODE_ENV || 'production'
};

exports.Config = global.process.env.NODE_ENV === 'production' ? production : development;
