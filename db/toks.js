/*
 * db/articles.js
 * AUTHOR : beryh
 * DATE : 2014. 3. 6
 * TOKS DATABASE MODEL
*/

var utils = require('../utils');
var tokdb = Object.create(require('./super'), {tableName: {value: 'Toks', enumerable: true}});

exports.find = function(_key, done) {
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created}
  };

  tokdb.find(key, done);
}

exports.findBatch = function(_key, done) {
  tokdb.findBatch(_key, done);
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

  tokdb.save(key, reqInfo, done);
}

exports.update = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created}
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
  
  tokdb.update(key, reqInfo, done);
};

exports.query = function(_key, _options, done) {
  tokdb.query(_key, _options, done);
}

exports.delete = function(_key, done) {
  var key = {
    'author': {'type':'S', 'value': _key.author},
    'created': {'type':'N', 'value': _key.created}
  };
  
  tokdb.delete(key, done);
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

  tokdb.update(key, reqInfo, done);
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

  tokdb.update(key, reqInfo, done);
}