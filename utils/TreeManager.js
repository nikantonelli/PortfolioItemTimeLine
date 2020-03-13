Ext.define('Niks.Apps.treeManager', {

    nodeTree: undefined,
    typeStore: undefined,

    constructor: function(config) {
        if (!config.typeStore) {
            throw new Error('treeManager needs a typeStore in config');
        }
        this.typeStore = config.typeStore;
    },

    initialise: function(nodes) {
        this.nodeTree = this._stratify(nodes);
        this.sum();
    },

    _stratify: function(nodes) {
        var me = this;

        return d3.stratify()
        .id( function(d) {
            var retval = (d.record && me._getNodeTreeRecordId(d.record)) || null; //No record is an error in the code, try to barf somewhere if that is the case
            return retval;
        })
        .parentId( function(d) {
            var pParent = me._findParentNode(nodes, d);
            return (pParent && pParent.record && me._getNodeTreeRecordId(pParent.record)); })
        (nodes);
    },

    getValue: function() {
        return (this.nodeTree?this.nodeTree.value:1);
    },

    /** Basic d3 sum function for now
     * 
     */
    sum: function() {
        this.nodeTree.each( function(d) { d.value = 0;});
        return this.nodeTree.sum(function(d) { return 1;}); 
    },

    getTree: function() {
        return this.nodeTree;
    },

    findNode: function(record) {
        return this._findTreeNode(this._getNodeTreeRecordId(record))
    },

    _getNodeTreeId: function(d) {
        return d.id;
    },

    _findTreeNode: function(id) {
        var retval = null;
        gApp._nodeTree.each( function(d) {
            if (gApp._getNodeTreeId(d) === id) {
                retval = d;
            }
        });
        return retval;
    },

    _findNode: function(nodes, recordData) {
        var returnNode = null;
            _.each(nodes, function(node) {
                if (node.record && (node.record.data._ref === recordData._ref)){
                     returnNode = node;
                }
            });
        return returnNode;
    },

    _findNodeById: function(nodes, id) {
        return _.find(nodes, function(node) {
            return node.record.data._ref === id;
        });
    },
 
    _getNodeTreeRecordId: function(record) {
        return record.data._ref.split('/').pop();
    },
    
    _findParentType: function(record) {
        //The only source of truth for the hierachy of types is the typeStore using 'Ordinal'
        var ord = null;
        for ( var i = 0;  i < this.typeStore.totalCount; i++ )
        {
            if (record.data._type === this.typeStore.data.items[i].get('TypePath').toLowerCase()) {
                ord = this.typeStore.data.items[i].get('Ordinal');
                break;
            }
        }
        ord += 1;   //We want the next one up, if beyond the list, set type to root
        //If we fail this, then this code is wrong!
        if ( i >= this.typeStore.totalCount) {
            return null;
        }
        var typeRecord =  _.find(  this.typeStore.data.items, function(type) { return type.get('Ordinal') === ord;});
        return (typeRecord && typeRecord.get('TypePath').toLowerCase());
    },

    _findParentNode: function(nodes, child){
        if (child.record.data._ref === 'root') return null;

        //We need to locate based on the type of artefact passed in.
        var parent = null;
        
        if (child.record.data._type.toLowerCase().includes('portfolioitem/')) {
            parent = child.record.data.Parent;
        }
        else if (child.record.data._type.toLowerCase() === 'hierarchicalrequirement') {
            parent = child.record.data.PortfolioItem;
        }
        else if (child.record.data._type.toLowerCase() === 'defect') {
            parent = child.record.data.Requirement;
        }

        var pParent = null;
        if (parent ){
            //Check if parent already in the node list. If so, make this one a child of that one
            //Will return a parent, or null if not found
            pParent = this._findNode(nodes, parent);
        }
        else {
            //Here, there is no parent set, so attach to the 'null' parent.
            var pt = this._findParentType(child.record);
            //If we are at the top, we will allow d3 to make a root node by returning null
            //If we have a parent type, we will try to return the null parent for this type.
            if (pt) {
                var parentName = '/' + pt + '/null';
                pParent = this._findNodeById(nodes, parentName);
            }
        }
        //If the record is a type at the top level, then we must return something to indicate 'root'
        return pParent?pParent: this._findNodeById(nodes, 'root');
    },
})