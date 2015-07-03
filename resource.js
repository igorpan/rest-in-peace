var reqwest = require('reqwest');
var extend = require('extendify')();
var querystring = require('querystring');
var EventRegistry = require('./event-registry.js');
var Serializer = require('./serializer.js');
var SnapshotPlugin = require('./plugins/snapshot.js');
var HttpClient = require('./http-client.js');

var deserializePromise = function (serializer, promise) {

    return promise.then(function (response) {
        return serializer.deserialize(response);
    });

};

var createResourcePrototype = function () {
    var ResourceInstance = {};

    ResourceInstance.$get = function () {
        return deserializePromise(this.$config.serializer, this.$httpClient.request('get', this.$url())).then(function (refreshed) {
            this.$attrs(refreshed.attrs());
            this.$eventRegistry.trigger('get', this);
            return this;
        }.bind(this));
    };

    ResourceInstance.$delete =
    ResourceInstance.$remove =
    ResourceInstance.$destroy = function () {
        return this.$httpClient.request('delete', this.$url()).then(function () {
            this.$eventRegistry.trigger('delete', this);
            return this;
        }.bind(this));
    };

    ResourceInstance.$save = function () {
        var method = this.$id() ? this.$config.updateMethod.toLowerCase() : 'post';
        return deserializePromise(
            this.$config.serializer,
            this.$httpClient.request(method, this.$url(), this.$config.serializer.serialize(this))
        ).then(function (saved) {
            this.$attrs(saved.$attrs());
            this.$eventRegistry.trigger('save', this);
            this.$snapshots.length = 0;
            return this;
        }.bind(this));
    };

    ResourceInstance.$attrs = function (attrs) {
        if (attrs) {
            // Setter
            for (var prop in attrs) {
                if (attrs.hasOwnProperty(prop)) {
                    this[prop] = attrs[prop];
                }
            }
        } else {
            // Getter
            attrs = {};
            for (var prop in this) {
                if (this.hasOwnProperty(prop) && 0 !== prop.indexOf('$')) {
                    attrs[prop] = this[prop];
                }
            }
            return JSON.parse(JSON.stringify(attrs));
        }
    };

    ResourceInstance.$url = function () {
        var url = this.$config.url;
        if (this.$id()) {
            url += '/' + this.$id();
        }
        return url;
    };

    ResourceInstance.$id = function () {
        return this[this.$config.idAttribute] || null;
    };

    return ResourceInstance;
};


var createResource = function (config) {
    var resource = function (attrs) {
        this.$config = config;
        this.$eventRegistry = resource.eventRegistry;
        this.$httpClient = resource.httpClient;

        for (var prop in attrs) {
            if (attrs.hasOwnProperty(prop)) {
                this[prop] = attrs[prop];
            }
        }

        this.$eventRegistry.trigger('initialize', this);
    };

    resource.config = config;
    resource.eventRegistry = new EventRegistry([
        'initialize',
        'save',
        'query',
        'delete',
        'get',
        'serialize',
        'deserialize',
        'pre_request',
        'post_request'
    ]);
    resource.eventRegistry.import(config.on);
    resource.httpClient = new HttpClient();
    resource.httpClient.on('pre_request', function (requestData) {
        resource.eventRegistry.trigger('pre_request', requestData);
    });
    resource.httpClient.on('post_request', function () {
        resource.eventRegistry.trigger('post_request');
    });

    resource.query = function (query) {
        return deserializePromise(config.serializer, resource.httpClient.request('get', config.url, query)).then(function (instances) {
            resource.eventRegistry.trigger('query', instances);
            return instances;
        });
    };

    resource.get = function (id) {
        var url = config.url;
        // Id can be null if resource is singleton
        if (id) {
            url += '/' + id;
        }
        return deserializePromise(config.serializer, resource.httpClient.request('get', url, null)).then(function (instance) {
            resource.eventRegistry.trigger('get', instance);
            return instance;
        });
    };

    return resource;
};

var defaultConfig = {

    url: null,

    prefix: '',

    suffix: '',

    idAttribute: 'id',

    updateMethod: 'PATCH',

    on: {},

    dataAttribute: null,

    metaAttribute: null,

    plugins: [SnapshotPlugin]

};

var resourceFactory = function (config) {
    config = extend({}, defaultConfig, resourceFactory._config, config);
    if (!config.url) {
        throw 'url option must be defined';
    }
    if (config.prefix && config.prefix !== '') {
        config.url = config.prefix + config.url;
    }
    var resource = createResource(config);
    config.serializer = config.serializer || new Serializer(resource);
    resource.prototype = createResourcePrototype(resource);
    config.plugins.forEach(function (plugin) {
        plugin(resource);
    });
    return resource;
};

resourceFactory.config = function (config) {
    resourceFactory._config = extend(resourceFactory._config, config);
};

resourceFactory._config = {};

module.exports = resourceFactory;
