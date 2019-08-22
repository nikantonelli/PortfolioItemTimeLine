(function() {

    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     * A Rest Proxy for the Rally WSAPI Collection Endpoints
     * Extends Ext's default Rest proxy to work with our WSAPI way of doing things
     */
    Ext.define('Rally.data.wsapi.collection.Proxy', {
        extend: 'Rally.data.wsapi.Proxy',
        requires: ['Rally.data.wsapi.ProxyBase'],
        alias: ['proxy.Rally.data.WsapiCollectionProxy', 'proxy.rallywsapicollectionproxy'],
        alternateClassName: ['Rally.data.WsapiCollectionProxy'],

        mixins: {
            proxy: 'Rally.data.wsapi.ProxyBase'
        },

        urlMappings: {
            create:  'add',
            destroy: 'remove'
        },

        statics: {
            /**
             * Maximum number of artifacts that can be added/removed from a collection at a time
             * Defined by AbstractCollectionPostHandler
             */
            MAX_ARTIFACTS_PER_OPERATION: 25
        },

        constructor: function(){
            this.callParent(arguments);
        },

        /**
         * Override to add the requester for client-side metrics
         */
        buildRequest: function(operation) {
            var request = this.callParent(arguments);
            request.requester = this.requester;
            return request;
        },

        /**
         * Override to convert the URL to the correct format for WSAPI collection endpoints
         */
        buildUrl: function(request) {
            request.url = this.url;
            if(this.urlMappings[request.action]) {
                request.url += '/' + this.urlMappings[request.action];
            }
            return request.url;
        },

        /**
         * Returns the HTTP method name for a given request.
         * @param {Ext.data.Request} request The request object
         * @return {String} The HTTP method to use ('GET', 'POST', 'PUT' or 'DELETE')
         */
        getMethod: function (request) {
            if (request.action === 'read') {
                return 'GET';
            }
            return 'POST';
        },

        /**
         * Override to batch 25 artifacts per API action (create, update or delete),
         * the 25 limit is a requirement of the endpoint as implemented in AbstractCollectionPostHandler.MAX_ARTIFACTS
        */
        batch: function(options, /* deprecated */listeners) {
            var me = this,
                useBatch = me.batchActions,
                batch,
                records,
                actions, aLen, action, a;

            if (options.operations === undefined) {
                // the old-style (operations, listeners) signature was called
                // so convert to the single options argument syntax
                options = {
                    operations: options,
                    listeners: listeners
                };
            }

            if (options.batch) {
                if (Ext.isDefined(options.batch.runOperation)) {
                    batch = Ext.applyIf(options.batch, {
                        proxy: me,
                        listeners: {}
                    });
                }
            } else {
                options.batch = {
                    proxy: me,
                    listeners: options.listeners || {}
                };
            }

            if (!batch) {
                batch = new Ext.data.Batch(options.batch);
            }

            batch.on('complete', Ext.bind(me.onBatchComplete, me, [options], 0));

            actions = me.batchOrder.split(',');
            aLen = actions.length;

            var addBatch = function(record) {
                batch.add(new Ext.data.Operation({
                    action: action,
                    records: [record]
                }));
            };

            var addBatches = function(recordBatch){
                if (useBatch) {
                    batch.add(new Ext.data.Operation({
                        action: action,
                        records: recordBatch
                    }));
                } else {
                    _.each(recordBatch, addBatch);
                }
            };

            // For each action i.e. (create,update,destroy),
            for (a = 0; a < aLen; a++) {
                action = actions[a];
                records = options.operations[action];

                // Split the records into smaller batches
                var recordBatches = this._splitBatch(records);
                _.each(recordBatches, addBatches, recordBatches);
            }

            batch.start();
            return batch;
        },

        /**
         * Split the records into smaller batches so that
         * the max artifacts per operation limit is not exceeded.
         * @param [records]
         * @returns [[records], [records], [records]]
         * @private
         */
        _splitBatch: function(records) {
            var getBatchIndex = function(element, index) {
                return Math.floor(index / this.self.MAX_ARTIFACTS_PER_OPERATION);
            };
            return _.chain(records).groupBy(getBatchIndex, this).toArray().value();
        }
    });
})();