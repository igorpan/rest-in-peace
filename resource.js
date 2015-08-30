var reqwest = require('reqwest');
var _ = require('lodash');
var Q = require('q');
var EventRegistry = require('./event-registry.js');
var Serializer = require('./serializer.js');
var SnapshotPlugin = require('./plugins/snapshot.js');
var HttpClient = require('./http-client.js');

// HELPERS

// Merge objects. Arrays inside will get concatenated.
// First argument is destination object into which all subsequent objects will be merged.
var merge = function (destination) {
    for (var i = 1; i < arguments.length; i++) {
        _.merge(destination, arguments[i], function(a, b) {
            if (_.isArray(a)) {
                return a.concat(b);
            }
        });
    }
    return destination;
};

var deserializePromise = function (serializer, promise) {

    return promise.then(function (response) {
        return serializer.deserialize(response);
    });

};

var getUrl = function (config, resource) {

    var url;
    if (_.isFunction(config.url)) {
        url = config.url(resource);
    } else {
        url = config.url;
        if (resource && resource.$id()) {
            url += '/' + resource.$id();
        }
    }
    return (config.prefix || '') + url + (config.suffix || '');

};

// RESOURCE

function Resource() {}

Resource.prototype.$get = function (query) {
    return deserializePromise(this.$config.serializer, this.$request('get', this.$url(), query)).then(function (refreshed) {
        this.$attrs(refreshed.attrs());
        this.$eventRegistry.trigger('get', [this]);
        return this;
    }.bind(this));
};

Resource.prototype.$delete =
Resource.prototype.$remove =
Resource.prototype.$destroy = function () {
    return this.$request('delete', this.$url()).then(function (result) {
        this.$eventRegistry.trigger('delete', [this]);
        return this.$config.serializer.deserialize(result);
    }.bind(this));
};

Resource.prototype.$isPersisted = function () {
	return !!this.$id();
};
Resource.prototype.$save = function () {
    var method = this.$isPersisted() ? this.$config.updateMethod.toLowerCase() : 'post';
    var deferred = Q.defer();

    this.$config.serializer.serialize(this).then(function (attrs) {
        return deserializePromise(
            this.$config.serializer,
            this.$request(method, this.$url(), attrs)
        ).then(function (saved) {
            this.$attrs(saved.$attrs());
            this.$eventRegistry.trigger('save', [this]);

            deferred.resolve(this);
        }.bind(this))
        .catch(function (reason) {
            deferred.reject(reason);
        });
    }.bind(this));

    return deferred.promise;
};

Resource.prototype.$attrs = function (attrs) {
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
        return _.cloneDeep(attrs);
    }
};

Resource.prototype.$url = function () {
    return getUrl(this.$config, this);
};

Resource.prototype.$id = function () {
    return this[this.$config.idAttribute] || null;
};

Resource.prototype.$request = function () {
    return this.$httpClient.request.apply(this.$httpClient, arguments);
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

        this.$eventRegistry.trigger('initialize', [this]);
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
        'post_request',
        'decorate_collection'
    ]);
    resource.eventRegistry.import(config.on);
    resource.httpClient = new HttpClient();
    resource.httpClient.on('pre_request', function (requestData) {
        resource.eventRegistry.trigger('pre_request', [requestData]);
    });
    resource.httpClient.on('post_request', function () {
        resource.eventRegistry.trigger('post_request', []);
    });

    resource.url = function () {
        return getUrl(config);
    };

    resource.query = function (query) {
        return deserializePromise(config.serializer, resource.httpClient.request('get', this.url(), query)).then(function (instances) {
            resource.eventRegistry.trigger('query', [instances]);
            return instances;
        });
    };

    resource.get = function (id, query) {
        var url = this.url();
        // Id can be null if resource is singleton
        if (id) {
            url += '/' + id;
        }
        return deserializePromise(config.serializer, resource.httpClient.request('get', url, query)).then(function (instance) {
            resource.eventRegistry.trigger('get', [instance]);
            return instance;
        });
    };

    resource.on = function () {
        return resource.eventRegistry.on.apply(resource.eventRegistry, arguments);
    };

    resource.request = function () {
        return resource.httpClient.request.apply(resource.httpClient, arguments);
    };

    resource.deserialize = function (data) {
        return resource.config.serializer.deserialize(data);
    };

    return resource;
};

var defaultConfig = {

    url: null,

    idAttribute: 'id',

    updateMethod: 'PATCH',

    on: {},

    dataAttribute: null,

    metaAttribute: null,

    plugins: [SnapshotPlugin]

};

var resourceFactory = function (config) {
    config = merge({}, defaultConfig, resourceFactory._config, config);
    if (!config.url) {
        throw 'url option must be defined';
    }
    var resource = createResource(config);
    config.serializer = config.serializer || new Serializer(resource);

    // Prototype of each resource is an empty object
    // which has ResourcePrototype as it's own prototype
    // So chain looks like this:  PlayerResource <-- PlayerResourcePrototype <-- ResourcePrototype
    // Reason for this is so that adding "instance" methods to Player would only involve attaching
    // them to PlayerResourcePrototype (PlayerResource.prototype.$doSomething = function () { //... };)
    // This way, it won't affect other resources as base ResourcePrototype stays unchanged
    resource.prototype = Object.create(Resource.prototype);

    // Apply plugins to resource
    config.plugins.forEach(function (plugin) {
        plugin(resource);
    });

    return resource;
};

resourceFactory.config = function (config) {
    resourceFactory._config = merge(resourceFactory._config, config);
};

resourceFactory._config = {

    prefix: '',

    suffix: ''

};

module.exports = resourceFactory;
