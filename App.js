(function () {
    var Ext = window.Ext4 || window.Ext;

Ext.define('Nik.apps.PortfolioItemTimeline.app', {
    extend: 'Rally.app.TimeboxScopedApp',
    settingsScope: 'project',
    componentCls: 'app',
    config: {
        defaultSettings: {
            showTimeLine: true,
            showReleases: true,
            showFilter: true,
            allowMultiSelect: false,
            onlyDependencies: false,
            oneTypeOnly: false,
            startDate: Ext.Date.subtract(new Date(), Ext.Date.DAY, 30),
            endDate: Ext.Date.add(new Date(), Ext.Date.DAY, 150),
            lineSize: 20,
            lowestDependencies: true,
            cardHover: true,
            pointsOrCount: false
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
            },{
                name: 'showReleases',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Releases at top',
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
                fieldLabel: 'Colour by Story Count',
                name: 'pointsOrCount',
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
        STORE_FETCH_FIELD_LIST:
            [
                'ActualEndDate',
                'ActualStartDate',
                'Blocked',
                'BlockedReason',
                'Children',
                'CreationDate',
                'Description',
                'DisplayColor',
                'DragAndDropRank',
                'FormattedID',
                'Iteration',
                'Milestones',
                'Name',
                'Notes',
                'ObjectID',
                'OrderIndex', 
                'Ordinal',
                'Owner',
                'Parent',
                'PercentDoneByStoryCount',
                'PercentDoneByStoryPlanEstimate',
                'PlannedEndDate',
                'PlannedStartDate',
                'PortfolioItemType',
                'Predecessors',
                'PredecessorsAndSuccessors',
                'PreliminaryEstimate',
                'Project',
                'Ready',
                'Release',
                'RevisionHistory',
                'State',
                'Successors',
                'Tags',
                'Workspace',
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
        svg.attr('height', gApp._rowHeight * 
            (nodetree.value + 
            (gApp.getSetting('showTimeLine')?1:0) +     //Leave space for dates
            (gApp.getSetting('showReleases')?1:0))      //Leave space for releases
        );
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

       var timebegin = new Date(gApp.getSetting('startDate')) || Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.startDate);
       var timeend =  new Date(gApp.getSetting('endDate')) || Ext.Date.add(new Date(), Ext.Date.DAY, gApp.endDate);
        gApp._setTimeScaler(timebegin,timeend);
    },

    _setTimeScaler: function(timebegin, timeend){
        gApp.dateScaler = d3.scaleTime()
            .domain([
                timebegin, timeend
            ])
            .range([0, +d3.select('svg').attr('width') - (gApp._rowHeight + 10)]);
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

    _getReleases: function() {
        var releases = Ext.create('Rally.data.wsapi.Store', {
            model: 'Release',
            autoLoad: true,
            context: {
                projectScopeDown: false,
                projectScopeUp: false
            },
            filters: [
                {
                    property: 'ReleaseDate',
                    operator: '>',
                    value: gApp.dateScaler.invert(0)
                },
                {
                    property: 'ReleaseStartDate',
                    operator: '<',
                    value: gApp.dateScaler.invert(+d3.select('svg').attr('width'))
                }

            ],
            listeners: {
                load: function(store, records, opts) {
                    gApp._setReleases(records);
                }
            }
        });
    },

    _setReleases: function(releases) {
        var rels = d3.select('svg').selectAll(".releases");
//        rels.remove();
        var relGroups = rels.data(releases)
            .enter().append('g')
            .attr('class', 'releases');

        relGroups.attr('transform', function(rel) {
            rel.x = gApp.dateScaler(new Date(rel.get('ReleaseStartDate')));
            rel.x = (rel.x<0?0:rel.x) ;
            return 'translate(' + (rel.x + gApp._rowHeight) + ',0)';}   //Move over by 2px and make 2px smaller in width below
        );
        relGroups.append('rect')
            .attr('y', gApp._rowHeight)
            .attr('height', gApp._rowHeight)
            .attr('width', function(rel) {
                var end = gApp.dateScaler(new Date(rel.get('ReleaseDate')));
                end = (d3.select('svg').attr('width')<end)?d3.select('svg').attr('width'):end;
                rel.width = end - rel.x;
                return rel.width<4?2:rel.width-2;
            })
            .attr('class', function( rel, idx, arr) {
                return 'q' + idx + '-' + (arr.length%5);
            });
        relGroups.append('text')
            .attr('x', function(rel) { return rel.width/2;})
            .attr('y', function(rel) {
                return (gApp._rowHeight/2) +
                    (gApp.getSetting('showTimeLine')?gApp._rowHeight:0);
                })
            .attr('class', 'normalText')
            .text( function(rel) {
                return (rel.width > 80)? rel.get('Name'): '';
            })
            .style("text-anchor", 'middle')
            .attr('alignment-baseline', 'central');

    },

    _rescaledStart: function() {
        gApp._setAxis();
        if (gApp.getSetting('showReleases')) { gApp._getReleases(); }
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
        if (d.card) { 
            d.card.destroy();
            d.card = null;
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
        return parseInt(d3.select('svg').attr('height')) - 
            (gApp.getSetting('showTimeLine')?gApp._rowHeight:0) -
            (gApp.getSetting('showReleases')?gApp._rowHeight:0);
    },

    _itemMenu: function(d) {
        Rally.nav.Manager.edit(d.data.record);
    },

    _getGroupClass: function(d) {
        var rClass = 'clickable draggable' + ((d.children || d._children)?' children':'');
        if (gApp._scheduleError(d)) {
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
        var healthField = gApp.getSetting('pointsOrCount')?'PercentDoneByStoryCount':'PercentDoneByStoryPlanEstimate';

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

            var defs = node.append('defs')
                .append('linearGradient')
                .attr('id', function(d) {
                    return 'lg' + d.data.record.get('FormattedID');
                });

                defs.append('stop')
                .attr('offset', function(d) {
                    return (d.data.record.get(healthField)*100).toString() + "%";
                })
                .attr('stop-color', function(d) { 
                    return gApp.calculateHealthColorForPortfolioItemData(d.data.record.data, healthField ); 
                });

                defs.append('stop')
                .attr('offset', function(d) {
                    return (d.data.record.get(healthField)*100).toString() + "%";
                })
                .attr('stop-color', "#fff");
                
                var drags = node.append('rect')
            .attr('rx', gApp._rowHeight/2)
            .attr('ry', gApp._rowHeight/2)
            .attr('y', 2)
            .attr('width', function(d) { return d.drawnWidth; })
            .attr('height',gApp._rowHeight-4)
            .attr('fill', function(d) { return "url(#lg" + d.data.record.get('FormattedID');  })
            .attr('opacity', 0.5)
            .attr('stroke', function(d) {
                return d.data.record.get('DisplayColor');
            })
            .attr('stroke-width',2)
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
            .attr('x', gApp._rowHeight/4)
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
            .attr('x', gApp._rowHeight+5)
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
                                var y0 = source.node().getCTM().f + gApp._rowHeight/2 - 
                                    ((gApp.getSetting('showReleases')?gApp._rowHeight:0) +
                                     (gApp.getSetting('showTimeLine')?gApp._rowHeight:0));

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
                                var y1 = target.node().getCTM().f + gApp._rowHeight/2 - 
                                    ((gApp.getSetting('showReleases')?gApp._rowHeight:0) +
                                     (gApp.getSetting('showTimeLine')?gApp._rowHeight:0));

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
    
    _scheduleError: function(d) {
        if ( !d.parent || !d.parent.data.record.data.ObjectID ) { return false; }  //Top level item doesn't have a parent
        return gApp._checkSchedule(d);
    },

    _checkSchedule: function(d, start, end ) {
        var childStart = (start === undefined)? d.data.record.get('PlannedStartDate') : start;
        var childEnd = (end === undefined)? d.data.record.get('PlannedEndDate') : end;
        if ( d.parent.data.record.data.ObjectID) {
          return (childEnd > d.parent.data.record.get('PlannedEndDate')) ||
              (childStart < d.parent.data.record.get('PlannedStartDate'));
        } else {
          return false;
        }
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
        if (node.card) node.card.hide();
    },

    _nodeMouseOver: function(node,index,array) {
        if (node.data.record.data.ObjectID && gApp.getSetting('cardHover')) {
            //Only exists on real items, so do something for the 'unknown' item
            if ( !node.card) {
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
                node.card = card;
            }
            node.card.show();
        } else {
            return;
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
                        record.save().then ( {
                            success: function() {
                                Rally.environment.getMessageBus().publish(Rally.Message.objectUpdate, record, ['PlannedStartDate', 'PlannedEndDate']);
                                
                            }
                        });
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
        if ( gApp._nodes) gApp._nodes = [];
        gApp._kickOff();
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
        }
        if (gApp.getSetting('oneTypeOnly')) {
            gApp._fetchOneType();
        } else {
            if ( gApp.down('#itemSelector').getRecord() !== false ) {
                gApp._getArtifacts( [gApp.down('#itemSelector').getRecord()]);
            }
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
            gApp._fetchOneType();
        }
    },

    _fetchOneType: function() {
        var fetchConfig = gApp._fetchConfig(true);
        fetchConfig.model = gApp._getSelectedType();
        fetchConfig.autoLoad = true;
        fetchConfig.pageSize = 2000;    //Wells Fargo..... Ouch!
        fetchConfig.listeners = {
            load: function(store,records,opts) {
                if (records.length > 0) {
                    if ( gApp._nodes) gApp._nodes = [];
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
        Ext.create ('Rally.data.wsapi.Store', Ext.clone(fetchConfig));
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
            if (record.data._ref === 'root') return null;
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
            .attr("transform","translate(" + gApp._rowHeight + "," +  
                ((gApp.getSetting('showTimeLine')?gApp._rowHeight:0) + (gApp.getSetting('showReleases')?gApp._rowHeight:0)) + ")")
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
        var todayPos = gApp.dateScaler(new Date());
        if ((todayPos > 0) && (todayPos < svg.attr('width'))){
            svg.append('line')
                .attr('x1',todayPos + gApp._rowHeight)
                .attr('y1', 0)
                .attr('x2', todayPos + gApp._rowHeight)
                .attr('y2', svg.attr('height'))
                .attr('class', 'todaysDate');
            svg.append('circle')
                .attr('cx',todayPos + gApp._rowHeight)
                .attr('cy', 2)
                .attr('r', 2)
                .attr('class', 'todaysDate');
        }
    },

    _removeSVGTree: function() {
        if (d3.select("#zoomTree")) {
            d3.select("#zoomTree").remove();
        }
        if (d3.select("#staticTree")) {
            d3.select("#staticTree").remove();
        }
        d3.select('svg').selectAll(".releases").remove();

        //Go through all nodes and kill the cards

    },

    redrawNodeTree: function() {
        gApp._removeSVGTree();
        gApp._enterMainApp();
    },

    //Borrowed from sdk-debug.js
    calculateHealthColor:function(config) {
        var colors = Rally.util.HealthColorCalculator.colors;

        var percentComplete = config.percentComplete * 100;

        //turn dates into days since epoch, so we don't have to do date math
        //also round start date to the beginning of the day, and end date to the end of the day

        var millisecondsInDay = 86400000;

        var startDate = config.startDate;
        var endDate = config.endDate;

        if(Ext.isString(startDate)){
            startDate = new Date(Date.parse(startDate));
        }
        if(Ext.isString(endDate)){
            endDate = new Date(Date.parse(endDate));
        }

        var startDay = startDate.getTime() / millisecondsInDay;
        startDay = Math.floor(startDay);
        var endDay = endDate.getTime() / millisecondsInDay;
        endDay = Math.ceil(endDay) - 0.01;

        var asOfDay = config.asOfDate.getTime() / millisecondsInDay;

        var defaultConfig = {
            acceptanceStartDelay:  (endDay - startDay) * 0.2,
            warningDelay:  (endDay - startDay) * 0.2,
            inProgress: percentComplete > 0
        };

        config = Ext.applyIf(Ext.clone(config), defaultConfig);

        // Special cases
        if (asOfDay < startDay) {
            return colors.white;
        }

        if ((asOfDay >= startDay) &&
            (asOfDay <= (startDay + config.acceptanceStartDelay)) &&
            (! config.inProgress)) {
            return colors.green;
        }

        if (asOfDay >= endDay) {
            if (percentComplete >= 100.0) {
                return colors.gray;
            } else {
                return colors.red;
            }
        }

        // Red
        var redXIntercept = startDay + config.acceptanceStartDelay + config.warningDelay;
        var redSlope = 100.0 / (endDay - redXIntercept);
        var redYIntercept = -1.0 * redXIntercept * redSlope;
        var redThreshold = redSlope * asOfDay + redYIntercept;
        if (percentComplete < redThreshold) {
            return colors.red;
        }

        // Yellow
        var yellowXIntercept = startDay + config.acceptanceStartDelay;
        var yellowSlope = 100 / (endDay - yellowXIntercept);
        var yellowYIntercept = -1.0 * yellowXIntercept * yellowSlope;
        var yellowThreshold = yellowSlope * asOfDay + yellowYIntercept;
        if (percentComplete < yellowThreshold) {
            return colors.yellow;
        }

        // Green
        return colors.green;
    },

    calculateHealthColorForPortfolioItemData: function(recordData, percentDoneFieldName) {
        var today = new Date();
        var config = {
            percentComplete: recordData[percentDoneFieldName],
            startDate: recordData.ActualStartDate || recordData.PlannedStartDate || today,
            asOfDate: today
        };

        if(recordData[percentDoneFieldName] === 1){
            config.endDate = recordData.ActualEndDate || recordData.PlannedEndDate || today;
        } else {
            config.endDate = recordData.PlannedEndDate || today;
        }

        config.inProgress = config.percentComplete > 0;

        return gApp.calculateHealthColor(config).hex;
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