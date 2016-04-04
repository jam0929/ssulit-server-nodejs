/*
 * db/users.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * USER DATABASE MODEL
*/

var utils = require('../utils');
var userdb = Object.create(require('./super'), {tableName: {value: 'Users', enumerable: true}});

exports.find = function(_id, done) {
  var key = {
    'id': {'type':'S', 'value': _id}
  };

  userdb.find(key, done);
}

exports.findUserByEmail = function(email, done) {
  var dynamodb = new global.aws.DynamoDB();
  var key = {
    'type':'S', 'value': email
  };
  var info = {
    'TableName': 'Users'
  };
  info['KeyConditions'] = {
    'email': {
      'AttributeValueList': [{'S': email}],
      'ComparisonOperator': 'EQ'
    }
  };
  info['IndexName'] = 'email-index';
  
  dynamodb.query(info, function cbQuery(err, data) {
    if (err) {
      return done(err.message, null);
    }
    var result = {};
    if (data.Count !== 1) {
      return done(null, null);
    }
    if (data.Items) {
      for (var i = 0; i < data.Items.length; i++) {
        for (prop in data.Items[i]) {
          result[prop] = data.Items[i][prop]['S'] ? data.Items[i][prop]['S'] : (data.Items[i][prop]['SS'] ? data.Items[i][prop]['SS'] : data.Items[i][prop]['N']);
        }
      }
    }

    return done(null, result);
  });
}

exports.findUserByNickname = function(nickname, done) {
  var dynamodb = new global.aws.DynamoDB();
  var key = {
    'type':'S', 'value': nickname
  };
  var info = {
    'TableName': 'Users'
  };
  info['KeyConditions'] = {
    'nickname': {
      'AttributeValueList': [{'S': nickname}],
      'ComparisonOperator': 'EQ'
    }
  };
  info['IndexName'] = 'nickname-index';
  
  dynamodb.query(info, function cbQuery(err, data) {
    if (err) {
      return done(err.message, null);
    }
    var result = {};
    if (data.Count !== 1) {
      return done('invalid nickname');
    }
    if (data.Items) {
      for (var i = 0; i < data.Items.length; i++) {
        for (prop in data.Items[i]) {
          result[prop] = data.Items[i][prop]['S'] ? data.Items[i][prop]['S'] : (data.Items[i][prop]['SS'] ? data.Items[i][prop]['SS'] : data.Items[i][prop]['N']);
        }
      }
    }

    return done(null, result);
  });
}

exports.reg = function(_key, _reqBody, done) {
    //key [{property:{type:S/N/SS, value}}, ]
  //reqInfo [{property:{type:S/N/SS, value}}, ]
  var key = {
    'id': {'type':'S', 'value': _key.id}
  };
    
  var reqInfo = {
    'id': {
      'type': 'S',
      'value': _key.id
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

  userdb.save(key, reqInfo, done);
}

exports.regist = function(_key, _reqBody, done) {
  var dynamodb = new global.aws.DynamoDB();
  
  function registUser() {
    var info = {
      'TableName': 'Users'
    };
    var reqInfo = {};
    
    info['Expected'] = {'id': {'Exists': false}};
    
    for (var prop in _key) {
      reqInfo[prop] = {'S': _key[prop]};
    }
  
    if (_reqBody['password']) {
      _reqBody['password'] = crypto.createHash('md5').update(_reqBody['password']).digest("hex");
    }
    
    for (prop in _reqBody) {
      if (Array.isArray(_reqBody[prop])) {
        reqInfo[prop] = {
          'SS': _reqBody[prop]
        };
      } else if (!isNaN(_reqBody[prop])) {
        reqInfo[prop] = {
          'N': typeof _reqBody[prop] != 'boolean' ? _reqBody[prop].toString() : (_reqBody[prop] ? '1' : '0')
        };
      } else if (typeof _reqBody[prop] === 'string') {
        reqInfo[prop] = {
          'S': _reqBody[prop]
        };
      } else {
        reqInfo[prop] = {
          'S': JSON.stringify(_reqBody[prop])
        };
      }
    }
    
    info['Item'] = reqInfo;

    dynamodb.putItem(info, function cbPutItem(err, data) {
      if (err) {
        return done(err.message, null);
      }    
      var result = {};
      for (prop in info['Item']) {
        result[prop] = info['Item'][prop]['S'] ? info['Item'][prop]['S'] : (info['Item'][prop]['SS'] ? info['Item'][prop]['SS'] : info['Item'][prop]['N']);
      }
      return done(null, result);
    });
  }
  
  function chkEmail() {
    var info = {
      'TableName': 'Users'
    };
    
    info['KeyConditions'] = {
      'email': { 'AttributeValueList': [{'S': _key.email}], 'ComparisonOperator': 'EQ' }
    };
  
    info['Select'] = 'COUNT';
    info['IndexName'] = 'email-index';
    
    dynamodb.query(info, function cbQueryDB(err, data) {
      if (err) {
        return done(err.message, null);
      }
      
      if (data.Count > 0) {
        return done('already exists', null);
      }
      
      return registUser();
    });
  }
  
  if (_key.nickname) {
    var info = {
      'TableName': 'Users'
    };
    
    info['KeyConditions'] = {
      'nickname': { 'AttributeValueList': [{'S': _key.nickname}], 'ComparisonOperator': 'EQ' }
    };
  
    info['Select'] = 'COUNT';
    info['IndexName'] = 'nickname-index';
    
    dynamodb.query(info, function cbQueryDB(err, data) {
      if (err) {
        return done(err.message, null);
      }
      
      if (data.Count > 0) {
        return done('already exists', null);
      }
      
      return chkEmail();
    });
  } else {
    chkEmail();
  }
}

exports.save = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value}}, ]
  //reqInfo [{property:{type:S/N/SS, value}}, ]
  var key = {};
  var reqInfo = {};
  
  for (var prop in _key) {
    key[prop] = {'type':'S', 'value':_key[prop]};
    reqInfo[prop] = {'type':'S', 'value':_key[prop]};
  }

  if (_reqBody['password']) {
    _reqBody['password'] = crypto.createHash('md5').update(_reqBody['password']).digest("hex");
  }
  
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
    } else {
      reqInfo[prop] = {
        'type': 'S',
        'value': JSON.stringify(_reqBody[prop])
      };
    }
  };

  userdb.save(key, reqInfo, done);
}

exports.update = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'id': {'type':'S', 'value': _key.id}
  };
  
  var reqInfo = {};
  for (prop in _reqBody) {
    if (prop === 'Expected') continue;
    if (Array.isArray(_reqBody[prop])) {
      reqInfo[prop] = {
        'type': 'SS',
        'value': _reqBody[prop],
        'action': 'ADD'
      };
    } else if (!isNaN(_reqBody[prop])) {
      if (_reqBody[prop].match && _reqBody[prop].match(/[+-](\d+)$/)) {
        reqInfo[prop] = {
          'type': 'N',
          'value': _reqBody[prop],
          'action': 'ADD'
        };
      }
      else {
        reqInfo[prop] = {
          'type': 'N',
          'value': typeof _reqBody[prop] != 'boolean' ? _reqBody[prop].toString() : (_reqBody[prop] ? '1' : '0'),
          'action': 'PUT'
        };
      }
    } else if (typeof _reqBody[prop] === 'string') {
      reqInfo[prop] = {
        'type': 'S',
        'value': _reqBody[prop],
        'action': _reqBody[prop].length > 0 ? 'PUT' : 'DELETE'
      };
    } else {
      reqInfo[prop] = {
        'type': 'S',
        'value': JSON.stringify(_reqBody[prop]),
        'action': _reqBody[prop].length > 0 ? 'PUT' : 'DELETE'
      };
    }
  };
  
  userdb.update(key, reqInfo, done);
};