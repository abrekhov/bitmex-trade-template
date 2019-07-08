const crypto    = require('crypto')
const request   = require('request')
const qs        = require('querystring')

var apiKey = require('../bitmexkeys_test').id  //"API_KEY";
var apiSecret = require('../bitmexkeys_test').secret //"API_SECRET";

const requestApi = {
  apiKey: apiKey,
  apiSecret: apiSecret
}

console.log(apiKey, apiSecret)


// WS Authentitication
requestApi.wsAuth = function(socket){
  if(typeof(socket)===undefined) return console.error('No Socket')
  var expires = new Date().getTime()+5
  var signature = crypto.createHmac('sha256', this.apiSecret).update('GET/realtime' + expires).digest('hex')
  var sendObj = {
    op: 'authKeyExpires',
    args: [ this.apiKey, expires, signature]
  }
  socket.send(JSON.stringify(sendObj))
}

// SEND HTTP REQUEST
requestApi.send = function(verb, method, data){
  return new Promise( (resolve, reject) =>{  
    console.log('Data:', data)
    var path = '/api/v1/' + method,
      expires = Math.round(new Date().getTime() / 1000) + 1 // 1 sec in the future

    if(verb === 'GET') {path = path + '?' + qs.stringify(data)}
    if(typeof(data)==='string') data = JSON.parse(data)
    if(typeof(data)!=='object') return console.error('REST send exited: data not a object')
          

    // Pre-compute the postBody so we can be sure that we're using *exactly* the same body in the request
    // and in the signature. If you don't do this, you might get differently-sorted keys and blow the signature.
    var postBody = JSON.stringify(data)

    var signature = crypto.createHmac('sha256', apiSecret).update(verb + path + expires + postBody).digest('hex')

    var headers = {
      'content-type' : 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      // This example uses the 'expires' scheme. You can also use the 'nonce' scheme. See
      // https://www.bitmex.com/app/apiKeysUsage for more details.
      'api-expires': expires,
      'api-key': apiKey,
      'api-signature': signature
    }

    const requestOptions = {
      headers: headers,
      //url:'https://www.bitmex.com'+path,
      url:'https://testnet.bitmex.com'+path,
      method: verb,
      body: postBody
    }

    request(requestOptions, function(error, response, body) {
      if (error) { reject(error) }
      resolve(JSON.parse(body))
    })
  } )

}


module.exports = requestApi
