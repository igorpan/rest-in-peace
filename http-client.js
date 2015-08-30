var reqwest = require('reqwest');
var EventRegistry = require('./event-registry.js');
var querystring = require('qs');
var Q = require('q');

var Client = function () {

    this._eventRegistry = new EventRegistry(['pre_request', 'post_request']);

};

Client.prototype.on = function (event, callback) {

    this._eventRegistry.on(event, callback);

};

Client.prototype.request = function (method, url, data, headers) {

    headers = headers || {};

    // Construct query string from data if it's a GET request
    if (method.toLowerCase() === 'get') {
        var query = querystring.stringify(data);
        if (query !== '') {
            url += '?' + query;
        }
        data = null;
    }

    var requestData = {
        url: url,
        method: method,
        data: data ? JSON.stringify(data) : null,
        type: 'json',
        contentType: 'application/json',
        headers: headers
    };

    return this._eventRegistry.trigger('pre_request', [requestData])
        .then(function () {
            return reqwest(requestData);
        })
        .then(function (data) {
            return this._eventRegistry.trigger('post_request', [data]).then(function () {
                return data;
            });
        }.bind(this))
        .then(function (data) {
            return data;
        })
    ;

};

module.exports = Client;
