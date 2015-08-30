var Q = require('q');

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


EventRegistry.prototype.trigger = function (event, args) {

    // Ensure that event exists
    this._assertEvent(event);

    var promises = [];
    // Go through every listener for this event
    this.listeners[event].forEach(function (callback) {
        // Call listener, passing the arguments given
        var promise = callback.apply(this, args);
        // If listener is asynchronous, it should return a promise,
        // add that promise to promises array
        if (promise && promise.then) {
            promises.push(promise);
        }
    });

    if (promises.length > 0) {
        return Q.all(promises);
    } else {
        return Q(args[0]);
    }
};


EventRegistry.prototype._assertEvent = function (event) {

    if (!this.listeners[event]) {
        throw 'Unknown event "' + event + '"';
    }

};


module.exports = EventRegistry;
