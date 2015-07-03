var SnapshotPlugin = function (Resource) {

    Resource.prototype.$snapshot = function () {
        this.$snapshots.push(this.$attrs());
    };

    Resource.prototype.$rollback = function () {
        if (this.$snapshots.length > 0) {
            this.$attrs(this.$snapshots.pop());
        }
    };

    Resource.prototype.$snapshots = [];

};

module.exports = SnapshotPlugin;