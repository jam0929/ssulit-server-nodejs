/*
 * db/devices.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 22
 * DEVICES DATABASE MODEL
*/

var utils = require('../utils');
var devicedb = Object.create(require('./super'), {tableName: {value: 'Devices', enumerable: true}});

exports.find = function(_key, done) {
  var key = {
    'appName': {'type':'S', 'value': _key.appName},
    'deviceId': {'type':'S', 'value': _key.deviceId}
  };

  devicedb.find(key, done);
}

exports.save = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value}}, ]
  //reqInfo [{property:{type:S/N/SS, value}}, ]
  var key = {
    'appName': {'type':'S', 'value': _key.appName},
    'deviceId': {'type':'S', 'value': _key.deviceId}
  };
  
  var reqInfo = {
    'appName': {
      'type': 'S',
      'value': _key.appName
    }, 'deviceId': {
      'type': 'S',
      'value': _key.deviceId
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
        'value': _reqBody[prop].toString()
      };
    } else if (typeof _reqBody[prop] === 'string') {
      reqInfo[prop] = {
        'type': 'S',
        'value': _reqBody[prop]
      };
    } else {
      reqInfo[prop] = {
        'type': 'S',
        'value': JSON.stringify(_reqBody[prop])
      };
    }
  };

  devicedb.save(key, reqInfo, done);
}

exports.update = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'appName': {'type':'S', 'value': _key.appName},
    'deviceId': {'type':'S', 'value': _key.deviceId}
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

  devicedb.update(key, reqInfo, done);
};

exports.delete = function(_key, done) {
  var key = {
    'appName': {'type':'S', 'value': _key.appName},
    'deviceId': {'type':'S', 'value': _key.deviceId}
  };
    
  devicedb.delete(key, done);
}

exports.query = function(_key, _options, done) {
  var key = {};
  
  for(var prop in _key) {
    var type = Array.isArray(_key[prop]) ? 'SS' : (!isNaN(_key[prop]) ? 'N' : 'S');
    var value = {};
    value[type] = _key[prop];
    
    key[prop] = {
      'AttributeValueList': [value],
      'ComparisonOperator': 'EQ'
    };
  }

  devicedb.query(key, _options, done);
}