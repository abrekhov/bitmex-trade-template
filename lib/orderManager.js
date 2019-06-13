const orderManager = function(context){
    this.context = context
}

orderManager.prototype.getContext = function(){
    return this.context
}

module.exports = orderManager

