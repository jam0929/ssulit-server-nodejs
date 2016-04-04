/*
 * db/articles.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 20
 * SSULS DATABASE MODEL
*/

var utils = require('../utils');
var ssuldb = Object.create(require('./super'), {tableName: {value: 'Ssuls', enumerable: true}});

exports.find = function(_key, done) {
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created}
  };

  key.channel = _key.channel;
  ssuldb.find(key, done);
}

exports.findBatch = function(_key, done) {
  ssuldb.findBatch(_key, done);
}

exports.save = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value}}, ]
  //reqInfo [{property:{type:S/N/SS, value}}, ]
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created}
  };
    
  var reqInfo = {
    'author': {
      'type': 'S',
      'value': _key.author
    },
    'created': {
      'type': 'N',
      'value': _key.created.toString()
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

  key.channel = _key.channel;
  ssuldb.save(key, reqInfo, done);
}

exports.update = function(_key, _reqBody, done) {
  if (!done) {
    done = function(err, info) {};
  }
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created.toString()}
  };
  
  if (_key.expected) {
    key.expected = true;
  }
  
  var reqInfo = {};
  if (_reqBody.ReturnValues) {
    reqInfo.ReturnValues = _reqBody.ReturnValues;
    delete _reqBody.ReturnValues;
  }
  
  for (prop in _reqBody) {
    if (prop === 'Expected') continue;
    if (Array.isArray(_reqBody[prop])) {
      var action = 'ADD';
      switch(prop[0]) {
        case '-':
          action = 'DELETE';
          break;
        case '=':
          action = 'PUT';
          break;
      }
      
      reqInfo[(action === 'ADD') ? prop : prop.substring(1)] = {
        'type': 'SS',
        'value':  _reqBody[prop],
        'action': action
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
  
  key.channel = _key.channel;
  ssuldb.update(key, reqInfo, done);
};

exports.query = function(_key, _options, done) {
  ssuldb.query(_key, _options, done);
}

exports.delete = function(_key, done) {
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created}
  };
  
  key.channel = _key.channel;
  ssuldb.delete(key, done);
}

exports.addLike = function(board, id, uid, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'board': {'type':'S', 'value': board},
    'id': {'type':'S', 'value': id}
  };
  
  var reqInfo = {
    'like': {
      'type': 'SS',
      'value': [uid],
      'action': 'ADD'
    }, 'vote_count': {
      'type': 'N',
      'value': '1',
      'action': 'ADD'
    }, 'recent_vote_count': {
      'type': 'N',
      'value': '1',
      'action': 'ADD'
    }
  };

  key.channel = _key.channel;
  ssuldb.update(key, reqInfo, done);
}

exports.delLike = function(board, id, uid, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'board': {'type':'S', 'value': board},
    'id': {'type':'S', 'value': id}
  };
  
  var reqInfo = {
    'like': {
      'type': 'SS',
      'value': [uid],
      'action': 'DELETE'
    }, 'vote_count': {
      'type': 'N',
      'value': '-1',
      'action': 'ADD'
    }, 'recent_vote_count': {
      'type': 'N',
      'value': '-1',
      'action': 'ADD'
    }
  };

  key.channel = _key.channel;
  ssuldb.update(key, reqInfo, done);
}