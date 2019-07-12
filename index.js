#!/usr/local/bin/node
require('dotenv').config()
const WebSocket = require('ws')
const ra        = require('./lib/requestApi')
const stdin     = process.openStdin()

const stratHandler = require('./lib/stratHandler')

const endpoints = {
  test: 'wss://testnet.bitmex.com/realtime',
  prod: 'wss://www.bitmex.com/realtime'
}

const wsClearCommands = [
  'ping',
]

var timer = ''
var socket 
var reconnectTimeout = 1000 * 2 // 2 sec
var sh = new stratHandler()

function connect(){
  socket = new WebSocket(endpoints.test)

  // CONNECTION OPENED
  socket.addEventListener('open', function () {
    console.log(new Date().toUTCString())
    pingIt()
    ra.wsAuth(socket)
        
    //Subscribes
    socket.send(JSON.stringify({ 'op':'subscribe' , 'args':[ 'position' ] }))

  })

  // ERROR HANDLER
  socket.addEventListener('error', function (event) {
    console.log(new Date().toUTCString())
    console.error(event)
  })

  // ON CLOSE
  socket.addEventListener('close', function () {
    console.log(new Date().toUTCString())
    console.log('Socket closed. Reconnecting...')
    setTimeout(connect, reconnectTimeout)
  })

  // ON MESSAGE
  socket.addEventListener('message', function(event) {
    if(event.data==='pong') return 
    try{
      var context = JSON.parse(event.data)
      if(context.table===undefined) return console.log(context)
      sh.init(context)
      sh.setStrategy()
      //console.log(stratHandler)
    }
    catch(e){ console.log(e) }
    pingIt()
  }) 

  // STDIN LISTENER
  stdin.addListener('data', function(d){
    var income_string = d.toString().trim()
    console.log(income_string)
    if(wsClearCommands.indexOf(income_string)!=-1){ return socket.send(income_string) }

    if(income_string.match(/subscribe/)!==null){
      var array = income_string.split(' ')
      var sendObj = { 'op': array.shift(), 'args': array }
      console.log(JSON.stringify(sendObj))
      if(d.toString().trim()=='ping'){
        socket.send('ping')
      }
      socket.send(JSON.stringify(sendObj))
      pingIt()
    }
  })

}

function pingIt(){
  try{
    if(typeof(timer)===undefined) return
    clearTimeout(timer)
    socket.send('ping')
    timer = setTimeout(pingIt, 5000)
  }
  catch(e){
    socket = new WebSocket(endpoints.prod)
  }
}

connect()
