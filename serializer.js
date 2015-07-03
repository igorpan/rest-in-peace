var Serializer = function (Resource) {

    this.resource = Resource;

};

Serializer.prototype.deserialize = function (response) {

    var metaAttr = this.resource.config.metaAttribute;
    var meta = metaAttr && response[metaAttr] ? response[metaAttr] : null;
    if (this.resource.config.dataAttribute) {
        response = response[this.resource.config.dataAttribute];
    }

    if (Array.isArray(response)) {
        var instances = [];
        for (var i = 0; i < response.length; i++) {
            instances.push(this._instantiateResource(response[i]));
        }
        if (meta) {
            instances.meta = meta;
        }
        return instances;
    } else {
        var resource = this._instantiateResource(response);
        if (meta) {
            resource.$meta = meta;
        }
        return resource;
    }

};

Serializer.prototype.serialize = function (instance) {

    var attrs = instance.$attrs();
    this.resource.eventRegistry.trigger('serialize', attrs);

    return attrs;

};

Serializer.prototype._instantiateResource = function (attrs) {

    this.resource.eventRegistry.trigger('deserialize', attrs);

    return new this.resource(attrs);

};

module.exports = Serializer;