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
            lowestDependencies: true
        }
    },

    //"Nobody needs more than 640Kb"
    colours: ['#edf8fb','#bfd3e6','#9ebcda','#8c96c6','#8856a7','#810f7c','#7a0177','#c51b8a','#f768a1','#fcc5c0','#feebe2'],

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
            name: 'showExtraText',
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Add Project and Prelim Size to titles',
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
            labelAlign: 'top'
        }
        
        ];
        return returned;
    },
    itemId: 'rallyApp',
        MIN_COLUMN_WIDTH:   200,        //Looks silly on less than this
        LOAD_STORE_MAX_RECORDS: 100, //Can blow up the Rally.data.wsapi.filter.Or
        WARN_STORE_MAX_RECORDS: 300, //Can be slow if you fetch too many
        NODE_CIRCLE_SIZE: 8,                //Pixel radius of dots
        LEFT_MARGIN_SIZE: 100,               //Leave space for "World view" text
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
        gApp._rowHeight = gApp.getSetting('lineSize') || 20;
        //Get all the nodes and the "Unknown" parent virtual nodes
        var nodetree = gApp._createNodeTree(gApp._nodes);
        var svg = d3.select('svg');
        svg.attr('height', gApp._rowHeight * nodetree.value);
        //Make surface the size available in the viewport (minus the selectors and margins)
        var rs = this.down('#rootSurface');
        rs.getEl().setHeight(svg.attr('height'));
        svg.attr('width', rs.getEl().getWidth());
        svg.attr('class', 'rootSurface');
        gApp._startTreeAgain();
    },

    _switchChildren: function(d) {
        if ( d.children) {
            d._children = d.children;
            d.children = null;
            d._value = d.value;
            d.value = 1;
        } else {
            d.children = d._children;
            d._children = null;    
            d.value = d._value;
            d._value = null;
        }
        gApp._startTreeAgain();
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
            .range([0, parseInt(d3.select('svg').attr('width'))- (gApp.LEFT_MARGIN_SIZE + 10)]);
    },

    _setZoomer: function() {
        var svg = d3.select('svg');
        var width = +svg.attr('width');
        var height = +svg.attr('height');
        gApp.xAxis = d3.axisBottom(gApp.dateScaler)
            .ticks(( (width -gApp.LEFT_MARGIN_SIZE)+ 2)/50)
            .tickSize(height)
            .tickPadding(gApp.getSetting('showTimeLine')? (8 - height):0);
        gApp.zoom = d3.zoom()
            // .scaleExtent([1,40])
            // .translateExtent([-100,-100], [90+width, 100+height])
            .on("zoom",gApp._zoomed);
        var zoomBox = d3.select('#zoomTree');
        gApp.gX = zoomBox.append('g')
            .attr('width', width - (gApp.LEFT_MARGIN_SIZE + 10))
            .attr('height', height)
            .attr("class", 'axis')
            .call(gApp.xAxis);    
            
            svg.call(gApp.zoom);
//            d3.select('#zoomTree').call(gApp.zoom);
        },

    _zoomed: function() {

        var zoomBox = d3.select('#zoomTree');
 
//        zoomBox.attr("transform", d3.event.transform);
        gApp.gX.call(gApp.xAxis.scale(d3.event.transform.rescaleX(gApp.dateScaler)));

    },

    _rescaledStart: function() {
        gApp._removeSVGTree();
        gApp._addSVGTree();
        gApp._setZoomer();
        gApp._refreshTree();
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

    _refreshTree: function(){
        var svgHeight = parseInt(d3.select('svg').attr('height'));
        var svgWidth = parseInt(d3.select('svg').attr('width')) - gApp.LEFT_MARGIN_SIZE;
        var nodetree = gApp._nodeTree;

        var partition = d3.partition();
//        var partition = d3.partition().size([svg.attr('width'),svg.attr('height')]);

        nodetree = partition(nodetree);
        gApp._indexTree(nodetree);
//        console.log(nodetree);
        
        //Let's scale to the dateline
        nodetree.eachBefore(function(d) {
            //Come here before we visit the children to set up our 'g' spot
            var shiftY = ((d.rpos * svgHeight) + 
                            (d.parent?gApp._rowHeight:0)) ;
            if ( !d.parent ) {
                d.g = d3.select('#zoomTree').append('g');
                d.t = d3.select('#staticTree').append('g');
                shiftY += (gApp.getSetting('showTimeLine')?gApp._rowHeight:0);
            }
            else {
                d.g = d.parent.g.append('g');
                d.t = d.parent.t.append('g');
            }

            var startX = gApp.dateScaler(new Date(d.data.record.get('PlannedStartDate')));
            var endX   = gApp.dateScaler(new Date(d.data.record.get('PlannedEndDate')));
            startX = startX<0? 0 : startX;
            endX   = endX<0  ? 0 : endX;
            var dWidth = endX - startX;

            d.g.attr('transform', 'translate(0,' + shiftY + ')');
            d.t.attr('transform', 'translate(0,' + shiftY + ')');

            d.g.attr('height', d.rheight * svgHeight)
                .attr('width', svgWidth)
                .attr('id', 'zoomGroup-'+d.data.Name);
            d.t.attr('height', d.rheight * svgHeight)
                .attr('width',svgWidth)
                .attr('id', 'staticGroup-'+d.data.Name);

            //Add bit for dates
            if (dWidth) {
                var rClass = '';
                if (gApp._scheduleError(d)) {
                    rClass += 'data--errors';
                }
                else {
                    rClass += 'no--errors';
                }

                d.g.append('rect')
                    .attr('rx', gApp._rowHeight/2)
                    .attr('ry', gApp._rowHeight/2)
                    .attr('x', startX)
                    .attr('width', dWidth)
                    .attr('height',gApp._rowHeight)
                    .attr('fill', gApp.colours[d.depth+1])
                    .attr('opacity', 0.5)
                    .attr('class', rClass + ' clickable')
                    .attr('id', 'rect-'+d.data.Name)
                    .on('mouseover', function(a, idx, arr) {
                        gApp._nodeMouseOver(d,idx, arr);
                    })
                    .on("mouseout", function(a, index, array) { 
                        gApp._nodeMouseOut(d,index,array);
                    })
                    .on('click', function(a, idx, arr) {
                        if (d3.event.shiftKey) {
                            gApp._dataPanel(d,idx,arr);
                        } else {
                            gApp._setTimeline(d);
                        }
                    });

                //Add clipPath here
                var cp = d.g.append('clipPath')
                    .attr('id', 'clipPath-'+d.data.Name);

                var clipBox =d.g.append('rect')
                    .attr('rx', gApp._rowHeight/2)
                    .attr('ry', gApp._rowHeight/2)
                    .attr('x', startX)
                    .attr('width', dWidth)
                    .attr('height',gApp._rowHeight);
                    // .attr('fill', gApp.colours[d.depth+1])
                    // .attr('opacity', 0.5)
                    // .attr('class', rClass);

                    //Reposition the clipBox as d3 doesn't seem to let me
                    cp.node().appendChild(clipBox.node());
                

//                d.g.node().appendChild(clipBox.node());
                d.g.append('text')
                    .attr('clip-path', 'url(#clipPath-'+d.data.Name)
                    .attr('id', 'text-'+d.data.Name)
                    .attr('x', startX + (startX?(gApp._rowHeight/2):gApp._rowHeight))
                    .attr('y', gApp._rowHeight/2)  //Should follow point size of font
                    .attr('class', 'normalText')
                    .attr('editable', 'none')
                    .attr('alignment-baseline', 'central')
                    .attr('style', 'font-size:' + (gApp._rowHeight-8))
                    .text(d.data.record.get('Name'));


                } 
            var atStart = false;
            if (startX === 0 ) {
                if ( 
                    d.data.record.get('PlannedStartDate') &&
                    d.data.record.get('PlannedEndDate')
                ){
                    d.t.append('polygon')
                        .attr('class','clickable left-arrow')
                        .attr('id', 'leftarrow'+d.data.Name)
                        .attr('width', 10)
                        .attr('height', 10)
                        .attr('points', "10,0 0,5 10,10")
                        .attr('transform', 'translate(' + (gApp.LEFT_MARGIN_SIZE+5) + ',' + ((gApp._rowHeight/2)-5)+ ')')   //Overlay over start of zoombox
                        .on('click', function(a, idx, arr) {
                            gApp._setTimeline(d);
                        });
                }
                else {
                    d.t.append('circle')
                        .attr('class','data--errors')
                        .attr('r', 5)
                        .attr('transform', 'translate(' + (gApp.LEFT_MARGIN_SIZE+10) + ',' + (gApp._rowHeight/2) + ')');   //Overlay over start of zoombox
                }
            }
            d.t.append('text')
                .text(d.data.Name)
                .attr('x', 15 * (d.depth + 1))   //Leave space for up/down arrow
                .attr('y', gApp._rowHeight/2)
                .attr('class', 'node boldText')                    
                .attr('alignment-baseline', 'central')
                .attr('style', 'font-size:' + (gApp._rowHeight/2))
;

            if (d.children) {
                d.t.append('polygon')
                    .attr('class','tree-arrow')
                    .attr('id', 'uparrow'+d.data.Name)
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr('transform', 'translate(0,5)')
                    .attr('points', "5,0 10,10 0,10");
            }
            if (d._children) {
                d.t.append('polygon')
                    .attr('class','tree-arrow')
                    .attr('id', 'uparrow'+d.data.Name)
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr('transform', 'translate(0,5)')
                    .attr('points', "0,0 10,0 5,10");
            }

            if (d.children || d._children) {
                d.t.append('rect')
                    .attr('class', 'clickable arrowbox')
                    .attr('width', gApp._rowHeight)
                    .attr('height', gApp._rowHeight)
                    .on('click', function() { gApp._switchChildren(d);});
            }
        });
        nodetree.each(function(d) {
            //Now add the dependencies lines
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
                                var x0 = source.node().getBBox().x + source.node().getBBox().width;
                                var y0 = source.node().getCTM().f  + (source.node().getBBox().height/2);

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
                                            gApp._createDepsPopover(d, arr[idx], false);})    //Default to successors
                                        .attr('class', zClass);
                                }

                                if (!e) {
                                    return;
                                }
                                //Stuff that needs endpoint
                                var target = d3.select('#rect-'+e.data.Name);
                                var x1 = target.node().getBBox().x;
                                var y1 = target.node().getCTM().f + (target.node().getBBox().height/2);

                                zoomTree.append('circle')
                                    .attr('cx', x1)
                                    .attr('cy', y1)
                                    .attr('r', 3)
                                    .on('mouseover', function(a, idx, arr) { gApp._createDepsPopover(e, arr[idx], false);})    //Default to successors
                                    .attr('class', zClass);
                                
                                zClass += (zClass.length?' ':'') + 'dashed' + d.data.record.get('PortfolioItemType').Ordinal.toString();
                                
                                if ( !gApp.getSetting('lowestDependencies') || d.data.record.get('PortfolioItemType').Ordinal === 0) {
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
                        panel.el.setLeftTop (    parseInt(circ.getBBox().x + circ.getBBox().width + gApp.LEFT_MARGIN_SIZE), 
                                                parseInt(circ.getBBox().y + (gApp._rowHeight/2))
                        );
                    }
                }
            }
        );         
        panel.show();
    },
    
    _scheduleError: function(d) {
        if ( !d.parent ) { return false; }  //Top level item doesn't have a parent
        return ( d.data.record.get('PlannedEndDate') > d.parent.data.record.get('PlannedEndDate')) ||
             ( d.data.record.get('PlannedStartDate') < d.parent.data.record.get('PlannedStartDate'));
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
    _textXPos: function(d){
        return d.children ? -(gApp.NODE_CIRCLE_SIZE + 5) : (gApp.NODE_CIRCLE_SIZE + 5);
    },

    _textYPos: function(d){
        return d.children  ? -5 : 0;
//        return d.children  ? -(gApp.NODE_CIRCLE_SIZE + 5) : 0;
        //        return (d.children  && d.parent) ? -(gApp.NODE_CIRCLE_SIZE + 5) : 0;
    },

    _textAnchor: function(d){
//        if (d.children && d.parent) return 'middle';
        if (!d.children && d. parent) return 'start';
        return 'end';
    },

    _hideLinks: function(){
        var tree = d3.select('#tree');
        var links = tree.selectAll('path');
        links.attr("visibility","hidden");
    },

    _showLinks: function(){
        var tree = d3.select('#tree');
        var links = tree.selectAll('path');
        links.attr("visibility","visible");
    },
    
    _nodeMouseOut: function(node, index,array){
        if (node.card) node.card.hide();
    },

    _nodeMouseOver: function(node,index,array) {
        if (!(node.data.record.data.ObjectID)) {
            //Only exists on real items, so do something for the 'unknown' item
            return;
        } else {

            //For th audit variant, we want to do a check of all the lookback changes associated with this item and do checks
            if ( !node.card) {
                var card = Ext.create('Rally.ui.cardboard.Card', {
                    'record': node.data.record,
                    fields: gApp.CARD_DISPLAY_FIELD_LIST,
                    constrain: false,
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
                node.card = card;
            }
            node.card.show();
        }
    },

    _nodePopup: function(node, index, array) {
        var popover = Ext.create('Rally.ui.popover.DependenciesPopover',
            {
                record: node.data.record,
                target: node.card.el
            }
        );
    },

    _nodeClick: function (node,index,array) {
        if (!(node.data.record.data.ObjectID)) return; //Only exists on real items
        //Get ordinal (or something ) to indicate we are the lowest level, then use "UserStories" instead of "Children"
        if (event.shiftKey) { 
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
            
            this.insert (0,hdrBoxConfig);        
    },

    _nodes: [],

    onSettingsUpdate: function() {
        if ( gApp._nodes) gApp._nodes = [];
        gApp._kickOff();
        //gApp._getArtifacts( gApp.down('#itemSelector').valueModels);
    },

    onTimeboxScopeChange: function(newTimebox) {
        this.callParent(arguments);
        gApp.timeboxScope = newTimebox;
        if ( gApp._nodes) gApp._nodes = [];
        gApp._getArtifacts( [gApp.down('#itemSelector').getRecord()]);
    },

    _onFilterChange: function(inlineFilterButton){
        gApp.advFilters = inlineFilterButton.getTypesAndFilters().filters;
        inlineFilterButton._previousTypesAndFilters = inlineFilterButton.getTypesAndFilters();
        if ( gApp._nodes.length) {
            gApp._nodes = [];
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
                        if (records.length > 0) {
                            gApp._resetTimer(this.startAgain);
                        }
                    }
                },
                startAgain: function () {
                    var records = gApp.down('#itemSelector').valueModels;
                    if ( gApp._nodes) gApp._nodes = [];
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
            var lowest = gApp._getSelectedOrdinal() === 0;
            var fetchConfig = gApp._fetchConfig(lowest);
            fetchConfig.model = gApp._getSelectedType();
            fetchConfig.autoLoad = true;
            //Ext.create ('Rally.data.wsapi.s')

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
            callback: function(records, operation, success) {
                //Start the recursive trawl down through the levels
                if (success && records.length)  gApp._getArtifacts(records);
            },
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
        return collectionConfig;
    },

    _getArtifacts: function(data) {
        //On re-entry send an event to redraw
        gApp._nodes = gApp._nodes.concat( gApp._createNodes(data));    //Add what we started with to the node list

        this.fireEvent('redrawNodeTree');
        //Starting with highest selected by the combobox, go down

        _.each(data, function(record) {
            var lowest = record.get('PortfolioItemType').Ordinal < 2;
            if (record.get('Children')){                                //Limit this to feature level and not beyond.
                var collectionConfig = gApp._fetchConfig(lowest);
                record.getCollection( 'Children').load( collectionConfig );
            }
        });
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
        return gApp.down('#piType').lastSelection[0].get('Type');
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
            .attr("transform","translate(" + gApp.LEFT_MARGIN_SIZE + ",0)")
            .attr("id","zoomTree")
            .attr('width', +svg.attr('width') - gApp.LEFT_MARGIN_SIZE)
            .attr('height', +svg.attr('height'))
            .append('rect')
            .attr('width', +svg.attr('width') - gApp.LEFT_MARGIN_SIZE)
            .attr('height', +svg.attr('height'))
            .attr('class', 'arrowbox')
            .on('click', gApp._startTreeAgain);

        svg.append("g")        
            .attr("transform","translate(0,0)")
            .attr('width', gApp.LEFT_MARGIN_SIZE)
            .attr("id","staticTree");
    },

    _removeSVGTree: function() {
        if (d3.select("#zoomTree")) {
            d3.select("#zoomTree").remove();
        }
        if (d3.select("#staticTree")) {
            d3.select("#staticTree").remove();
        }
    },

    redrawNodeTree: function() {
        gApp._removeSVGTree();
        gApp._enterMainApp();
    },

    launch: function() {

        this.on('redrawNodeTree', this.redrawNodeTree);
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addEvents('redrawNodeTree');
    },

});
}());