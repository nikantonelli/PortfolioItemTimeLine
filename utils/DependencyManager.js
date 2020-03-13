Ext.define('Niks.Apps.DependencyManager', {

    mixins: {
        observable: 'Ext.util.Observable'
    },

    canvas: undefined,
    nodeTree: undefined,
    rowHeight: undefined,

    constructor: function(config) {
        this.mixins.observable.constructor.call(this, config);
        this.canvas = config.canvas;
    },

    setVisibility: function( method){
        var me = this;
        switch(method) {
            case 0: {
                me.canvas.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                break;
            }
            case 1: {
                me.canvas.selectAll('.dependencyGroup').attr('visibility', 'visible');
                break;
            }
            case 2: {
                //Turn them all off and then turn on the ones you want
                me.canvas.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                // We need to filter on the type of the node, not the SVG group
                me.nodeTree.each( function(d) {
                    if ((d.data.record.data._type.startsWith('portfolioitem/')) &&
                        (d.data.record.data.PortfolioItemType.Ordinal === 0)) {
                            var dDeps = me.canvas.selectAll('[class~=dependencyGroup]').filter(function() {
                                return this.getAttribute('id').startsWith('dep' + d.data.Name);
                            });
                            dDeps.each( function () {
                                this.setAttribute('visibility', 'visible');
                            });
                        }
                });
                break;
            }
            case 3: {
                //Turn them all off and then turn on the ones you want
                me.canvas.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                // We need to filter on the type of the node, not the SVG group
                me.nodeTree.each( function(d) {
                    if (d.data.record.data._type.toLowerCase() === 'hierarchicalrequirement') {
                            var dDeps = me.canvas.selectAll('[class~=dependencyGroup]').filter(function() {
                                return this.getAttribute('id').startsWith('dep' + d.data.Name);
                            });
                            dDeps.each( function () {
                                this.setAttribute('visibility', 'visible');
                            });
                        }
                });
                break;
            }
            case 4: {
                //Turn them all off and then turn on the ones you want
                me.canvas.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                // We need to filter on the type of the node, not the SVG group
                me.nodeTree.each( function(d) {
                    if (d.data.record.data._type.startsWith('portfolioitem/')) {
                            var dDeps = me.canvas.selectAll('[class~=dependencyGroup]').filter(function() {
                                return this.getAttribute('id').startsWith('dep' + d.data.Name);
                            });
                            dDeps.each( function () {
                                this.setAttribute('visibility', 'visible');
                            });
                        }
                });
                break;
            }

        }
    },

    moveNode: function(node) {

        /** The node might have successor or predecessor dot and/or line
         * 
         */
    },

    initialiseNodes: function(nodetree) {
        var me = this;
        me.nodeTree = nodetree;
        nodetree.each(function(d) {
            //Now add the dependencies lines
            if (!d.data.record.data.ObjectID) { return; }
            var deps = d.data.record.get('Successors');
            if (deps && deps.Count) {
                me._getSuccessors(d.data.record).then (
                    {
                        success: function(succs) {
                            d.dependencies = succs;
                            //Draw a circle on the end of the first one and make it flash if I can't find the other end one
                            _.each(succs, function(succ) {
                                var e = me._findTreeNode(me._getNodeTreeRecordId(succ));
                                var targetName = 'Unknown';
                                var zClass = '';
                                if (!e) { 
                                    zClass += 'textBlink';
                                } else {
                                    targetName = e.data.Name;
                                    if (gApp._sequenceError( d, e)) {
                                        zClass += (zClass.length?' ':'') + 'data--errors';
                                    }
                                    else {
                                        zClass += (zClass.length?' ':'') + 'no--errors';
                                    }    
                                }
                                var pathGroup = me.canvas.select('#dep'+ d.data.Name +'-'+ targetName);
                                if (pathGroup) {
                                    pathGroup.remove();
                                }
                                pathGroup = me.canvas.append('g')
                                    .attr('id', 'dep'+ d.data.Name +'-'+ targetName)
                                    .attr('visibility', 'hidden')
                                    .attr('class', zClass + ' dependencyGroup');

                                //Stuff without end point
                                var txf = { translate: [0,0]};
                                var source = d3.select('#group-'+d.data.Name);
                                if (source) {
                                    txf = gApp._parseTransform(source.attr('transform'));
                                }

                                /** If we get the group as the item relative to the this.canvas, then we can't get the visible width
                                 * we get given the bounding box of everything including those not shown because of the clipPath.
                                 * Get a different object to get the shown width.
                                 **/
                                var box = d3.select ('#rect-'+d.data.Name);
                                var x0 = +txf.translate[0] + box.node().getBBox().width;  //Start at the end of the box
                                var y0 = +txf.translate[1] + me.rowHeight/2; //In the middle of the row
                                pathGroup.append('circle')
                                    .attr('cx', x0)
                                    .attr('cy', y0)
                                    .attr('r', 3)
                                    .attr('id', 'circle-'+d.data.Name+'-start')
                                    .on('mouseover', function(a, idx, arr) {    //'a' refers to the wrong thing!
                                        this._createDepsPopover(d, arr[idx], 1);})    //Default to successors
                                    .attr('class', zClass);

                                if (e) {
                                    //Stuff that needs endpoint
                                    var target = d3.select('#group-'+ targetName);
                                    txf = gApp._parseTransform(target.attr('transform'));

                                    var x1 = +txf.translate[0];
                                    var y1 = +txf.translate[1] + me.rowHeight/2 ;

                                    pathGroup.append('circle')
                                        .attr('cx', x1)
                                        .attr('cy', y1)
                                        .attr('r', 3)
                                        .attr('id', 'circle-'+targetName+'-end')
                                        .on('mouseover', function(a, idx, arr) { me._createDepsPopover(e, arr[idx], 0);})    //Default to successors
                                        .attr('class', zClass);
                        
                                    zClass += (zClass.length?' ':'') + 'dashed' + (d.data.record.data._type.toLowerCase().includes('portfolioitem/')?(d.data.record.get('PortfolioItemType').Ordinal + 1).toString(): '0');
                                    
                                    pathGroup.append('path')
                                        .attr('d', 
                                            'M' + x0 + ',' + y0 + 
                                            'C' + (x0+80) + ',' + y0  +
                                            ' ' + (x1-80) + ',' + y1 +
                                            ' ' + x1 + ',' + y1) 
                                        .attr('class', zClass);   
                                }
                            });
                        }
                    }
                );
            }
        });
    },

    _getSuccessors: function(record) {

        var deferred = Ext.create('Deft.Deferred');
        var config = {
            fetch: true,
            callback: function(records,operation, success) {
                if (success) {
                    deferred.resolve(records);
                } else {
                    deferred.reject();
                }
            }
        };
        record.getCollection('Successors').load(config);
        return deferred.promise;
    },

    _createDepsPopover: function(node, circ, tabOverride) {
        //Create a zero size container right where the blob is and attach the 
        //popover to that
        var panel = Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record,
                target: circ,
                autoShow: false,
                showChevron: false,
                listeners: {
                    show: function() {
                        var activeTab = (node.data.record.get('PredecessorsAndSuccessors').Predecessors === 0) &&
                                        (node.data.record.get('PredecessorsAndSuccessors').Successors > 0);
                        panel._getTabPanel().setActiveTab((tabOverride !== undefined)?tabOverride:(activeTab?1:0));
                        panel.el.setLeftTop (    parseInt(circ.getBBox().x + circ.getBBox().width + me.rowHeight), 
                                                parseInt(circ.getBBox().y + (me.rowHeight/2))
                        );
                    }
                }
            }
        );         
        panel.show();
    },
});