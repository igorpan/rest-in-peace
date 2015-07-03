var reqwest = require('reqwest');
var EventRegistry = require('./event-registry.js');
var querystring = require('querystring');
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

    this._eventRegistry.trigger('pre_request', requestData);

    // Initiate request and return a promise

    var deferred = Q.defer();

    reqwest(requestData)
        .then(function (result) {
            this._eventRegistry.trigger('post_request');
            deferred.resolve(result);
        }.bind(this))
        .catch(function (response) {
            deferred.reject(response);
        });

    return deferred.promise;

};

module.exports = Client;