/*
 * db/clients.js
 * AUTHOR : beryh
 * DATE : 2014. 4. 3
 * CLIENT(OAUTH) DATABASE MODEL
*/

var utils = require('../utils');
var versiondb = Object.create(require('./super'), {tableName: {value: 'Versions', enumerable: true}});

exports.find = function(_key, done) {
  var key = {
    'key': {'type':'S', 'value': _key.key},
    'version': {'type':'S', 'value': _key.version}
  };

  versiondb.find(key, done);
}

exports.findBatch = function(_key, done) {
  versiondb.findBatch(_key, done);
}

exports.save = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value}}, ]
  //reqInfo [{property:{type:S/N/SS, value}}, ]
  var key = {
    'key': {'type':'S', 'value': _key.key},
    'version': {'type':'S', 'value': _key.version}
  };
    
  var reqInfo = {
    'key': {
      'type': 'S',
      'value': _key.key
    }, 'version': {
      'type': 'S',
      'value': _key.version
    }
  };

  for (prop in _reqBody) {
    if (Array.isArray(_reqBody[prop])) {
      reqInfo[prop] = {
        'type': 'SS',
        'value': _reqBody[prop]
      };
    } else if (!isNaN(_reqBody[prop])) {
      reqInfo[prop] = {
        'type': 'N',
        'value': typeof _reqBody[prop] != 'boolean' ? _reqBody[prop].toString() : (_reqBody[prop] ? '1' : '0')
      };
    } else if (typeof _reqBody[prop] === 'string') {
      reqInfo[prop] = {
        'type': 'S',
        'value': _reqBody[prop]
      };
    } else if (typeof _reqBody[prop] === 'boolean') {
      reqInfo[prop] = {
        'type': 'N',
        'value': _reqBody[prop] ? '1' : '0'
      };
    } else {
      reqInfo[prop] = {
        'type': 'S',
        'value': JSON.stringify(_reqBody[prop])
      };
    }
  };

  versiondb.save(key, reqInfo, done);
}

exports.update = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'key': {'type':'S', 'value': _key.key},
    'version': {'type':'S', 'value': _key.version}
  };
  
  var reqInfo = {};
  
  for (prop in _reqBody) {
    if (Array.isArray(_reqBody[prop])) {
      reqInfo[prop] = {
        'type': 'SS',
        'value': _reqBody[prop],
        'action': 'ADD'
      };
    } else if (!isNaN(_reqBody[prop])) {
      reqInfo[prop] = {
        'type': 'N',
        'value': _reqBody[prop],
        'action': 'PUT'
      };
    } else if (typeof _reqBody[prop] === 'string') {
      reqInfo[prop] = {
        'type': 'S',
        'value': _reqBody[prop],
        'action': 'PUT'
      };
    } else {
      reqInfo[prop] = {
        'type': 'S',
        'value': JSON.stringify(_reqBody[prop]),
        'action': 'PUT'
      };
    }
  };

  versiondb.update(key, reqInfo, done);
};

exports.query = function(_key, _options, done) {
  versiondb.query(_key, _options, done);
}

exports.delete = function(_key, done) {
  var key = {
    'key': {'type':'S', 'value': _key.key},
    'version': {'type':'S', 'value': _key.version}
  };
    
  versiondb.delete(key, done);
}

exports.scan = function(_options, done) {
  versiondb.scan(_options, done);
}
