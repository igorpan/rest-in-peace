var Q = require('q');

var Serializer = function (Resource) {

    this.resource = Resource;

};

Serializer.prototype.deserialize = function (response) {
    var metaAttr = this.resource.config.metaAttribute;
    var meta = metaAttr && response[metaAttr] ? response[metaAttr] : null;
    if (this.resource.config.dataAttribute) {
        response = response[this.resource.config.dataAttribute];
    }

    var promises = [];
    if (Array.isArray(response)) {
        for (var i = 0; i < response.length; i++) {
            promises.push(this._instantiateResource(response[i]));
        }
        return Q.all(promises).then(function (instances) {
            if (meta) {
                instances.meta = meta;
            }
            return this.resource.eventRegistry.trigger('decorate_collection', [instances]);
        }.bind(this));
    } else {
        return this._instantiateResource(response);
    }

};

Serializer.prototype.serialize = function (instance) {

    var attrs = instance.$attrs();
    return this.resource.eventRegistry.trigger('serialize', [instance, attrs]).then(function () {
        return attrs;
    });

};

Serializer.prototype._instantiateResource = function (attrs) {

    return this.resource.eventRegistry.trigger('deserialize', [attrs]).then(function () {
        return new this.resource(attrs);
    }.bind(this));

};

module.exports = Serializer;
