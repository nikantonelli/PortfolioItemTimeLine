(function () {
    var Ext = window.Ext4 || window.Ext;

Ext.define('Nik.apps.PortfolioItemTimeline.app', {
    extend: 'Rally.app.TimeboxScopedApp',
    settingsScope: 'project',
    componentCls: 'app',
    config: {
        tlAfter: 182,  //Half a year approx
        tlBack:   30, //How many days before today.
        defaultSettings: {
            showTimeLine: true,
            hideArchived: true,
            showFilter: true,
            allowMultiSelect: false,
            onlyDependencies: false,
            oneTypeOnly: false,
            startDate: Ext.Date.subtract(new Date(), Ext.Date.DAY, 30),
            endDate: Ext.Date.add(new Date(), Ext.Date.DAY, 150),
            lineSize: 20,
            lowestDependencies: true,
            cardHover: true
        }
    },

    //"Nobody needs more than 640Kb...... or ten colours....."
    colours: ['#f2f0f7','#dadaeb','#bcbddc','#9e9ac8','#756bb1','#54278f'],
    //['#e0ecf4','#9ebcda','#8856a7','#7a0177','#c51b8a','#f768a1'],
    //['#edf8fb','#bfd3e6','#9ebcda','#8c96c6','#8856a7','#810f7c'],
    //['#edf8fb','#bfd3e6','#9ebcda','#8c96c6','#8856a7','#810f7c','#7a0177','#c51b8a','#f768a1','#fcc5c0','#feebe2'],

    getSettingsFields: function() {
        var returned = [
        {
            name: 'showTimeLine',
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show dates at top',
            labelAlign: 'top'
        },
        {
            name: 'hideArchived',
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Hide Archived',
            labelAlign: 'top'
        },
        {
            name: 'allowMultiSelect',
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Enable multiple start items (Note: Page Reload required if you change value)',
            labelAlign: 'top'
        },
        {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show Advanced filter',
            name: 'showFilter',
            labelAlign: 'top'
        },
        {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Only items with dependencies',
            name: 'onlyDependencies',
            labelAlign: 'top'
        },
        {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Only Feature dependencies',
            name: 'lowestDependencies',
            labelAlign: 'top'
        },
        {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show one type only',
            name: 'oneTypeOnly',
            labelAlign: 'top'
        },
        {
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Allow card pop-up on hover',
            name: 'cardHover',
            labelAlign: 'top'
        },{
            xtype: 'rallydatefield',
            fieldLabel: 'Start Date',
            name: 'startDate',
            labelAlign: 'top'
        },{
            xtype: 'rallydatefield',
            fieldLabel: 'End Date',
            name: 'endDate',
            labelAlign: 'top'
        },
        {
            xtype: 'rallynumberfield',
            fieldLabel: 'Grid bar width',
            name: 'lineSize',
            minValue: 15,
            labelAlign: 'top'
        }
        
        ];
        return returned;
    },
    _changedItems: [],

    itemId: 'rallyApp',
        MIN_COLUMN_WIDTH:   200,        //Looks silly on less than this
        LOAD_STORE_MAX_RECORDS: 100, //Can blow up the Rally.data.wsapi.filter.Or
        WARN_STORE_MAX_RECORDS: 300, //Can be slow if you fetch too many
        _rowHeight: 100,               //Leave space for "World view" text
        STORE_FETCH_FIELD_LIST:
            [
                'Name',
                'FormattedID',
                'Parent',
                'DragAndDropRank',
                'Children',
                'ObjectID',
                'Project',
                'DisplayColor',
                'Owner',
                'Blocked',
                'BlockedReason',
                'Ready',
                'Tags',
                'Workspace',
                'RevisionHistory',
                'CreationDate',
                'PercentDoneByStoryCount',
                'PercentDoneByStoryPlanEstimate',
                'PredecessorsAndSuccessors',
                'State',
                'PreliminaryEstimate',
                'Description',
                'Notes',
                'Predecessors',
                'Successors',
                'OrderIndex',   //Used to get the State field order index
                'PortfolioItemType',
                'Ordinal',
                'Release',
                'Iteration',
                'Milestones',
                //Customer specific after here. Delete as appropriate
                // 'c_ProjectIDOBN',
                // 'c_QRWP',
                // 'c_ProgressUpdate',
                // 'c_RAIDSeverityCriticality',
                // 'c_RISKProbabilityLevel',
                // 'c_RAIDRequestStatus'   
            ],
        CARD_DISPLAY_FIELD_LIST:
            [
                'Name',
                'Owner',
                'PreliminaryEstimate',
                'Parent',
                'Project',
                'PercentDoneByStoryCount',
                'PercentDoneByStoryPlanEstimate',
                'PlannedStartDate',
                'PlannedEndDate',
                'State',
                //Customer specific after here. Delete as appropriate
                // 'c_ProjectIDOBN',
                // 'c_QRWP'

            ],

    items: [
        {  
            xtype: 'container',
            itemId: 'filterBox'
        },{
            xtype: 'container',
            itemId: 'rootSurface',
            margin: '5 15 5 5',
            layout: 'auto',
            width: '100%',
            title: 'Loading...',
            autoEl: {
                tag: 'svg'
            },
            listeners: {
                afterrender:  function() {  gApp = this.up('#rallyApp'); gApp._onElementValid(this);},
            },
            visible: false
        }
    ],

    timer: null,
    
    _resetTimer: function(callFunc) {
        if ( gApp.timer) { clearTimeout(gApp.timer);}
        gApp.timer = setTimeout(callFunc, 2000);    //Debounce user selections to the tune of two seconds
    },

    //Set the SVG area to the surface we have provided
    _setSVGSize: function(surface) {
        var svg = d3.select('svg');
        svg.attr('width', surface.getEl().dom.clientWidth);
        svg.attr('height',surface.getEl().dom.clientHeight);
    },
    _nodeTree: null,

    //Continuation point after selectors ready/changed
    _enterMainApp: function() {
        if (gApp._nodes.length === 0 ) { return; }  //Timer can fire before we have done anything
        gApp._rowHeight = gApp.getSetting('lineSize') || 20;
        //Get all the nodes and the "Unknown" parent virtual nodes
        var nodetree = gApp._createNodeTree(gApp._nodes);
        var svg = d3.select('svg');
        svg.attr('height', gApp._rowHeight * (nodetree.value + ( gApp.getSetting('showTimeLine')?1:0)));
        //Make surface the size available in the viewport (minus the selectors and margins)
        var rs = this.down('#rootSurface');
        rs.getEl().setHeight(svg.attr('height'));
        svg.attr('width', rs.getEl().getWidth());
        svg.attr('class', 'rootSurface');
        gApp._startTreeAgain();
    },

    _switchChildren: function(d,idx,arr) {
        if ( d.children) {
            d._children = d.children;
            d.children = null;
            d._value = d.value;
            d.value = 1;
        } else {
            d.children = d._children;
            d._children = null;    
            d.value = d._value;
            d._value = 1;
        }
        gApp._zoomedStart();
    },

    _initialiseScale: function() {

       var timebegin = new Date(gApp.getSetting('startDate')) || Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.tlBack);
       var timeend =  new Date(gApp.getSetting('endDate')) || Ext.Date.add(new Date(), Ext.Date.DAY, gApp.tlAfter);
        gApp._setTimeScaler(timebegin,timeend);
    },

    _setTimeScaler: function(timebegin, timeend){
        gApp.dateScaler = d3.scaleTime()
            .domain([
                timebegin, timeend
            ])
            .range([0, parseInt(d3.select('svg').attr('width'))- (gApp._rowHeight + 10)]);
    },

    _setAxis: function() {
        if (gApp.gX) { gApp.gX.remove(); }
        var svg = d3.select('svg');
        var width = +svg.attr('width');
        var height = +svg.attr('height');
        gApp.xAxis = d3.axisBottom(gApp.dateScaler)
            .ticks(( (width -gApp._rowHeight)+ 2)/80)
            .tickSize(height)
            .tickPadding(gApp.getSetting('showTimeLine')? (8 - height):0);
        gApp.gX  = d3.select('svg').append('g');
        gApp.gX.attr('transform', 'translate(' + gApp._rowHeight + ',0)')
            .attr('id','axisBox')
            .attr('width', width - (gApp._rowHeight + 10))
            .attr('height', height)
            .attr("class", 'axis')
            .call(gApp.xAxis);    
    },

    _setZoomer: function() {
        var svg = d3.select('svg');
        gApp.zoom = d3.zoom()
            .on("zoom",gApp._zoomed);
        svg.call(gApp.zoom);
    },

    _zoomed: function() {

        var maxDate = new Date("1 Jan 1970");
        var minDate = new Date("31 Dec 2999");  //I'll be dead by then!
        gApp.gX.call(gApp.xAxis.scale(d3.event.transform.rescaleX(gApp.dateScaler)));
        var data = gApp.gX.selectAll('g');
        data.each( function(d) {
            if (d > maxDate) { maxDate = d;}
            if (d < minDate) { minDate = d;}
        });
        gApp._setTimeScaler(minDate, maxDate);
        gApp._zoomedStart();
    },

    _zoomedStart: function() {
        gApp._removeSVGTree();
        gApp._addSVGTree();
        gApp._refreshTree();
    },
    _rescaledStart: function() {
        gApp._setAxis();
        gApp._zoomedStart();
    },
    _startTreeAgain: function()
    {
        gApp._initialiseScale();
        gApp._rescaledStart();
    },

    _indexTree: function(nodetree) {
        nodetree.eachBefore(function(d) {
            d.rheight = d.x1 - d.x0;
            d.rpos = d.x0 - (d.parent?d.parent.x0:0); //Deal with root node
        });
    },

    _setTimeline: function(d) {
        gApp._setTimeScaler(
            new Date(d.data.record.get('PlannedStartDate')),
            new Date(d.data.record.get('PlannedEndDate'))
        );
        gApp._rescaledStart();
    },

    _dragEnd: function(d, idx, arr) {
        //Now we have finished dragging, set up our initial x again
        d.data.record.set('PlannedStartDate', d.dragStart);
        d.data.record.set('PlannedEndDate', d.dragEnd);
        // Add/update this record in the array of changes
        _.remove(gApp._changedItems, function( item ) {
            return d.data.record.get('FormattedID') === item.get('FormattedID');
        });
        gApp._changedItems.push(d.data.record);
        if (gApp.down('#saveRecords')) { gApp.down('#saveRecords').enable(); }
        if (gApp.down('#dropRecords')) { gApp.down('#dropRecords').enable(); }
        gApp._zoomedStart();
    },

//     _dragDrag: function(d, idx, arr) {
//         //The 'this' is a group, so we want to move it with a 'translate'
//         debugger;
// //        this.setAttribute('x', +this.getAttribute('x') + d3.event.dx);
//     },

    _dragStart: function(d, idx, arr) {
        //Disable popups, hovers and cards?
        if (d.data.card) { 
            d.data.card.destroy();
            d.data.card = null;
        }
        d.dragInitStart = d3.event.x;        
    },

    _dragged: function(d,idx,arr) {
        d.dragStart = 
            Ext.Date.add( new Date( d.data.record.get('PlannedStartDate')), Ext.Date.MILLI,
            gApp.dateScaler.invert(d3.event.x) - gApp.dateScaler.invert(d.dragInitStart));
            
        d.dragEnd =
            Ext.Date.add( new Date( d.data.record.get('PlannedEndDate')), Ext.Date.MILLI,
            gApp.dateScaler.invert(d3.event.x) - gApp.dateScaler.invert(d.dragInitStart));
        var rClass = 'clickable draggable' + ((d.children || d._children)?' children':'');
        if (gApp._checkSchedule(d, d.dragStart, d.dragEnd)) {
            rClass += ' data--errors';
        }
        arr[idx].setAttribute('class', rClass);
        arr[idx].setAttribute('transform', gApp._setGroupTranslate(d, d.dragStart, d.dragEnd));
        //Whilst we drag, we need to keep the ones 'off the end' to the right size
        arr[idx].getElementsByClassName('dragTarget')[0].setAttribute('width', d.drawnWidth);
    },

    _getSVGHeight: function() {
        return parseInt(d3.select('svg').attr('height')) - (gApp.getSetting('showTimeLine')?gApp._rowHeight:0);
    },

    _itemMenu: function(d) {
        Rally.nav.Manager.edit(d.data.record);
    },

    _getGroupClass: function(d) {
        var rClass = 'clickable draggable' + ((d.children || d._children)?' children':'');
        if (gApp._checkSchedule(d)) {
            rClass += ' data--errors';
        }
        return rClass;
    },

    _initGroupTranslate: function(d) {
        d.startX = new Date(d.data.record.get('PlannedStartDate'));
        d.endX = new Date(d.data.record.get('PlannedEndDate'));

    },

    _setGroupTranslate: function(d, start, end){
        var svgHeight = gApp._getSVGHeight();
        var x = gApp.dateScaler(start);
        var e = gApp.dateScaler(end);
        d.drawnX = (x<0?0:x);
        d.drawnY = ((d.x0 * svgHeight) + (d.depth*gApp._rowHeight));
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth<0?0:d.drawnWidth;
        var retval =  "translate(" + d.drawnX + "," + d.drawnY + ")";
        return retval;
    },
    
    _refreshTree: function(){

        var svgWidth = parseInt(d3.select('svg').attr('width')) - gApp._rowHeight;
        var nodetree = gApp._nodeTree;

        var partition = d3.partition();

        nodetree = partition(nodetree);
        gApp._indexTree(nodetree);
        
        //When we come here and the "oneTypeOnly flag is set, we will have a 'root' node with no data
        //We need to ignore this and not draw anything", so we use 'filter' to remove
        
        //Let's scale to the dateline
        var node = d3.select('#zoomTree').selectAll(".node")
            .data(nodetree.descendants())
            .enter().filter(
                function(d) {
                    if (d.id === "root") { return false; }
                    return true;
                }
            ).append("g")
                .attr('class', gApp._getGroupClass)
                .attr('id', function(d) { return 'group-' + d.data.Name;})
                .attr( 'transform', function(d) {
                    gApp._initGroupTranslate(d);
                    var gt = gApp._setGroupTranslate(d, d.startX, d.endX);
                    //Store for later use after we have calculated it
                    d.iX = d.x;
                    d.iE = d.e;
                    return gt;
                })
                .call(d3.drag()
                    .filter( function() { return (d3.event.target.nodeName !== 'text');})
                    .on('drag', gApp._dragged)
                    .on('end', gApp._dragEnd)
                    .on('start', gApp._dragStart)
                );

        var drags = node.append('rect')
            .attr('rx', gApp._rowHeight/2)
            .attr('ry', gApp._rowHeight/2)
            .attr('width', function(d) { return d.drawnWidth; })
            .attr('height',gApp._rowHeight)
            .attr('fill', function(d) { return gApp.colours[d.depth+1]; })
            .attr('opacity', 0.5)
            .attr('class',  'clickable dragTarget')
            .on('mouseover', function(d, idx, arr) { gApp._nodeMouseOver(d, idx, arr);})
            .on('mouseout', function(d, idx, arr) { gApp._nodeMouseOut(d, idx, arr);})

            .attr('id', function(d) { return 'rect-'+d.data.Name;})
        ;
        //Add clipPath here
        var cp = node.append('clipPath')
            .attr('id', function(d) { return 'clipPath-'+d.data.Name;});

        cp.append('rect')
            //Allow a little thing you can hover over, or show the whole text
            //if the bar is missing completely
            .attr('width', function(d) { return (d.drawnWidth>10)?d.drawnWidth:svgWidth; })
            .attr('height',gApp._rowHeight)
            .attr('class', 'arrowbox');

        node.append('text')
            .attr('y', gApp._rowHeight/2)  //Should follow point size of font
            .attr('x', gApp._rowHeight/2)
            .attr('alignment-baseline', 'central')
            .text('V')
            .attr('class', function(d) {
                var lClass = 'icon-gear app-menu';
                if ( !d.data.record.get('PlannedStartDate') || !d.data.record.get('PlannedEndDate')){
                    lClass += ' error';
                }
                return lClass;
            })
            .on('click',function(d) { gApp._itemMenu(d);});

        node.append('text')
            .attr('clip-path', function(d) { return 'url(#clipPath-'+d.data.Name + ')';})
            .attr('id', function(d) { return 'text-'+d.data.Name;})
            //We are going to put a gear menu in the front
            .attr('x', gApp._rowHeight+15)
            .attr('y', gApp._rowHeight/2)  //Should follow point size of font
            .attr('class', 'clickable normalText')
            .attr('editable', 'none')
            .attr('alignment-baseline', 'central')
            .attr('style', 'font-size:' + (gApp._rowHeight-8))
            .on('click', function(d, idx, arr) {
                //Browsers get confused over the shift key (think it's 'selectAll')
                if (d3.event.altKey) {
                    gApp._dataPanel(d,idx,arr);
                } else {
                    gApp._setTimeline(d);
                }
            })
            .text(function(d) { return d.data.record.get('FormattedID') + ": " + d.data.record.get('Name');});
            
        // gApp.drag = d3.drag()
        //     .on('end', gApp._dragEnd)
        //     .on('start', gApp._dragStart)
        //     .on('drag', gApp._dragDrag)
        //     .container(function() { return this; });
        // drags.call(gApp.drag);

        var childrenNode = d3.selectAll('.children').append('text')
            .attr('x', function(d) { return -(gApp._rowHeight + d.drawnX);})   //Leave space for up/down arrow
            .attr('y', gApp._rowHeight/2)
            .attr('class', 'icon-gear app-menu')                    
            .attr('alignment-baseline', 'central')
            .text(function(d) { return d.children?'9':'8';})
            .on('click', function(d, idx, arr) { gApp._switchChildren(d, idx, arr);});


        nodetree.each(function(d) {
            //Now add the dependencies lines
            if (!d.data.record.data.ObjectID) { return; }
            var deps = d.data.record.get('Successors');
            if (deps && deps.Count) {
                gApp._getSuccessors(d.data.record).then (
                    {
                        success: function(succs) {
                            //Draw a circle on the end of the first one and make it flash if I can't find the end one
                            _.each(succs, function(succ) {
                                var e = gApp._findTreeNode(gApp._getNodeTreeRecordId(succ));
                                var zClass = '';
                                var zoomTree = d3.select('#zoomTree');
                                //Stuff without end point
                                var source = d3.select('#rect-'+d.data.Name);
                                var x0 = source.node().getCTM().e + source.node().getBBox().width - gApp._rowHeight;
                                var y0 = source.node().getCTM().f - gApp._rowHeight/2;

                                if (!e) { 
                                    zClass += 'textBlink';
                                } else {
                                    if (gApp._sequenceError( d, e)) {
                                        zClass += (zClass.length?' ':'') + 'data--errors';
                                    }
                                    else {
                                        zClass += (zClass.length?' ':'') + 'no--errors';
                                    }    
                                }

                                if (zoomTree.select('#circle-'+d.data.Name).empty()) {
                                    zoomTree.append('circle')
                                        .attr('cx', x0)
                                        .attr('cy', y0)
                                        .attr('r', 3)
                                        .attr('id', 'circle-'+d.data.Name)
                                        .on('mouseover', function(a, idx, arr) {    //'a' refers to the wrong thing!
                                            gApp._createDepsPopover(d, arr[idx], 1);})    //Default to successors
                                        .attr('class', zClass);
                                }

                                if (!e) {
                                    return;
                                }
                                //Stuff that needs endpoint
                                var target = d3.select('#rect-'+e.data.Name);
                                var x1 = target.node().getCTM().e - gApp._rowHeight;
                                var y1 = target.node().getCTM().f - (gApp._rowHeight/2);

                                zoomTree.append('circle')
                                    .attr('cx', x1)
                                    .attr('cy', y1)
                                    .attr('r', 3)
                                    .on('mouseover', function(a, idx, arr) { gApp._createDepsPopover(e, arr[idx], 0);})    //Default to successors
                                    .attr('class', zClass);
                                
                                zClass += (zClass.length?' ':'') + 'dashed' + d.data.record.get('PortfolioItemType').Ordinal.toString();
                                
                                if (    gApp.getSetting('oneTypeOnly') ||  
                                       !gApp.getSetting('lowestDependencies') || 
                                        d.data.record.get('PortfolioItemType').Ordinal === 0
                                ) {
                                    zoomTree.append('path')
                                        .attr('d', 
                                            'M' + x0 + ',' + y0 + 
                                            'C' + (x0+150) + ',' + (y0 + (y1-y0)/8)  +
                                            ' ' + (x1-150) + ',' + (y1 - (y1-y0)/8) +
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
                        panel.el.setLeftTop (    parseInt(circ.getBBox().x + circ.getBBox().width + gApp._rowHeight), 
                                                parseInt(circ.getBBox().y + (gApp._rowHeight/2))
                        );
                    }
                }
            }
        );         
        panel.show();
    },

    _checkSchedule: function(d, start, end ) {
        if ( !d.parent || !d.parent.data.record.data.ObjectID ) { return false; }  //Top level item doesn't have a parent
        var childStart = (start === undefined)? d.data.record.get('PlannedStartDate') : start;
        var childEnd = (end === undefined)? d.data.record.get('PlannedEndDate') : end;
        return (childEnd > d.parent.data.record.get('PlannedEndDate')) ||
            (childStart < d.parent.data.record.get('PlannedStartDate'));
    },

    _sequenceError: function(a, b) {
        return (a.data.record.get('PlannedEndDate') > b.data.record.get('PlannedStartDate')) ;
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
    
    _nodeMouseOut: function(node, index,array){
        if (node.data.card) node.data.card.hide();
    },

    _nodeMouseOver: function(node,index,array) {
        if (!(node.data.record.data.ObjectID)) {
            //Only exists on real items, so do something for the 'unknown' item
            return;
        } else {

            if ( !node.data.card) {
                var card = Ext.create('Rally.ui.cardboard.Card', {
                    'record': node.data.record,
                    fields: gApp.CARD_DISPLAY_FIELD_LIST,
                    constrain: false,
                    closable: true,
                    width: gApp.MIN_COLUMN_WIDTH,
                    height: 'auto',
                    floating: true, //Allows us to control via the 'show' event
                    shadow: false,
                    showAge: true,
                    resizable: true,
                    listeners: {
                        show: function(card){
                            //Move card to one side, preferably closer to the centre of the screen
                            var xpos = d3.event.clientX;
                            var ypos = d3.event.clientY;
                            card.el.setLeftTop( (xpos - (this.getSize().width+20)) < 0 ? (xpos + 20) : (xpos - (this.getSize().width+20)), 
                                (ypos + this.getSize().height)> gApp.getSize().height ? (gApp.getSize().height - (this.getSize().height+20)) : (ypos+10));  //Tree is rotated
                        }
                    }
                });
                node.data.card = card;
            }
            node.data.card.show();
        }
    },

    _nodePopup: function(node, index, array) {
        var popover = Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record,
                target: node.data.card.el
            }
        );
    },

    _nodeClick: function (node,index,array) {
        if (!(node.data.record.data.ObjectID)) return; //Only exists on real items
        //Get ordinal (or something ) to indicate we are the lowest level, then use "UserStories" instead of "Children"
        if (event.altKey) { 
            gApp._nodePopup(node,index,array); 
        }  else {
            gApp._dataPanel(node,index,array);
        }
    },

    _dataPanel: function(node, index, array) {        
        var childField = node.data.record.hasField('Children')? 'Children' : 'UserStories';
        var model = node.data.record.hasField('Children')? node.data.record.data.Children._type : 'UserStory';

        Ext.create('Rally.ui.dialog.Dialog', {
            autoShow: true,
            draggable: true,
            closable: true,
            width: 1200,
            height: 800,
            style: {
                border: "thick solid #000000"
            },
            overflowY: 'scroll',
            overflowX: 'none',
            record: node.data.record,
            disableScroll: false,
            model: model,
            childField: childField,
            title: 'Information for ' + node.data.record.get('FormattedID') + ': ' + node.data.record.get('Name'),
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    itemId: 'leftCol',
                    width: 500,
                },
                {
                    xtype: 'container',
                    itemId: 'rightCol',
                    width: 700  //Leave 20 for scroll bar
                }
            ],
            listeners: {
                afterrender: function() {
                    this.down('#leftCol').add(
                        {
                                xtype: 'rallycard',
                                record: this.record,
                                fields: gApp.CARD_DISPLAY_FIELD_LIST,
                                showAge: true,
                                resizable: true
                        }
                    );

                    if ( this.record.get('c_ProgressUpdate')){
                        this.down('#leftCol').insert(1,
                            {
                                xtype: 'component',
                                width: '100%',
                                autoScroll: true,
                                html: this.record.get('c_ProgressUpdate')
                            }
                        );
                        this.down('#leftCol').insert(1,
                            {
                                xtype: 'text',
                                text: 'Progress Update: ',
                                style: {
                                    fontSize: '13px',
                                    textTransform: 'uppercase',
                                    fontFamily: 'ProximaNova,Helvetica,Arial',
                                    fontWeight: 'bold'
                                },
                                margin: '0 0 10 0'
                            }
                        );
                    }
                    //This is specific to customer. Features are used as RAIDs as well.
                    if ((this.record.self.ordinal === 1) && this.record.hasField('c_RAIDType')){
                        var me = this;
                        var rai = this.down('#leftCol').add(
                            {
                                xtype: 'rallypopoverchilditemslistview',
                                target: array[index],
                                record: this.record,
                                childField: this.childField,
                                addNewConfig: null,
                                gridConfig: {
                                    title: '<b>Risks and Issues:</b>',
                                    enableEditing: false,
                                    enableRanking: false,
                                    enableBulkEdit: false,
                                    showRowActionsColumn: false,
                                    storeConfig: this.RAIDStoreConfig(),
                                    columnCfgs : [
                                        'FormattedID',
                                        'Name',
                                        {
                                            text: 'RAID Type',
                                            dataIndex: 'c_RAIDType',
                                            minWidth: 80
                                        },
                                        {
                                            text: 'RAG Status',
                                            dataIndex: 'Release',  //Just so that a sorter gets called on column ordering
                                            width: 60,
                                            renderer: function (value, metaData, record, rowIdx, colIdx, store) {
                                                var setColour = (record.get('c_RAIDType') === 'Risk') ?
                                                        me.RISKColour : me.AIDColour;
                                                
                                                    return '<div ' + 
                                                        'class="' + setColour(
                                                                        record.get('c_RAIDSeverityCriticality'),
                                                                        record.get('c_RISKProbabilityLevel'),
                                                                        record.get('c_RAIDRequestStatus')   
                                                                    ) + 
                                                        '"' +
                                                        '>&nbsp</div>';
                                            },
                                            listeners: {
                                                mouseover: function(gridView,cell,rowIdx,cellIdx,event,record) { 
                                                    Ext.create('Rally.ui.tooltip.ToolTip' , {
                                                            target: cell,
                                                            html:   
                                                            '<p>' + '   Severity: ' + record.get('c_RAIDSeverityCriticality') + '</p>' +
                                                            '<p>' + 'Probability: ' + record.get('c_RISKProbabilityLevel') + '</p>' +
                                                            '<p>' + '     Status: ' + record.get('c_RAIDRequestStatus') + '</p>' 
                                                        });
                                                    
                                                    return true;    //Continue processing for popover
                                                }
                                            }
                                        },
                                        'ScheduleState'
                                    ]
                                },
                                model: this.model
                            }
                        );
                        rai.down('#header').destroy();
                   }
                    var children = this.down('#rightCol').add(
                        {
                            xtype: 'rallypopoverchilditemslistview',
                            target: array[index],
                            record: this.record,
                            width: '95%',
                            childField: this.childField,
                            addNewConfig: null,
                            gridConfig: {
                                title: '<b>Children:</b>',
                                enableEditing: false,
                                enableRanking: false,
                                enableBulkEdit: false,
                                showRowActionsColumn: false,
                                storeConfig: this.nonRAIDStoreConfig(),
                                columnCfgs : [
                                    'FormattedID',
                                    'Name',
                                    {
                                        text: '% By Count',
                                        dataIndex: 'PercentDoneByStoryCount'
                                    },
                                    {
                                        text: '% By Est',
                                        dataIndex: 'PercentDoneByStoryPlanEstimate'
                                    },
                                    {
                                        text: 'Timebox',
                                        dataIndex: 'Project',  //Just so that the renderer gets called
                                        minWidth: 80,
                                        renderer: function (value, metaData, record, rowIdx, colIdx, store) {
                                            var retval = '';
                                                if (record.hasField('Iteration')) {
                                                    retval = record.get('Iteration')?record.get('Iteration').Name:'NOT PLANNED';
                                                } else if (record.hasField('Release')) {
                                                    retval = record.get('Release')?record.get('Release').Name:'NOT PLANNED';
                                                } else if (record.hasField('PlannedStartDate')){
                                                    retval = Ext.Date.format(record.get('PlannedStartDate'), 'd/M/Y') + ' - ' + Ext.Date.format(record.get('PlannedEndDate'), 'd/M/Y');
                                                }
                                            return (retval);
                                        }
                                    },
                                    'State',
                                    'PredecessorsAndSuccessors',
                                    'ScheduleState'
                                ]
                            },
                            model: this.model
                        }
                    );
                    children.down('#header').destroy();

                    var cfd = Ext.create('Rally.apps.CFDChart', {
                        record: this.record,
                        width: '95%',
                        container: this.down('#rightCol')
                    });
                    cfd.generateChart();

                }
            },

            //This is specific to customer. Features are used as RAIDs as well.
            nonRAIDStoreConfig: function() {
                if (this.record.hasField('c_RAIDType') ){
                    switch (this.record.self.ordinal) {
                        case 1:
                            return  {
                                filters: {
                                    property: 'c_RAIDType',
                                    operator: '=',
                                    value: ''
                                },
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                        default:
                            return {
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                    }
                }
                else return {
                    fetch: gApp.STORE_FETCH_FIELD_LIST,
                    pageSize: 50                                                    
                };
            },

            //This is specific to customer. Features are used as RAIDs as well.
            RAIDStoreConfig: function() {
                var retval = {};

                if (this.record.hasField('c_RAIDType')){
                            return {
                                filters: [{
                                    property: 'c_RAIDType',
                                    operator: '!=',
                                    value: ''
                                }],
                                fetch: gApp.STORE_FETCH_FIELD_LIST,
                                pageSize: 50
                            };
                    }
                else return {
                    fetch: gApp.STORE_FETCH_FIELD_LIST,
                    pageSize: 50
                };
            },

            RISKColour: function(severity, probability, state) {
                if ( state === 'Closed' || state === 'Cancelled') {
                    return 'RAID-blue';
                }

                if (severity === 'Exceptional') {
                    return 'RAID-red textBlink';
                }

                if (severity ==='High' && (probability === 'Likely' || probability === 'Certain'))
                {
                    return 'RAID-red';
                }

                if (
                    (severity ==='High' && (probability === 'Unlikely' || probability === 'Possible')) ||
                    (severity ==='Moderate' && (probability === 'Likely' || probability === 'Certain'))
                ){
                    return 'RAID-amber';
                }
                if (
                    (severity ==='Moderate' && (probability === 'Unlikely' || probability === 'Possible')) ||
                    (severity ==='Low')
                ){
                    return 'RAID-green';
                }
                
                var lClass = 'RAID-missing';
                if (!severity) lClass += '-severity';
                if (!probability) lClass += '-probability';

                return lClass;
            },

            AIDColour: function(severity, probability, state) {
                if ( state === 'Closed' || state === 'Cancelled') {
                    return 'RAID-blue';
                }

                if (severity === 'Exceptional') 
                {
                    return 'RAID-red';
                }

                if (severity === 'High') 
                {
                    return 'RAID-amber';
                }

                if ((severity === 'Moderate') ||
                    (severity === 'Low')
                ){
                    return 'RAID-green';                    
                }
                return 'RAID-missing-severity-probability'; //Mark as unknown
            }
        });
    },

    _dataCheckForItem: function(d){
        return "";
    },
    //Entry point after creation of render box
    _onElementValid: function(rs) {
        gApp.timeboxScope = gApp.getContext().getTimeboxScope(); 
        //Add any useful selectors into this container ( which is inserted before the rootSurface )
        //Choose a point when all are 'ready' to jump off into the rest of the app
            var hdrBoxConfig = {
                xtype: 'container',
                itemId: 'headerBox',
                layout: 'hbox',
                items: [
                    
                    {
                        xtype:  'rallyportfolioitemtypecombobox',
                        itemId: 'piType',
                        fieldLabel: 'Choose Portfolio Type :',
                        labelWidth: 100,
                        margin: '5 0 5 20',
                        defaultSelectionPosition: 'first',
                        listeners: {
                            select: function() { gApp._kickOff();},    //Jump off here to add portfolio size selector
                        }
                    },
                ]
            };
            
            var hdrBox = this.insert (0,hdrBoxConfig);
            var saveButton = hdrBox.add( {
                margin: 10,
                xtype: 'rallybutton',
                disabled: true,
                text: 'Save Changes',
                id: 'saveRecords',
                handler: function() {
                    var changeStore = Ext.create('Rally.data.wsapi.Store', {
                        model: 'Artifact',
                        // proxy: {
                        //     type: 'memory',
                        //     reader: {
                        //         type: 'json'
                        //     }
                        // }
                    });
                    changeStore.add(gApp._changedItems);
                    _.each(changeStore.getRecords(), function (record) {
                        record.save();
                    });
                    gApp.down('#dropRecords').disable();
                    this.disable();
                }
            });
            hdrBox.add( {
                margin: 10,
                xtype: 'rallybutton',
                text: 'Discard Changes',
                disabled: true,
                id: 'dropRecords',
                handler: function() {
                    _.each(gApp._changedItems, function(item) {
                        item.self.load(item.getId(), {
                            fetch: gApp.STORE_FETCH_FIELD_LIST,
                        }).then( {
                            success: function(record) {
                                //Give it back to the node
                                var d = gApp._findTreeNode(gApp._getNodeTreeRecordId(record));
                                d.data.record = record;
                                gApp._zoomedStart();
                            },
                            failure: function(){
                                console.log("Save on buttonclick failed");
                            }
                        });
                    });
                    gApp._changedItems = [];
                    this.disable();
                    saveButton.disable();
                }
            });
    },

    _nodes: [],

    onSettingsUpdate: function() {
        gApp._clearNodes();
        gApp._kickOff();
    },

    onTimeboxScopeChange: function(newTimebox) {
        this.callParent(arguments);
        gApp.timeboxScope = newTimebox;
        gApp._clearNodes();
        gApp._getArtifacts( [gApp.down('#itemSelector').getRecord()]);
    },

    _onFilterChange: function(inlineFilterButton){
        gApp.advFilters = inlineFilterButton.getTypesAndFilters().filters;
        inlineFilterButton._previousTypesAndFilters = inlineFilterButton.getTypesAndFilters();
        if ( gApp._nodes.length) {
            gApp._clearNodes();
            gApp._getArtifacts( [gApp.down('#itemSelector').getRecord()]);
        }
    },

    _onFilterReady: function(inlineFilterPanel) {
        gApp.down('#filterBox').add(inlineFilterPanel);
    },

    _kickOff: function() {
        var ptype = gApp.down('#piType');
        var hdrBox = gApp.down('#headerBox');
        gApp._typeStore = ptype.store;
        if (!gApp.getSetting('oneTypeOnly')){
            var selector = gApp.down('#itemSelector');
            if ( selector) {
                selector.destroy();
            }
            var is = hdrBox.insert(1,{
                xtype: 'rallyartifactsearchcombobox',
                fieldLabel: 'Choose Start Item :',
                itemId: 'itemSelector',
                multiSelect: gApp.getSetting('allowMultiSelect'),
                labelWidth: 100,
                queryMode: 'remote',
                allowNoEntry: false,
                pageSize: 200,
                width: 600,
                margin: '10 0 5 20',
                stateful: true,
                stateId: this.getContext().getScopedStateId('itemSelector'),
                storeConfig: {
                    models: [ 'portfolioitem/' + ptype.rawValue ],
                    fetch: gApp.STORE_FETCH_FIELD_LIST,
                    context: gApp.getContext().getDataContext(),
                    pageSize: 200,
                    autoLoad: true
                },
                listeners: {
                    change: function(selector,records) {
                        if ((records !== null) && (records.length > 0)) {
                            gApp._resetTimer(this.startAgain);
                        }
                    }
                },
                startAgain: function () {
                    var records = gApp.down('#itemSelector').valueModels;
                    gApp._clearNodes();
                    if (records.length > 1) {
                            gApp._nodes.push({'Name': 'Combined View',
                            'record': {
                                'data': {
                                    '_ref': 'root',
                                    'Name': ''
                                }
                            },
                            'local':true
                        });
                    }
                    gApp._getArtifacts(records);
                }
            });
        }   

//        Ext.util.Observable.capture( is, function(event) { console.log('event', event, arguments);});
        if(gApp.getSetting('showFilter') && !gApp.down('#inlineFilter')){
            hdrBox.add({
                xtype: 'rallyinlinefiltercontrol',
                name: 'inlineFilter',
                itemId: 'inlineFilter',
                margin: '10 0 5 20',                           
                context: this.getContext(),
                height:26,
                inlineFilterButtonConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('inline-filter'),
                    context: this.getContext(),
//                    modelNames: ['PortfolioItem/' + ptype.rawValue], //NOOOO!
                    modelNames: gApp._getModelFromOrd(0), //We actually want to filter the features... YESSSS!
                    filterChildren: false,
                    inlineFilterPanelConfig: {
                        quickFilterPanelConfig: {
                            defaultFields: ['ArtifactSearch', 'Owner']
                        }
                    },
                    listeners: {
                        inlinefilterchange: this._onFilterChange,
                        inlinefilterready: this._onFilterReady,
                        scope: this
                    } 
                }
            });
        }
        if (gApp.getSetting('oneTypeOnly')){
            //Get the records you can see of the type set in the piType selector
            //and call _getArtifacts with them.
            var fetchConfig = gApp._fetchConfig(true);
            fetchConfig.model = gApp._getSelectedType();
            fetchConfig.autoLoad = true;
            fetchConfig.pageSize = 2000;    //Wells Fargo..... Ouch!
            fetchConfig.listeners = {
                load: function(store,records,opts) {
                    if (records.length > 1) {
                        gApp._clearNodes();
                        gApp._nodes.push({'Name': 'Combined View',
                            'record': {
                                'data': {
                                    '_ref': 'root',
                                    'Name': ''
                                }
                            },
                            'local':true
                        });
                        gApp._getArtifacts(records);
                    }
                },
                change: function (a,b,c,d,e,f) {
                    console.log('change: ',arguments);
                }
            };
            Ext.create ('Rally.data.wsapi.Store', fetchConfig );
        }
    },

    _fetchConfig: function(lowest){
        var collectionConfig = {
            sorters: [
                {
                    property: 'DragAndDropRank',
                    direction: 'ASC'
                }
            ],
            fetch: gApp.STORE_FETCH_FIELD_LIST,
            
            filters: []
        };
        if (gApp.getSetting('hideArchived')) {
            collectionConfig.filters.push({
                property: 'Archived',
                operator: '=',
                value: false
            });
        }

        if (lowest) { //Only for lowest level item type)
            if(gApp.getSetting('showFilter') && gApp.advFilters && gApp.advFilters.length > 0){
                Ext.Array.each(gApp.advFilters,function(filter){
                    collectionConfig.filters.push(filter);
                });
            }

            if ( gApp.getSetting('onlyDependencies') === true){
                collectionConfig.filters.push(Rally.data.wsapi.Filter.or([
                    { property: 'Predecessors.ObjectID', operator: '!=', value: null },
                    { property: 'Successors.ObjectID', operator: '!=', value: null }
                ]));
            }
            //Can only do releases and milestones, not interations
            if((gApp.timeboxScope && gApp.timeboxScope.type.toLowerCase() === 'release') ||
            (gApp.timeboxScope && gApp.timeboxScope.type.toLowerCase() === 'milestone') 
            )
            {
                collectionConfig.filters.push(gApp.timeboxScope.getQueryFilter());
            }
        }
        return Ext.clone(collectionConfig);
    },

    _getArtifacts: function(data) {
        //On re-entry send an event to redraw
        gApp._nodes = gApp._nodes.concat( gApp._createNodes(data));    //Add what we started with to the node list

        this.fireEvent('redrawNodeTree');
        //Starting with highest selected by the combobox, go down

        if (!gApp.getSetting('oneTypeOnly')) {
            _.each(data, function(record) {
                var lowest = record.get('PortfolioItemType').Ordinal < 2;
                if (record.get('Children')){  
                    //Limit this to feature level and not beyond.
                    var collectionConfig = gApp._fetchConfig(lowest);
                    collectionConfig.callback = function(records, operation, success) {
                        //Start the recursive trawl down through the levels
                        if (success && records.length)  gApp._getArtifacts(records);
                    };
                    record.getCollection( 'Children').load( collectionConfig );
                }
            });
        }
    },

    _createNodes: function(data) {
        //These need to be sorted into a hierarchy based on what we have. We are going to add 'other' nodes later
        var nodes = [];
        //Push them into an array we can reconfigure
        _.each(data, function(record) {
            var localNode = (gApp.getContext().getProjectRef() === record.get('Project')._ref);
            nodes.push({'Name': record.get('FormattedID'), 'record': record, 'local': localNode, 'dependencies': []});
        });
        return nodes;
    },

    _clearNodes: function() {
        if (gApp._nodes) {
            gApp._removeCards();
            gApp._nodes = [];
        }
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

    _findParentType: function(record) {
        //The only source of truth for the hierachy of types is the typeStore using 'Ordinal'
        var ord = null;
        for ( var i = 0;  i < gApp._typeStore.totalCount; i++ )
        {
            if (record.data._type === gApp._typeStore.data.items[i].get('TypePath').toLowerCase()) {
                ord = gApp._typeStore.data.items[i].get('Ordinal');
                break;
            }
        }
        ord += 1;   //We want the next one up, if beyond the list, set type to root
        //If we fail this, then this code is wrong!
        if ( i >= gApp._typeStore.totalCount) {
            return null;
        }
        var typeRecord =  _.find(  gApp._typeStore.data.items, function(type) { return type.get('Ordinal') === ord;});
        return (typeRecord && typeRecord.get('TypePath').toLowerCase());
    },
    _findNodeById: function(nodes, id) {
        return _.find(nodes, function(node) {
            return node.record.data._ref === id;
        });
    },
    _findParentNode: function(nodes, child){
        if (child.record.data._ref === 'root') return null;
        var parent = child.record.data.Parent;
        var pParent = null;
        if (parent ){
            //Check if parent already in the node list. If so, make this one a child of that one
            //Will return a parent, or null if not found
            pParent = gApp._findNode(nodes, parent);
        }
        else {
            //Here, there is no parent set, so attach to the 'null' parent.
            var pt = gApp._findParentType(child.record);
            //If we are at the top, we will allow d3 to make a root node by returning null
            //If we have a parent type, we will try to return the null parent for this type.
            if (pt) {
                var parentName = '/' + pt + '/null';
                pParent = gApp._findNodeById(nodes, parentName);
            }
        }
        //If the record is a type at the top level, then we must return something to indicate 'root'
        return pParent?pParent: gApp._findNodeById(nodes, 'root');
    },
        //Routines to manipulate the types

    _getSelectedOrdinal: function() {
        return gApp.down('#piType').lastSelection[0].get('Ordinal');
    },
    
    _getSelectedType: function() {
        return gApp.down('#piType').lastSelection[0].get('TypePath');
    },

    _getTypeList: function(highestOrdinal) {
        var piModels = [];
        _.each(gApp._typeStore.data.items, function(type) {
            //Only push types below that selected
            if (type.data.Ordinal <= (highestOrdinal ? highestOrdinal: 0) )
                piModels.push({ 'type': type.data.TypePath.toLowerCase(), 'Name': type.data.Name, 'ref': type.data._ref, 'Ordinal': type.data.Ordinal});
        });
        return piModels;
    },

    _highestOrdinal: function() {
        return _.max(gApp._typeStore.data.items, function(type) { return type.get('Ordinal'); }).get('Ordinal');
    },

    _getModelFromOrd: function(number){
        var model = null;
        _.each(gApp._typeStore.data.items, function(type) { if (number == type.get('Ordinal')) { model = type; } });
        return model && model.get('TypePath');
    },

    _getOrdFromModel: function(modelName){
        var model = null;
        _.each(gApp._typeStore.data.items, function(type) {
            if (modelName == type.get('TypePath').toLowerCase()) {
                model = type.get('Ordinal');
            }
        });
        return model;
    },

    _getNodeTreeId: function(d) {
        return d.id;
    },

    _getNodeTreeRecordId: function(record) {
        return record.data._ref;
    },

    _stratifyNodeTree: function(nodes) {
        return d3.stratify()
        .id( function(d) {
            var retval = (d.record && gApp._getNodeTreeRecordId(d.record)) || null; //No record is an error in the code, try to barf somewhere if that is the case
            return retval;
        })
        .parentId( function(d) {
            var pParent = gApp._findParentNode(nodes, d);
            return (pParent && pParent.record && gApp._getNodeTreeRecordId(pParent.record)); })
        (nodes);
    },

    _createNodeTree: function (nodes) {
        //Try to use d3.stratify to create nodet
        var nodetree = gApp._stratifyNodeTree(nodes);
        nodetree.sum(function(d) { return 1;});        // Set the dimensions in svg to match
        gApp._nodeTree = nodetree;      //Save for later
        return nodetree;
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

    _addSVGTree: function() {
        var svg = d3.select('svg');
        svg.append("g")        
            .attr("transform","translate(" + gApp._rowHeight + "," +  (gApp.getSetting('showTimeLine')?gApp._rowHeight:0) + ")")
            .attr("id","zoomTree")
            .attr('width', +svg.attr('width') - gApp._rowHeight)
            .attr('height', +svg.attr('height'))
            .append('rect')
            .attr('width', +svg.attr('width') - gApp._rowHeight)
            .attr('height', +svg.attr('height'))
            .attr('class', 'arrowbox')
            .on('click', gApp._startTreeAgain);

        svg.append("g")        
            .attr("transform","translate(0,0)")
            .attr('width', gApp._rowHeight)
            .attr("id","staticTree");
    },

    _removeSVGTree: function() {
        if (d3.select("#zoomTree")) {
            d3.select("#zoomTree").remove();
        }
        if (d3.select("#staticTree")) {
            d3.select("#staticTree").remove();
        }
        //Go through all nodes and kill the cards
        gApp._removeCards();
    },

    redrawNodeTree: function() {
        gApp._removeSVGTree();
        gApp._enterMainApp();
    },

    _removeCards: function () {
        _.each(gApp._nodes, function(node) {
            if (node.card) {
                node.card.destroy();
                node.card = null;
            }
        });
    },

    launch: function() {

        this.on('redrawNodeTree', this.redrawNodeTree);
        this.subscribe(this, Rally.Message.objectUpdate, this._objectUpdated, this);
    },

    _objectUpdated: function(update){
            var d = gApp._findTreeNode(update.data._ref);
            var node = d3.select('#group-'+d.data.Name);
            node.remove();
            //Check if the record was part of the changes we have logged
            _.remove(gApp._changedItems, function(item) {
                return (item.get('FormattedID') === d.data.record.get('FormattedID'));
            });
            if (gApp._changedItems.length === 0) { 
                gApp.down('#saveRecords').disable();
                gApp.down('#dropRecords').disable();
            }
            update.self.load(update.getId()).then({
                success: function(record) {
                    d.data.record = record;
                    gApp._zoomedStart();
                }
            });
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addEvents('redrawNodeTree');
    },

});
}());