/*
 * db/articles.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 20
 * ARITLCE DATABASE MODEL
*/

var utils = require('../utils');
var articledb = Object.create(require('./super'), {tableName: {value: 'Articles', enumerable: true}});

exports.find = function(_board, _id, done) {
  var reqInfo = {
    'board': {'type':'S', 'value': _board},
    'id': {'type':'S', 'value': _id}
  };

  articledb.find(reqInfo, done);
}

exports.save = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value}}, ]
  //reqInfo [{property:{type:S/N/SS, value}}, ]
  var key = {
    'board': {'type':'S', 'value': _key.board},
    'id': {'type':'S', 'value': _key.id}
  };
  
  var reqInfo = {
    'board': {
      'type': 'S',
      'value': _key.board
    },
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

  articledb.save(key, reqInfo, done);
}

exports.update = function(_key, _reqBody, done) {
  //key [{property:{type:S/N/SS, value_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value, action:PUT/DEL/ADD}}, ]
  var key = {
    'board': {'type':'S', 'value': _key.board},
    'id': {'type':'S', 'value': _key.id}
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

  articledb.update(key, reqInfo, done);
};

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

  articledb.query(key, _options, done);
}

exports.delete = function(board, id, done) {
  var key = {
    'board': {'type':'S', 'value': board},
    'id': {'type':'S', 'value': id}
  };
    
  articledb.delete(key, done);
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

  articledb.update(key, reqInfo, done);
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

  articledb.update(key, reqInfo, done);
}