const ra = require('./requestApi')

//Class to handle messages from websocket of bitmex
const stratHandler = function(){
    this.context = {};
    this.orders = {} ;
    this.strategies = {
        execution: async function(context){
            console.log('Execution initialized...')
            try{
                var order   = context.data[0]
                if(order.ordStatus!=='Filled'||order.triggered!==''||order.cumQty===0) return
                var side = (order.side==='Buy')?'Sell':'Buy'
                var points  = 20
                var percent = 0.003
                var trailOffset     = order.price*percent
                trailOffset         = (side==='Sell') ? -1*trailOffset : trailOffset
                trailOffset         = Math.round(trailOffset)
                var orderQty        = order.orderQty
                var price           = (side==='Sell') ? order.price+10 : order.price-10
                var stopResult  = await ra.send('POST', 'order', {symbol:order.symbol, ordType:'Stop', execInst:'LastPrice', orderQty:orderQty, side:side, pegOffsetValue:trailOffset, pegPriceType: 'TrailingStopPeg' })
                var takeLimitResult  = await ra.send('POST', 'order', {symbol:order.symbol, ordType:'Limit', orderQty:orderQty, side:side, price:price})
                this.orders = stopResult

                return console.log('StopResult:', stopResult)
            }
            catch(e){ console.error(e) }
        }
    };
    this.symPoints = {'XBTUSD':100, 'ETHUSD':5};
}
stratHandler.prototype.init = function(context){
    if(typeof(context)!=='object') return console.error('Context is not object!') 
    this.context = context
    console.log('Initializing stat Handler...')
    if(Object.keys.length<1){
        console.log('No orders defined')
        console.log('Orders:', this.orders)
    }
    return this
}
stratHandler.prototype.setStrategy = function(){
    console.log('Setting strategy...')//' context:', this.context)
    if(this.context===undefined) return console.error('Context is not defined! Strategy can\'t be set.')
    if(typeof(this.strategies[this.context.table])!=='function') return console.error('No function like this')
    console.log('strat Context:', this.context);
    this.strategies[this.context.table](this.context)
}
stratHandler.prototype.printOut = function(err, data){
    if(err) console.error(err);
    console.log(data);
}
    
module.exports = stratHandler
