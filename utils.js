/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */
exports.uid = function(len) {
  var buf = []
    , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.isEmpty = function(obj) {
  return Object.keys(obj).length === 0;
};

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
var Base64 = {
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = Base64._utf8_encode(input);

		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

		}

		return output;
	},

	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}

		}

		output = Base64._utf8_decode(output);

		return output;

	},

	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	},

	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}

		return string;
	}
}

exports.Base64 = Base64;

exports.uploadImageStream = function(uploader, bucket, key, index, stream, done) {
  var s3 = new global.aws.S3();
  var filename = uploader + '_' + key + '_' + index;
  var type = stream.match(/:(.+\/.+);/)[1];
  var regExt = type.match(/image\/([a-z]+)/);

  if (!regExt) 
    return done('not an image file');

  filename = filename + '.' + regExt[1];
  var base64Data = stream.replace(/^data:image\/.+;.+,/,"");
  var img = new Buffer(base64Data, 'base64');

  var params = {
    Bucket: bucket,
    Key: filename,
    Body: img,
    ContentType: type,
    ACL:'public-read'
  };
  
  s3.putObject(params, function (err, info) {
    if (err) {
      return done(err);
    } else {
      var result = 'http://data.jumpingnuts.com/' + filename;
      return done(err, result);
    }
  });
}

exports.uploadImage = function(uploader, bucket, key, index, file, done) {
  var s3 = new global.aws.S3();
  var bodyStream = require('fs').createReadStream(file.path);

  var filename = uploader + '_' + key + '_' + index;
  var regExt = file.headers['content-type'].match(/image\/([a-z]+)/) || file.name.match(/.+\.(.+)/);
  
  if (!regExt)
    return done('not an image file');
  
  filename = filename + '.' + regExt[1];

  var params = {
    Bucket: bucket,
    Key: filename,
    Body: bodyStream,
    ContentType: file.headers['content-type'],
    ACL:'public-read'
  };

  s3.putObject(params, function (err, info) {
    require('fs').unlink(file.path);
    if (err) {
      return done(err);
    } else {
      var result = 'http://data.jumpingnuts.com/' + filename;
      return done(err, result);
    }
  });
}

exports.deleteItem = function(bucket, url, done) {
  var key = url.match(/data\.jumpingnuts\.com\/(.+)$/i) ? url.match(/data\.jumpingnuts\.com\/(.+)$/i)[1] : null;  
  if (!key) {
    return done ? done('invalid item') : null;
  }

  var s3 = new global.aws.S3();
  var params = {
    Bucket: bucket,
    Key: key
  };
  
  s3.deleteObject(params, function(err, info) {
    if (err) {
     return done ? done(err) : null;
    } else {
      return done ? done(err, 'OK') : null;
    }
  });
}

exports.sendMsg = function(regIds, apiKey, message, url, done) {
  // SEND NOTIFICATION TO REGISTED DEVICES
  var notification = require('./common/controllers/notification');
  if (!regIds || !apiKey || !message) {
    return done ? done('bad request') : null;;
  }

  var GCM_msg = {
    collapse_key: Math.random() + '', // http://developer.android.com/guide/google/gcm/gcm.html#send-msg
    time_to_live: 180, // just 30 minutes
    data: {
      'message': message, // your payload data
    }
  };

  if (url) {
    GCM_msg.data['url'] = url;
  }
  
  for (var idx = 0; ; idx++) {
    var targetRegIds = regIds.slice(idx * 500, (idx + 1) * 500);
    if (targetRegIds.length === 0) {
      return done ? done(null, regIds.length) : null;
    }

    GCM_msg['registration_ids'] = targetRegIds;
    notification.post_gcm(GCM_msg, apiKey); 
  }
}

exports.sendMail = function(emails, subject, body) {
  var aws = require('aws-sdk');
  aws.config.loadFromPath('./config/aws.json');
  aws.config.region = 'us-east-1';

  var ses = new global.aws.SES();

  // send to list
  var to = emails;
  
  // this must relate to a verified SES account
  var from = 'nuts@jumpingnuts.com'
  
  // this sends the email
  // @todo - add HTML version
  ses.sendEmail( { 
     Source: from, 
     Destination: { ToAddresses: to },
     Message: {
         'Subject': {
            'Data': subject
         },
         'Body': {
             'Html': {
                 'Data': body
             }
          }
     }
  }
  , function(err, data) {
      console.log('Email sent:');
      console.log(data);
   });
}
