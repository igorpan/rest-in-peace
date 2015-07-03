function EventRegistry(events) {

    this.listeners = {};
    events.forEach(function (event) {
        this.listeners[event] = [];
    }.bind(this));

}


EventRegistry.prototype.on = function (event, callback) {

    this._assertEvent(event);
    this.listeners[event].push(callback);

};


EventRegistry.prototype.import = function (callbacks) {

    for (var event in callbacks) {
        if (callbacks.hasOwnProperty(event)) {
            var eventCallbacks = callbacks[event];
            if (!Array.isArray(eventCallbacks)) {
                eventCallbacks = [eventCallbacks];
            }
            eventCallbacks.forEach(function (callback) {
                this.on(event, callback);
            }.bind(this));
        }
    }

};


EventRegistry.prototype.trigger = function (event) {

    this._assertEvent(event);
    var args = [];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    this.listeners[event].forEach(function (callback) {
        callback.apply(this, args);
    });

};


EventRegistry.prototype._assertEvent = function (event) {

    if (!this.listeners[event]) {
        throw 'Unknown event "' + event + '"';
    }

};


module.exports = EventRegistry;