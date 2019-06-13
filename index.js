#!/usr/local/bin/node
const WebSocket = require('ws')
const ra        = require('./lib/requestApi')
//const wrapper   = require('./lib/requestApi')
const stdin     = process.openStdin()

const stratHandler = require('./lib/stratHandler')
const orderManager = require('./lib/orderManager')

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
var sh = new stratHandler();

function connect(){
    socket = new WebSocket(endpoints.prod)

    // CONNECTION OPENED
    socket.addEventListener('open', function (event) {
        console.log(new Date().toUTCString());
        pingIt()
        ra.wsAuth(socket)
        
        //Subscribes
        //socket.send(JSON.stringify({ "op":"subscribe" , "args":[ "liquidation:XBTUSD" ] }))
        //socket.send(JSON.stringify({ "op":"subscribe" , "args":[ "order" ] }))
        socket.send(JSON.stringify({ "op":"subscribe" , "args":[ "execution" ] }))
        //socket.send(JSON.stringify({ "op":"subscribe" , "args":[ "tradeBin1m:XBTUSD" ] }))

        });

    // ERROR HANDLER
    socket.addEventListener('error', function (event) {
        console.log(new Date().toUTCString());
        console.error(event);
    });

    // ON CLOSE
    socket.addEventListener('close', function (event) {
        console.log(new Date().toUTCString());
        console.log('Socket closed. Reconnecting...');
        setTimeout(connect, reconnectTimeout)
    });

    // ON MESSAGE
    socket.addEventListener('message', function(event) {
        if(event.data==='pong') return ;
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
            var sendObj = { "op": array.shift(), "args": array }
            console.log(JSON.stringify(sendObj))
            if(d.toString().trim()=='ping'){
                socket.send('ping')
            }
            socket.send(JSON.stringify(sendObj))
            pingIt()
        }
        if(income_string.match(/(GET|POST|PUT|DELETE)/i)){
            var array = income_string.split(' ')
            console.log('array:', array)
            //ra.send('POST', 'order', {symbol:'XBTUSD',price:4800,orderQty:1})
            //ra.send(array.shift(), array.shift(), array.shift())
        }
    })

}

function pingIt(){
    try{
        if(typeof(timer)===undefined) return
        clearTimeout(timer)
        var time = parseInt(arguments[0]) || 5000;
        socket.send('ping')
        timer = setTimeout(pingIt, 5000)
    }
    catch(e){
        socket = new WebSocket(endpoints.prod)
    }
}

connect()
