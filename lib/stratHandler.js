const ra = require('./requestApi')

//Class to handle messages from websocket of bitmex
const stratHandler = function(){
  this.ctx = {}
  this.orders = {} 
  this.strategies = {
    execution: async function(ctx){
      console.log('Execution initialized...')
      try{
        var order   = ctx.data[0]
        if(order.ordStatus!=='Filled'||order.triggered!==''||order.cumQty===0) return
        var side = (order.side==='Buy')?'Sell':'Buy'
        var percent = 0.003
        var trailOffset   = order.price*percent
        trailOffset     = (side==='Sell') ? -1*trailOffset : trailOffset
        trailOffset     = Math.round(trailOffset)
        var orderQty    = order.orderQty
        var price       = (side==='Sell') ? order.price+10 : order.price-10
        var stopResult  = await ra.send('POST', 'order', {
          symbol:order.symbol, 
          ordType:'Stop', 
          execInst:'LastPrice', 
          orderQty:orderQty, 
          side:side, 
          pegOffsetValue:trailOffset, 
          pegPriceType: 'TrailingStopPeg' 
        })
        var takeLimitResult  = await ra.send('POST', 'order', {
          symbol:order.symbol, 
          ordType:'Limit', 
          orderQty:orderQty, 
          side:side, 
          price:price
        })
        this.orders = stopResult

        console.log('StopResult:', stopResult)
        console.log('takeLimitResult:', takeLimitResult)
      }
      catch(e){ console.error(e) }
    },
    position: async function(ctx){
      try{
        if(ctx.data[0]===undefined) return 
        ctx.data.forEach(async (value, index)=>{
          if(value.isOpen===true){
            await this.setLimitAndStop(this.ctx, value)
          }
          else if(value.isOpen===false){
            await this.cancelAll(value.symbol)
          }
        })
      }
      catch(e){ console.log(e) }

    }
  }
  this.symPoints = {'XBTUSD':100, 'ETHUSD':5}
}
stratHandler.prototype.init = function(ctx){
  if(typeof(ctx)!=='object') return console.error('Context is not object!') 
  this.ctx = ctx
  //console.log('Initializing stat Handler...')
  if(Object.keys.length<1){
    console.log('No orders defined')
    console.log('Orders:', this.orders)
  }
  return this
}
stratHandler.prototype.setStrategy = function(){
  if(this.ctx===undefined) return console.error('Context is not defined! Strategy can\'t be set.')
  if(typeof(this.strategies[this.ctx.table])!=='function') return console.error('No function like this')
  console.log('Setting strategy: ',this.ctx.table)
  console.log("Context:", this.ctx)
  this.strategies[this.ctx.table](this.ctx)
}
stratHandler.prototype.printOut = function(err, data){
  if(err) console.error(err)
}
stratHandler.prototype.setLimitAndStop = async function(value){
  try{
    let side = (value.currentQty<0)?'Buy':'Sell'
    let currentQty  = Math.abs(value.currentQty)
    let avgEntryPrice  = value.avgEntryPrice
    let trailOffset = Math.round(avgEntryPrice * 0.003)
    if(side==='Sell'){
      trailOffset *= -1
    }
    let limitPrice = (side==='Sell') ? value.avgEntryPrice+10 : value.avgEntryPrice-10
    var stopResult  = await ra.send('POST', 'order', {
      symbol:value.symbol, 
      ordType:'Stop', 
      execInst:'LastPrice', 
      orderQty:currentQty, 
      pegOffsetValue:trailOffset, 
      pegPriceType: 'TrailingStopPeg', 
      side:side
    })
    var limitResult  = await ra.send('POST', 'order', {
      symbol:value.symbol, 
      ordType:'Limit', 
      orderQty:currentQty, 
      price:limitPrice,
      side:side  
    })
    console.log('Stop result:', stopResult)
    console.log('Limit result:', limitResult)
  }
  catch(e){ console.error(e) }
} 
stratHandler.prototype.cancelAll = async function(symbol){
  var stopResult  = await ra.send('DELETE', 'order/all', {
    symbol:symbol
  })
} 
  
module.exports = stratHandler
