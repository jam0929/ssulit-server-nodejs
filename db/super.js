/*
 * db/super.js
 * AUTHOR : beryh
 * DATE : 2014. 2. 13
 * SUPER CLASS FOR HANDLING DYNAMODB
 */

var _super = {
  // this.tableName (string)
  TableName: this.tableName
};

_super.find = function(key, done) {
  //key [{property:{type:S/N/SS, value:_value}}, ]
  var dynamodb = new global.aws.DynamoDB();
  var info = {
    'TableName': this.tableName
  };
  
  if (key.channel) {
    info.TableName = info.TableName + '_' + key.channel;
  }
  
  delete key.channel;
  
  info['Key'] = {};
  for (prop in key) {
    var tmp = {};
    tmp[key[prop].type] = key[prop].value;
    
    info['Key'][prop] = tmp;
  }

  dynamodb.getItem(info, function cbFindDB(err, data) {
    if (err) {
      return done(err.message, null);
    }

    var result = {};
    if (data.Item) {
      for (prop in data.Item) {
        result[prop] = data.Item[prop]['S'] ? data.Item[prop]['S'] : (data.Item[prop]['SS'] ? data.Item[prop]['SS'] : data.Item[prop]['N']);
      }
    } else {
      result = null;
    }

    return done(null, result);
  });
}

_super.findBatch = function(_key, done) {
  var dynamodb = new global.aws.DynamoDB();
  var info = {
    'RequestItems': {}
  };
  
  for (var i = 0; i < _key.length; i++) {
    for (var prop in _key[i]) {
      info['RequestItems'][prop] = _key[i][prop];
    }
  }
  
  dynamodb.batchGetItem(info, function cbFindbatch(err, data) {
    if (err) {
      return done(err.message, null);
    }

    var resources = data.Responses;
    var result = {};
    
    for (var table in resources) {
      result[table] = [];

      for (idx in resources[table]) {
        var tmp = resources[table][idx];
        var temp = {};
        for (prop in tmp) {
          temp[prop] = tmp[prop]['S'] ? tmp[prop]['S'] : (tmp[prop]['SS'] ? tmp[prop]['SS'] : tmp[prop]['N']); 
        }
        
        result[table].push(temp);
      }
    }

    return done(null, result);
  });  
}

_super.save = function(key, reqInfo, done) {
  //key [{property:{type:S/N/SS, value:_value}}, ]
  //reqInfo [{property:{type:S/N/SS, value:_value}}, ]
  //ex> {key:{type:S, value:'abc'}}
  //ex> {clients:{type:SS, value:['myclient']}}
  var dynamodb = new global.aws.DynamoDB();
  var info = {
    'TableName': this.tableName
  };
  
  if (key.channel) {
    info.TableName = info.TableName + '_' + key.channel;
  }
  
  delete key.channel;

  info['Item'] = {};
  for (prop in reqInfo) {
    info['Item'][prop] = {};
    info['Item'][prop][reqInfo[prop].type] = reqInfo[prop].value;
  }
  
  // check duplication
  info['Expected'] = {};
  
  for (prop in key) {
    info['Expected'][prop] = {'Exists': false};
  }
  
  dynamodb.putItem(info, function cbPutDB(err, data) {
    if (err && err.code === 'ConditionalCheckFailedException') {
      return done ? done('already registered', null) : null;
    } else if (err) {
      return done ? done(err.message, null) : null;
    }

    var result = {};
    for (prop in info['Item']) {
      result[prop] = info['Item'][prop]['S'] ? info['Item'][prop]['S'] : (info['Item'][prop]['SS'] ? info['Item'][prop]['SS'] : info['Item'][prop]['N']);
    }
    
    return done ? done(null, result) : null;
  }); 
}

_super.update = function(key, reqInfo, done) {
  var dynamodb = new global.aws.DynamoDB();
  var info = {
    'TableName': this.tableName
  };
  
  if (key.channel) {
    info.TableName = info.TableName + '_' + key.channel;
  }

  delete key.channel;

  if (key.expected) {
    info['Expected'] = {};
    delete key.expected;
    
    for (var prop in key) {
      var tmp = {};
      tmp[key[prop].type] = key[prop].value;
      
      info['Expected'][prop] = {
        'Exists': true,
        'Value': tmp
      }
    }
  }
  
  info['Key'] = {};
  for (var prop in key) {
    info.Key[prop] = {};
    info.Key[prop][key[prop].type] = key[prop].value;
  }
  
  info['AttributeUpdates'] = {};
  var returnValues = done ? (reqInfo.ReturnValues ? reqInfo.ReturnValues : 'ALL_NEW') : 'NONE';
  delete reqInfo.ReturnValues;
  
  for(var prop in reqInfo) {
    var tmp = {};
    tmp[reqInfo[prop].type] = reqInfo[prop].value;

    info.AttributeUpdates[prop] = {
      'Action': reqInfo[prop].action
    };
    
    if (reqInfo[prop].action !== 'DELETE') {
      info.AttributeUpdates[prop].Value = tmp;
    }
  }

  info['ReturnValues'] = returnValues;
  dynamodb.updateItem(info, function cbUpdateDB(err, data) {
    if (err) {
      return done ? done(err.message, null) : null;
    }

    var result = {};
    if (data.Attributes) {
      for (prop in data.Attributes) {
        result[prop] = data.Attributes[prop]['S'] ? data.Attributes[prop]['S'] : (data.Attributes[prop]['SS'] ? data.Attributes[prop]['SS'] : data.Attributes[prop]['N']);
      }
    } else {
      result = null;
    }

    if (done) {
      return done(null, result);
    }
  });
}

_super.query = function(key, options, done) {
  var dynamodb = new global.aws.DynamoDB();

  var info = {
    'TableName': this.tableName
  };
  
  if (key.channel) {
    info.TableName = info.TableName + '_' + key.channel;
  }
  
  delete key.channel;
  
  info['KeyConditions'] = key;
  
  var origin = options.origin ? true : false;
  delete options.origin;
  
  for(var prop in options) {
    info[prop] = options[prop];
  }

  dynamodb.query(info, function cbQueryDB(err, data) {
    if (err) {
      return done(err.message, null);
    }
    
    if (origin) {
      return done(null, data);
    }
    
    var result = {
      'data': []
    };
    
    result['LastEvaluatedKey'] = data.LastEvaluatedKey;
    
    if (data.Items) {
      for (var i = 0; i < data.Items.length; i++) {
        var ret = {};
        for (prop in data.Items[i]) {
          ret[prop] = data.Items[i][prop]['S'] ? data.Items[i][prop]['S'] : (data.Items[i][prop]['SS'] ? data.Items[i][prop]['SS'] : data.Items[i][prop]['N']);
        }
        result.data.push(ret);
      }
    }
    return done(null, result);
  });
}

_super.scan = function(options, done) {
  var dynamodb = new global.aws.DynamoDB();

  var info = {
    'TableName': this.tableName
  };
  
  if (key.channel) {
    info.TableName = info.TableName + '_' + key.channel;
  }
  
  delete key.channel;
  
  for(var prop in options) {
    info[prop] = options[prop];
  }

  dynamodb.scan(info, function cbScanDB(err, data) {
    if (err) {
      return done(err.message, null);
    }
    
    var result = {
      'data': []
    };
    
    result['LastEvaluatedKey'] = data.LastEvaluatedKey;

    if (data.Items) {
      for (var i = 0; i < data.Items.length; i++) {
        var ret = {};
        for (prop in data.Items[i]) {
          ret[prop] = data.Items[i][prop]['S'] ? data.Items[i][prop]['S'] : (data.Items[i][prop]['SS'] ? data.Items[i][prop]['SS'] : data.Items[i][prop]['N']);
        }
        result.data.push(ret);
      }
    }

    return done(null, result);
  });
}

_super.delete = function(key, done) {
  var dynamodb = new global.aws.DynamoDB();

  var info = {
    'TableName': this.tableName
  };
  
  if (key.channel) {
    info.TableName = info.TableName + '_' + key.channel;
  }
  
  delete key.channel;
  
  info['Key'] = {};
  for (prop in key) {
    var tmp = {};
    tmp[key[prop].type] = key[prop].value;
    
    info['Key'][prop] = tmp;
  }

  info['ReturnValues'] = 'ALL_OLD';

  dynamodb.deleteItem(info, function cbDeleteDB(err, data) {
    if (err) {
      return done ? done(err.message, null) : null;
    }
    var result = {};
    if (data) {
      for (prop in data.Attributes) {
        result[prop] = data.Attributes[prop]['S'] ? data.Attributes[prop]['S'] : (data.Attributes[prop]['SS'] ? data.Attributes[prop]['SS'] : data.Attributes[prop]['N']);
      }
    } else {
      result = null;
    }
    return done ? done(null, result) : null;
  });
}

module.exports = _super;
