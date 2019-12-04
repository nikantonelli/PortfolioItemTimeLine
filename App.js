(function () {
    var Ext = window.Ext4 || window.Ext;
    gApp = null;

Ext.define('Nik.apps.PortfolioItemTimeline', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    config: {
        defaultSettings: {
            hideArchived: true,
            showTimeLine: true,
            scaleToItems: true,
            showReleases: true,
            showIterations: true,
            showPMilestones: true,
            showGMilestones: true,
            allowMultiSelect: false,
            showFilter: true,
            onlyDependencies: false,
            lowestDependencies: false,
            pointsOrCount: false,
            oneTypeOnly: false,
            cardHover: true,
            startDate: Ext.Date.subtract(new Date(), Ext.Date.DAY, 30),
            endDate: Ext.Date.add(new Date(), Ext.Date.DAY, 150),
            lineSize: 22,
            sortByTeam: true,
            includeStories: true,
            includeDefects: false,
 
        }
    },

    statics: {
        //Be aware that each thread might kick off more than one activity. Currently, it could do three for a user story.
        MAX_THREAD_COUNT: 16,  //More memory and more network usage the higher you go.
        LeftSVGWidth: 100,
        RightSVGWidth: 50,
        AxisSVGHeight: 30,
        TimeboxSVGHeight: 30
    },

    //All these can have dates.
    _defectModel: null,
    _userStoryModel: null,
    _taskModel: null,
    _portfolioItemModels: {},

    listeners: {
        afterrender: function(item) { 
            item.on('resize', function() {
                gApp = item; 
                console.log('Resizing to: ' + item.getSize().width + ',' + item.getSize().height);
                gApp._restartMainApp(gApp._nodeTree);
            });
        }
    },

    getSettingsFields: function() {
        var returned = [
            {
                name: 'hideArchived',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Hide Archived',
                labelAlign: 'top'
            }, 
            {
                name: 'showTimeLine',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show dates at top',
                labelAlign: 'top'
            },
            {
                name: 'scaleToItems',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Scale to Items Selected',
                labelAlign: 'top'
            },
            {
                name: 'showReleases',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Releases at top',
                labelAlign: 'top'
            },
            {
                name: 'showIterations',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Iterations at top',
                labelAlign: 'top'
            },
            {
                name: 'showPMilestones',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Project Milestones',
                labelAlign: 'top'
            },
            {
                name: 'showGMilestones',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Global Milestones',
                labelAlign: 'top'
            },
            {
                name: 'includeStories',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Stories',
                labelAlign: 'top'
            },
            {
                name: 'includeDefects',
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Defects',
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
    CARD_WIDTH:   200,        //Looks silly on less than this
    STORE_FETCH_FIELD_LIST:
        [
            'AcceptedDate',     //For userstories and defects
            'ActualEndDate',
            'ActualStartDate',
            'Blocked', //Default
            'BlockedReason',
            'Children', //Default
            'CreationDate',
            'Defects', //Default
//            'Description',
            'DisplayColor', //Default
            'DragAndDropRank', //Default
            'EndDate',
            'FormattedID', //Default
            'InProgressDate',   //For userstories and defects
            'Iteration', //Default
            'Milestones',
            'Name', //Default
//            'Notes',
            'ObjectID',
            'OrderIndex', 
            'Ordinal',
            'Owner', //Default
            'Parent', //Default
            'PercentDoneByStoryCount',
            'PercentDoneByStoryPlanEstimate',
            'PlannedEndDate',
            'PlannedStartDate',
            'PortfolioItem',     //Default for userstories
            'PortfolioItemType',
            'Predecessors', 
            'PredecessorsAndSuccessors',
            'PreliminaryEstimate', //Default
            'Project', //Default
            'Projects',
//            'Ready', //Default
            'Release', //Default
            'ReleaseDate',
            'ReleaseStartDate',
            'Requirement',
            'RevisionHistory',
            'ScheduleState', //Default
            'StartDate',
            'State',
            'Successors',
            'Tags',
            'UserStories',  //Children of Features
//            'Workspace',
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
            'Parent',
            'PercentDoneByStoryCount',
            'PercentDoneByStoryPlanEstimate',
            'PlanEstimate',
            'PlannedEndDate',
            'PlannedStartDate',
            'PreliminaryEstimate',
            'Project',
            'ScheduleState',
            'State',
            //Customer specific after here. Delete as appropriate
            // 'c_ProjectIDOBN',
            // 'c_QRWP'

        ],

    timer: null,
    
    _resetTimer: function(callFunc) {
        if ( gApp.timer) { clearTimeout(gApp.timer);}
        gApp.timer = setTimeout(callFunc, 2000);    //Debounce user selections to the tune of two seconds
    },

    _nodeTree: null,

    //Continuation point after selectors ready/changed
    _enterMainApp: function() {
        //Get all the nodes and the "Unknown" parent virtual nodes
        var nodetree = gApp._createNodeTree(gApp._nodes);
        gApp._rowHeight = gApp.getSetting('lineSize') || 22;
        gApp._restartMainApp(nodetree);
    },

    /*  We need to force a redraw for a window resize. Remove all the svg items and start again. */
    _restartMainApp: function(nodetree) {
        if (gApp._nodes.length === 0 ) { return; }  //Timer can fire before we have done anything
        var outerSvg = d3.select('svg');
        outerSvg.attr('width', this.getWidth()- 50);
        outerSvg.attr('height', this.getHeight() - 50);


        /**
         * Create an SVG frame for the various bits on screen.  We want to have three boxes (left to right) to hold
         * 1. icons for tree manipulation
         * 2. boxes to represent the items
         * 3. trailing icons to indicate timebox continuation, etc.
         * 
         * All these groups are selectable through d3, therefore not global here. Use d3.select('#scaledSvg')
         * 
         * You have to get the order of the creation correct so that the clicks get to the right objects.
         * 
         **/

        if ( d3.select('#leftSvg')) {
            d3.select('#leftSvg').remove();
        }
        if ( d3.select('#scaledSvg')) {
            d3.select('#scaledSvg').remove();
        }
        if ( d3.select('#rightSvg')) {
            d3.select('#rightSvg').remove();
        }
        var leftSvg = outerSvg.append('g')
            .attr('id', 'leftSvg');

        leftSvg.attr('transform','translate(0,0)') //This starts at the left
            .attr('width', gApp.self.LeftSVGWidth);  

        var scaledSvg = outerSvg.append('g')
            .attr('id', 'scaledSvg');

        var rightSvg = outerSvg.append('g')
            .attr('id', 'rightSvg');

        rightSvg.attr('transform', 'translate(' + (outerSvg.attr('width') - gApp.self.RightSVGWidth) + ',0)')
            .attr('width', gApp.self.RightSVGWidth);
        
        /* Now we need some boxes top to bottom to represent things in the scaled area */

        /* TYhe axisSvg is to leave a clear space at the top for the date labels before we calculate how much space we need.
         * It should never be used for any drawing.... only for calculating a space prior to drawing the date axis.
         */

        var axisSvg = scaledSvg.append('g')
            .attr('id', 'axisSvg')
            .attr('height', gApp.getSetting('showTimeLine')?gApp.self.AxisSVGHeight:0)
            .attr('transform', 'translate(0,0)');

        var timeboxSvg = scaledSvg.append('g')    /* This group is defined, but left blank so that we can overwrite with the dates */
            .attr('id', 'timeboxSvg');

        timeboxSvg.attr('height', (gApp.getSetting('showReleases')?gApp.self.TimeboxSVGHeight:0)+(gApp.getSetting('showIterations')?gApp.self.TimeboxSVGHeight:0))     /* Leave space for dates */
            .attr('transform', 'translate(0,' + axisSvg.attr('height') + ')');    /* Place it after the axisSvg */

        
        scaledSvg.attr('height', gApp._rowHeight *  ((nodetree && nodetree.value)?nodetree.value:1))
            .attr('width', outerSvg.attr('width') - ( gApp.self.LeftSVGWidth + gApp.self.RightSVGWidth))
            .attr('transform', 'translate(' + gApp.self.LeftSVGWidth + ',0)');
        
        scaledSvg.append("g")        
                .attr("id","zoomTree")
                .attr('transform','translate(0,' + (parseInt(d3.select('#axisSvg').attr('height')) + parseInt(d3.select('#timeboxSvg').attr('height'))) +')')
                .attr('width', +scaledSvg.attr('width'))
                .attr('height', +scaledSvg.attr('height'))
                .append('rect')
                .attr('width', +scaledSvg.attr('width'))
                .attr('height', +scaledSvg.attr('height'))
                .attr('class', 'arrowbox')
                .on('click', gApp._setTimeline);
            

        outerSvg.attr('height', parseInt(scaledSvg.attr('height')) + parseInt(axisSvg.attr('height')) + parseInt(timeboxSvg.attr('height')));

        var rs = this.down('#rootSurface');
        rs.getEl().setHeight(outerSvg.attr('height'));
        outerSvg.attr('class', 'rootSurface');

        gApp._startTreeAgain();
    },

    _redrawChildren: function() {
        gApp._sumNodeTree(gApp._nodeTree);
        d3.selectAll('.dependencyGroup').remove();
        gApp._removeSVGTree();
        gApp._restart();
    },

    _closeChildren: function(d) {
        if (d.children !== null) {  //Need this here in case we call close when we are already closed
            d._children = d.children;
            d.children = null;
            d._value = d.value;
            d.value = 1;
        }
    },

    _openChildren: function(d) {
        if (d._children !== null) {
            d.children = d._children;
            d._children = null;    
            d.value = d._value;
            d._value = 1;
        }
    },

    _switchChildren: function(d) {
        if ( d.children) {
            gApp._closeChildren(d);
        } else {
            gApp._openChildren(d);
        }
        gApp._redrawChildren();
    },

    _itemTreeClick: function(d) {
        var openClose = (d.children === null);
        //Shut/open this parents children only
        if (d3.event.altKey === true)  {
            if (d.parent) {
                _.each(d.parent.children, function(e){
                    var p = (openClose ===true)? gApp._openChildren(e):gApp._closeChildren(e);
                });
            }
            gApp._redrawChildren();
        } 
        //Shut/open all on this level
        else if (d3.event.metaKey === true) {
            gApp._nodeTree.each( function(e) {
                if (e.depth === d.depth) {
                    var q = (openClose === true)? gApp._openChildren(e):gApp._closeChildren(e);
                }
            });
            gApp._redrawChildren();
        }
        //Just change this one
        else {
            gApp._switchChildren(d);
        }

        return true;
    },

    _dateRangeOfItems: function() {

        var timeBegin = null;
        var timeEnd = null;
        gApp._nodeTree.each( function(node) {

            /** Check the type of artefact: Portfolio items use PlannedStartDate, PlannedEndDate
             * Userstories use iteration dates if no AcceptedDate, or InProgressDate, AcceptedDate if valid
             * Defects will do the same
             * */
            var dateStart = null;
            var dateEnd = null;

            var dates = gApp._calcGroupTranslate(node);
            dateStart = dates.startX;
            dateEnd = dates.endX;
        
            if ((timeBegin === null) || ((dateStart !== null) && (dateStart < timeBegin))) { timeBegin = dateStart;}
            if ((timeEnd   === null) || ((dateEnd   !== null) && (dateEnd   > timeEnd  ))) { timeEnd   = dateEnd  ;}
        });

        return ( [ timeBegin, timeEnd] );
    },

    _initialiseScale: function() {

        var timeBegin = new Date(gApp.getSetting('startDate')) || Ext.Date.subtract(new Date(), Ext.Date.DAY, gApp.startDate);
        var timeEnd =  new Date(gApp.getSetting('endDate')) || Ext.Date.add(new Date(), Ext.Date.DAY, gApp.endDate);

        if (gApp.getSetting('scaleToItems')){
            var dateRange = gApp._dateRangeOfItems();
            timeBegin = dateRange[0] || timeBegin;        
            timeEnd = dateRange[1] || timeEnd;
        }
        console.log('Initialising Scale to: ', timeBegin, timeEnd);
        gApp._setTimeScaler(timeBegin,timeEnd);
    },

    _setTimeScaler: function(timebegin, timeend){
        gApp.dateScaler = d3.scaleTime()
            .domain([
                timebegin, timeend
            ])
            .range([0, +d3.select('#scaledSvg').attr('width') ]);
    },

    _setAxis: function() {
        if (gApp.gX) { gApp.gX.remove(); }
        var svg = d3.select('#scaledSvg');
        var width = +svg.attr('width');
        /* The height is that of the total svg not just the scaled one */
        var height = +d3.select('svg').attr('height');
        gApp.xAxis = d3.axisBottom(gApp.dateScaler)
            .ticks((width + 2)/80)
            .tickSize(height)
            .tickPadding(gApp.getSetting('showTimeLine')? (8 - height):0);
        gApp.gX  = d3.select('#axisSvg').append('g');
        gApp.gX.attr("class", 'axis')
            .call(gApp.xAxis);    
    },

    _restart: function() {
        gApp._addSVGTree();
        if (gApp.getSetting('showReleases')) { gApp._getReleases(); }
        if (gApp.getSetting('showIterations')) { gApp._getIterations(); }
        gApp._refreshTree();
    },

    _findIterationInStore: function(startDate) {
        var iterations = gApp._IterationStore ? gApp._IterationStore.getRecords() : [];

        return _.find(iterations, function(iter) {
            return (iter.get('StartDate') < startDate) && ( iter.get('EndDate') > startDate);
        });
    },

    _IterationStore: null,

    _getIterations: function() {
        if (gApp._IterationStore !== null) { 
            gApp._setIterations(gApp._IterationStore.getRecords())
            return;
        }

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            autoLoad: true,
            context: {
                projectScopeDown: false,
                projectScopeUp: false
            },
            filters: [
                {
                    property: 'EndDate',
                    operator: '>',
                    value: gApp.dateScaler.invert(0)
                },
                {
                    property: 'StartDate',
                    operator: '<',
                    value: gApp.dateScaler.invert(+d3.select('#scaledSvg').attr('width'))
                }

            ],
            sorters: [

                {
                    property: 'StartDate',
                    direction: 'ASC'
                }
            ],
            listeners: {
                load: function(store, records, opts) {
                    if (store.getRecords().length) {
                        gApp._IterationStore = store;
                        gApp._setIterations(records);
                    }
                }
            }
        });
    },

    _findReleaseInStore: function(startDate) {
        var releases = gApp._ReleaseStore ? gApp._ReleaseStore.getRecords() : [];

        return _.find(releases, function(rel) {
            return (rel.get('ReleaseStartDate') < startDate) && ( rel.get('ReleaseDate') > startDate);
        });
    },

    _ReleaseStore: null,

    _getReleases: function() {
        if ( gApp._ReleaseStore !== null) { 
            gApp._setReleases(gApp._ReleaseStore.getRecords());
            return;
        }
        
        Ext.create('Rally.data.wsapi.Store', {
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
                    value: gApp.dateScaler.invert(+d3.select('#scaledSvg').attr('width'))
                }

            ],
            sorters: [

                {
                    property: 'ReleaseStartDate',
                    direction: 'ASC'
                }
            ],
            listeners: {
                load: function(store, records, opts) {
                    if (store.getRecords().length) {
                        gApp._ReleaseStore = store;
                        gApp._setReleases(records);
                    }
                }
            }
        });
    },

    _setReleases: function(records) {
        
        if (d3.select('#releaseGroup')) {
            d3.select('#releaseGroup').remove();
        }
        var relGroup = d3.select('#timeboxSvg').append('g')
            .attr('id',"releaseGroup");
        var relGroups = relGroup.selectAll('.releases').data(records)
            .enter().append('g')
            .attr('class', 'releases');

        relGroups.attr('transform', function(rel) {
            rel.x = gApp.dateScaler(new Date(rel.get('ReleaseStartDate')));
            rel.x = (rel.x<0?0:rel.x) ;
            return 'translate(' + rel.x + ',0)';}   //Move over by 2px and make 2px smaller in width below
        );
        relGroups.append('rect')
            .attr('height', d3.select('svg').attr('height'))
            .attr('width', function(rel) {
                var end = gApp.dateScaler(new Date(rel.get('ReleaseDate')));
                end = (d3.select('#scaledSvg').attr('width')<end)?d3.select('#scaledSvg').attr('width'):end;
                rel.width = end - rel.x;
                return rel.width<4?2:rel.width;
            })
            .attr('class', function( rel, idx, arr) {
                return 'q' + (idx%2) + '-' + 2;
            })
            .attr('opacity', gApp.getSetting('showIterations')?0.3:0.5);
        relGroups.append('text')
            .attr('x', function(rel) { return rel.width/2;})
            .attr('y', function(rel) {
                return (gApp.self.TimeboxSVGHeight/2);
            })
            .attr('class', 'normalText')
            .text( function(rel) {
                var title = rel.get('Name');
                return (rel.width > 85)? title: ((rel.width > 80)?(title.substr(0,4) + '...' + title.substr(-4,4)):'');
            })
            .style("text-anchor", 'middle')
            .attr('alignment-baseline', 'central')
            .on('click', function(rel) {
                gApp._setTimeline(rel);
            });

    },

    _setIterations: function(records) {
        
        if (d3.select('#iterationGroup')) {
            d3.select('#iterationGroup').remove();
        }
        var iterGroup = d3.select('#timeboxSvg').append('g')
            .attr('id',"iterationGroup");
        var iterGroups = iterGroup.selectAll('.iterations').data(records)
            .enter().append('g')
            .attr('class', 'iterations');

        iterGroups.attr('transform', function(rel) {
            rel.x = gApp.dateScaler(new Date(rel.get('StartDate')));
            rel.x = (rel.x<0?0:rel.x) ;
            return 'translate(' + rel.x + ',' + (gApp.getSetting('showReleases')?gApp.self.TimeboxSVGHeight:'0') +')';}   //Move over by 2px and make 2px smaller in width below
        );
        iterGroups.append('rect')
            .attr('height', d3.select('svg').attr('height'))
            .attr('width', function(rel) {
                var end = gApp.dateScaler(new Date(rel.get('EndDate')));
                end = (d3.select('#scaledSvg').attr('width')<end)?d3.select('#scaledSvg').attr('width'):end;
                rel.width = end - rel.x;
                return rel.width<4?2:rel.width;
            })
            .attr('class', function( rel, idx, arr) {
                return idx%2 ? 'odd': 'even';
            });
        iterGroups.append('text')
            .attr('x', function(rel) { return rel.width/2;})
            .attr('y', function(rel) {
                return (gApp.self.TimeboxSVGHeight/2);
            })
            .attr('class', 'normalText')
            .text( function(rel) {
                var title = rel.get('Name');
                return (rel.width > 85)? title: ((rel.width > 80)?(title.substr(0,4) + '...' + title.substr(-4,4)):'');
            })
            .style("text-anchor", 'middle')
            .attr('alignment-baseline', 'central')
            .on('click', function(rel) {
                gApp._setTimeline(rel);
            });

    },

    _startTreeAgain: function() {
        gApp._initialiseScale();
        gApp._rescaledStart();

    },
    _rescaledStart: function() {
        gApp._removeSVGTree();
        gApp._setAxis();
        gApp._restart();
    },

    _setTimeline: function(d) {

        if (!d) {
            gApp._startTreeAgain();
        } else {
            var dates = gApp._calcGroupTranslate(d);
            if (dates.startX && dates.endX) {
                gApp._setTimeScaler(
                    dates.startX,
                    dates.endX
                );
            }
            gApp._rescaledStart();
        }
    },

    _dragEnd: function(d, idx, arr) {
        
        if (d3.event.x === d.dragInitStart ) { return; }

        //Now we have finished dragging, set up our initial x again
        if ( d.data.record.data._type.toLowerCase().includes('portfolioitem/')) {
            d.data.record.set('PlannedStartDate', d.dragStart);
            d.data.record.set('PlannedEndDate', d.dragEnd);
        }
        else {
            //Find which iteration contains this date and change the record to that.
            if (gApp.getSetting('showIterations')){
                var iteration = gApp._findIterationInStore(d.dragStart);
                if ( iteration ) {d.data.record.set('Iteration', iteration);}
                else { debugger;}
            }
            if (gApp.getSetting('showReleases')){
                var release = gApp._findReleaseInStore(d.dragStart);
                if ( release ) {d.data.record.set('Release', release);}
                else { debugger;}
            }
        }

        // Add/update this record in the array of changes
        _.remove(gApp._changedItems, function( item ) {
            return d.data.record.get('FormattedID') === item.get('FormattedID');
        });
        gApp._changedItems.push(d.data.record);
        if (gApp.down('#saveRecords')) { gApp.down('#saveRecords').enable(); }
        if (gApp.down('#dropRecords')) { gApp.down('#dropRecords').enable(); }
//        gApp._restart();
    },

    _dragStart: function(d, idx, arr) {
        //Disable popups, hovers and cards?
        if (d.data.card) { 
            d.data.card.destroy();
            d.data.card = null;
        }
        d.dragInitStart = d3.event.x;        
    },

    _dragged: function(d,idx,arr) {
        if ( d.data.record.data._type.toLowerCase().includes('portfolioitem/')) {
            d.dragStart = 
                Ext.Date.add( new Date( d.data.record.get('PlannedStartDate')? d.data.record.get('PlannedStartDate') : gApp.dateScaler.invert(d.dragInitStart)
                    ), Ext.Date.MILLI,
                gApp.dateScaler.invert(d3.event.x) - gApp.dateScaler.invert(d.dragInitStart));
                
            d.dragEnd =
                Ext.Date.add( new Date( d.data.record.get('PlannedEndDate')?d.data.record.get('PlannedEndDate'): gApp.dateScaler.invert(d.dragInitStart)
                    ), Ext.Date.MILLI,
                gApp.dateScaler.invert(d3.event.x) - gApp.dateScaler.invert(d.dragInitStart));
        }
        else {
                d.dragStart =  
                    Ext.Date.add( d.startX, Ext.Date.MILLI, gApp.dateScaler.invert(d3.event.x) - gApp.dateScaler.invert(d.dragInitStart));
                    
                d.dragEnd =
                    Ext.Date.add( d.endX,   Ext.Date.MILLI, gApp.dateScaler.invert(d3.event.x) - gApp.dateScaler.invert(d.dragInitStart));
        }
        console.log('Dragging: ' + d.data.record.data.FormattedID + ' to ' + d.dragStart + ',' + d.dragEnd);
        arr[idx].setAttribute('class', gApp._getGroupClass(d));
        arr[idx].setAttribute('transform', gApp._setGroupTranslate(d, d.dragStart, d.dragEnd));
        //Whilst we drag, we need to keep the ones 'off the end' to the right size
        arr[idx].getElementsByClassName('dragTarget')[0].setAttribute('width', d.drawnWidth);
    },

    _itemMenu: function(d) {
        Rally.nav.Manager.edit(d.data.record);
    },

    _getGroupClass: function(d) {
        var rClass = 'nodeGroup clickable' + ((d.children || d._children)?' children':'');
//        if ( d.data.record.data._type.toLowerCase().includes('portfolioitem/')) {
            rClass += ' draggable';
//        }
        if (gApp._schedulingErrors(d)) {
            rClass += ' data--errors';
        }
        return rClass;
    },

    _initGroupTranslate: function(d) {
        var dates = gApp._calcGroupTranslate(d);
        d.startX = dates.startX;
        d.endX = dates.endX;
    },

    _calcGroupTranslate: function(node) {

        var data = node.data;
        var d = {
            startX: null,
            endX: null
        };

        //If we are a releease or an iteration, we won't have a proper node setup - just the timebox as 'node'
        if (data && data.ObjectID) { 
            //We are a timebox
            if (data._type === 'release') {
                d.startX = data.ReleaseStartDate;
                d.endX = data.ReleaseDate;
            }
            else if (data._type === 'iteration') {
                d.startX = data.StartDate;
                d.endX = data.EndDate;
            }
        }
        else if (data.record.data._ref !== "root"){
            data = node.data.record.data;
            
            if (data._type.toLowerCase().includes('portfolioitem/')){
                d.startX = data.PlannedStartDate?new Date(data.PlannedStartDate):new Date();
                d.endX = data.PlannedEndDate?new Date(data.PlannedEndDate):d.startX;
            }
            else if (data.Iteration) {
                d.startX = data.Iteration.StartDate? new Date( data.Iteration.StartDate):null;
                d.endX = data.Iteration.EndDate?new Date(data.Iteration.EndDate):null;
            }
            else if (data.InProgressDate){
                d.startX = new Date(data.InProgressDate);
                d.endX = data.AcceptedDate?new Date(data.AcceptedDate):null;
            }
            else {
                d.startX = new Date();
                d.endX = d.startX;
//                d.endX = Ext.Date.add(d.startX, Ext.Date.DAY, 7)    //Make an unknown story stretch a week from today
            }
        }
        return d;
        
    },

    _setGroupTranslate: function(d, start, end){
        var x = gApp.dateScaler(start);
        var e = gApp.dateScaler(end);
        d.drawnX = (x<0?0:x);
        d.drawnY = ((d.x0 * (gApp._rowHeight *  gApp._nodeTree.value)) + (d.depth*gApp._rowHeight));
        d.drawnWidth = e - d.drawnX;
        d.drawnWidth = d.drawnWidth<=0?gApp._rowHeight:d.drawnWidth;
        var retval =  "translate(" + d.drawnX + "," + d.drawnY + ")";
        return retval;
    },
    
    _getFontSize: function() {
        return ((gApp._rowHeight>22)?(gApp._rowHeight-12): 10).toString(); //Smallest font of 8
    },

    _refreshTree: function(){

        console.log(gApp._nodeTree);
        var nodetree = d3.partition()(gApp._nodeTree);
        var healthField = gApp.getSetting('pointsOrCount')?'PercentDoneByStoryCount':'PercentDoneByStoryPlanEstimate';
        
        nodetree.eachBefore(gApp._initGroupTranslate);

        //When we come here and the "oneTypeOnly flag is set, we will have a 'root' node with no data
        //We need to ignore this and not draw anything", so we use 'filter' to remove
        
        //Let's scale to the dateline
        var nodeGroups = d3.select('#zoomTree').selectAll(".nodeGroup")
            .data(nodetree.descendants());

        var node = nodeGroups.enter().filter(
                function(d) {
                    if (d.id === "root") { return false; }
                    return true;
                }
            )
            .append("g")
                .attr('class', gApp._getGroupClass) //Call it directly, allowing d3 to pass in node
                .attr('id', function(d) { return 'group-' + d.data.Name;})
                .call(d3.drag()
                    .on('drag', gApp._dragged)
                    .on('end', gApp._dragEnd)
                    .on('start', gApp._dragStart)
                )
                .attr( 'transform', function(d) {
                    var gt = gApp._setGroupTranslate(d, d.startX, d.endX);
                    return gt;
                });

        nodeGroups.exit().remove();

        var defs = node.append('defs')
            .append('linearGradient')
            .attr('id', function(d) {
                return 'lg' + d.data.record.get('FormattedID');
            });

            defs.append('stop')
            .attr('offset', function(d) {
                if (d.data.record.data._type.toLowerCase().includes('portfolioitem/')) {
                    return (d.data.record.get(healthField)*100).toString() + "%";
                }
                else {
                    return '100%';
                }
            })
            .attr('stop-color', function(d) { 
                if (d.data.record.data._type.toLowerCase().includes('portfolioitem/')) {
                    return gApp.calculateHealthColorForPortfolioItemData(d.data.record.data, healthField ); 
                }
                else {
                    if ( d.data.record.data.AcceptedDate) {
                        return '#e0e0e0';
                    }
                    else {
                        return '#ffffff';
                    }
                }

            });

            defs.append('stop')
            .attr('offset', function(d) {
                if (d.data.record.data._type.toLowerCase().includes('portfolioitem/')) {
                    return (d.data.record.get(healthField)*100).toString() + "%";
                }
                else {
                    return '100%';
                }
            })
            .attr('stop-color', "#fff");
//            defs.append('opacity', 0.3);
                

        var drags = node.append('rect')
            .attr('rx', gApp._rowHeight/2)
            .attr('ry', gApp._rowHeight/2)
            .attr('y', 2)
            .attr('width', function(d) { return d.drawnWidth; })
            .attr('height',gApp._rowHeight-4)
            .attr('fill', function(d) { return "url(#lg" + d.data.record.get('FormattedID') + ')';  })
//            .attr('opacity', 0.5)
            .attr('stroke', function(d) {
                return d.data.record.get('DisplayColor');
            })
            .attr('stroke-width',2)
            .attr('class',  'clickable dragTarget')
            .on('mouseover', function(d, idx, arr) { gApp._nodeMouseOver(d, idx, arr);})
            .on('mouseout', function(d, idx, arr) { gApp._nodeMouseOut(d, idx, arr);})

            .attr('id', function(d) { return 'rect-'+d.data.Name;})
        ;
        node.append('circle')
        .attr('cx', gApp._rowHeight/2 - 2)
        .attr('cy', gApp._rowHeight/2)
        .attr('r', gApp._rowHeight/2 - 2)
        .attr('fill', function(d) {
            return d.data.record.get('DisplayColor');
        });
    //Add clipPath here
        var cp = node.append('clipPath')
            .attr('id', function(d) { return 'clipPath-'+d.data.Name;});

        cp.append('rect')
            //Allow a little thing you can hover over, or show the whole text
            //if the bar is missing completely
            .attr('width', function(d) { return (d.drawnWidth>gApp._rowHeight)?d.drawnWidth:+d3.select('#scaledSvg').attr('width'); })
            .attr('height',gApp._rowHeight)
            .attr('class', 'arrowbox')
            .attr('id', function(d) { return 'arrow-'+d.data.Name;})
            ;

        node.append('text')
            .attr('y', gApp._rowHeight/2)  //Should follow point size of font
            .attr('x', ((gApp._rowHeight - gApp._getFontSize())/2)-1)   //Icon is offset.... doh!
            .attr('alignment-baseline', 'central')
            .style("text-anchor", 'middle')
            .text(';')
            .attr('style', 'font-size:' + (gApp._getFontSize() - 2))
            .attr('class', function(d) {
                var lClass = 'icon-gear icon-gear-white';
                if ( !d.startX|| !d.endX){
                    lClass = 'error ' + lClass;
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
            .attr('style', 'font-size:' + gApp._getFontSize())
            .on('click', function(d, idx, arr) {
                //Browsers get confused over the shift key (think it's 'selectAll')
                if (d3.event.altKey) {
                    gApp._dataPanel(d,idx,arr);
                } else {
                    gApp._setTimeline(d);
                }
            })
            .text(function(d) { return d.data.record.get('FormattedID') + ": " + d.data.record.get('Name');});
            
        d3.selectAll('.children').append('text')
            .attr('x', function(d) { return -(gApp._rowHeight);})   //Leave space for up/down arrow
            .attr('y', gApp._rowHeight/2)
            .attr('class', function(d) {
                var lClass = 'icon-gear app-menu';
                if ( !d.startX || !d.endX){
                    lClass = 'error ' + lClass;
                }
                return lClass;
            })
            .attr('style', 'font-size:' + (gApp._getFontSize()-1))
            .attr('alignment-baseline', 'central')
            .text(function(d) { return d.children?'9':'8';})
            .on('click', function(d, idx, arr) { gApp._itemTreeClick(d);});


        nodetree.each(function(d) {
            //Now add the dependencies lines
            if (!d.data.record.data.ObjectID) { return; }
            var deps = d.data.record.get('Successors');
            if (deps && deps.Count) {
                gApp._getSuccessors(d.data.record).then (
                    {
                        success: function(succs) {
                            d.dependencies = succs;
                            //Draw a circle on the end of the first one and make it flash if I can't find the other end one
                            _.each(succs, function(succ) {
                                var e = gApp._findTreeNode(gApp._getNodeTreeRecordId(succ));
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
                                var zoomTree = d3.select('#zoomTree');
                                var pathGroup = zoomTree.select('#dep'+ d.data.Name +'-'+ targetName);
                                if (pathGroup) {
                                    pathGroup.remove();
                                }
                                pathGroup = zoomTree.append('g')
                                    .attr('id', 'dep'+ d.data.Name +'-'+ targetName)
                                    .attr('visibility', gApp.down('#showDeps').value?'visible': 'hidden')
                                    .attr('class', zClass + ' dependencyGroup');

                                //Stuff without end point
                                var source = d3.select('#group-'+d.data.Name);
                                var txf = gApp._parseTransform(source.attr('transform'));

                                /** If we get the group as the item relative to the zoomTree, then we can't get the visible width
                                 * we get given the bounding box of everything including those not shown because of the clipPath.
                                 * Get a different object to get the shown width.
                                 **/
                                var box = d3.select ('#rect-'+d.data.Name);
                                var x0 = +txf.translate[0] + box.node().getBBox().width;  //Start at the end of the box
                                var y0 = +txf.translate[1] + gApp._rowHeight/2; //In the middle of the row
                                pathGroup.append('circle')
                                    .attr('cx', x0)
                                    .attr('cy', y0)
                                    .attr('r', 3)
                                    .attr('id', 'circle-'+d.data.Name+'-start')
                                    .on('mouseover', function(a, idx, arr) {    //'a' refers to the wrong thing!
                                        gApp._createDepsPopover(d, arr[idx], 1);})    //Default to successors
                                    .attr('class', zClass);

                                if (e) {
                                    //Stuff that needs endpoint
                                    var target = d3.select('#group-'+ targetName);
                                    txf = gApp._parseTransform(target.attr('transform'));

                                    var x1 = +txf.translate[0];
                                    var y1 = +txf.translate[1] + gApp._rowHeight/2 ;

                                    pathGroup.append('circle')
                                        .attr('cx', x1)
                                        .attr('cy', y1)
                                        .attr('r', 3)
                                        .attr('id', 'circle-'+targetName+'-end')
                                        .on('mouseover', function(a, idx, arr) { gApp._createDepsPopover(e, arr[idx], 0);})    //Default to successors
                                        .attr('class', zClass);
                        
                                    zClass += (zClass.length?' ':'') + 'dashed' + (d.data.record.data._type.toLowerCase().includes('portfolioitem/')?(d.data.record.get('PortfolioItemType').Ordinal + 1).toString(): '0');
                                    
                                    if (    gApp.getSetting('oneTypeOnly') ||  
                                        !gApp.getSetting('lowestDependencies') || 
                                            (d.data.record.get('PortfolioItemType').Ordinal === 0)
                                    ) {
                                        pathGroup.append('path')
                                            .attr('d', 
                                                'M' + x0 + ',' + y0 + 
                                                'C' + (x0+80) + ',' + y0  +
                                                ' ' + (x1-80) + ',' + y1 +
                                                ' ' + x1 + ',' + y1) 
                                            .attr('class', zClass);

                                    }
                                }
                            });
                        }
                    }
                );
            }
        });
        gApp.setLoading(false);
    },

    _parseTransform: function(a) {
        var b = {};
        for (var i in a = a.match(/(\w+)\(([^,)]+),?([^)]+)?\)/gi)) {
            var c = a[i].match(/[\w\.\-]+/g);
            b[c.shift()] = c;
        }
        return b;
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
    
    _schedulingErrors: function(d, start, end ) {
        if ( !d.parent || !d.parent.data.record.data.ObjectID ) { return false; }  //Top level item doesn't have a parent

        //Need to vet the defects and userstories
        if ( d.data.record.data._type.toLowerCase().includes('portfolioitem/')){
            var childStart = (start === undefined)? d.startX : start;
            var childEnd = (end === undefined)? d.endX : end;
            if ( d.parent.data.record.data.ObjectID) {
                return  (!d.startX ||  !d.endX) ||
                        (childEnd > d.parent.endX) ||
                        (childStart < d.parent.startX);
            } 
        }
        else {
            var dates = gApp._calcGroupTranslate(d);   //Get the dates of the item (non-draggable, so start, end args ignored)
            if (!dates.startX || !dates.endX) {return true;}

            /* WE DO NOT SUPPORT stories as children of stories. If you are using this mechanism: DON'T and speak to Rally about
             * how to do it properly
             */
            if ( d.data.record.data._type.toLowerCase() === 'hierarchicalrequirement') {
                return  (!d.parent.startX || !d.parent.endX) ||
                        (dates.startX > d.parent.endX) ||
                        (dates.endX   < d.parent.startX) ||
                        (dates.endX   > d.parent.endX);
            }
            /* This is a defect at this point, so we need to check whether it is scheduled
            */
           return (!d.data.record.data.Iteration);

        }
        return false;   //Err on the side of caution if we have a mistake in our code
    },

    _sequenceError: function(a, b) {
        return (a.endX > b.startX );
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
        if (node.data.record.data.ObjectID && gApp.getSetting('cardHover')) {
            //Only exists on real items, so do something for the 'unknown' item
            if ( !node.data.card) {
                var card = Ext.create('Rally.ui.cardboard.Card', {
                    'record': node.data.record,
                    fields: gApp.CARD_DISPLAY_FIELD_LIST,
                    constrain: false,
                    closable: true,
                    width: gApp.CARD_WIDTH,
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
                            setTimeout(function() {
                                card.hide();
                            }, 10000);  //Ten second delay and then switch it off
                        }
                    }
                });
                node.data.card = card;
            }
            node.data.card.show();
        } else {
            return;
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
    //Entry point after creation of SVG render box
    _onElementValid: function(rs) {
        gApp.timeboxScope = gApp.getContext().getTimeboxScope(); 
        
        //Add any useful selectors into this container ( which is inserted before the rootSurface )
        //Choose a point when all are 'ready' to jump off into the rest of the app
        var hdrBox = this.down('#headerBox');
        
        hdrBox.add( 
            {
                xtype:  'rallyportfolioitemtypecombobox',
                itemId: 'piType',
                fieldLabel: 'Choose Portfolio Type :',
                labelWidth: 100,
                margin: '5 0 5 20',
                defaultSelectionPosition: 'first',
                storeConfig: {
                    listeners: {
                        load: function(store,records) {
                            // Load the models into our app
                            _.each(records, function(modeltype) {
                                Rally.data.ModelFactory.getModel({
                                    type: modeltype.get('TypePath'),
                                    fetch: true,
                                    success: function(model) {
                                        gApp._portfolioItemModels[modeltype.get('ElementName')] = model;
                                    }
                                });
                            });
                        }
                    }
                },
                listeners: {
                    select: function() { gApp._kickOff();},    //Jump off here to add portfolio size selector
                }
            }
        );

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

                    if (!record.data._type.startsWith('portfolioitem/')){
                        if ( gApp.getSetting('showIterations')) {
                            record.newIteration = record.get('Iteration');
                            record.set('Iteration', record.get('Iteration').get('_ref'));
                        }
                        if ( gApp.getSetting('showReleases')) {
                            record.newRelease = record.get('Release');
                            record.set('Release', record.get('Release').get('_ref'));
                        }
                    }
                    record.save().then ( {
                        success: function() {
                            if (record.data._type.startsWith('portfolioitem/')) {
                                Rally.environment.getMessageBus().publish(Rally.Message.objectUpdate, record, ['PlannedStartDate', 'PlannedEndDate']);
                            }
                            else {
                                Rally.environment.getMessageBus().publish(Rally.Message.objectUpdate, record, ['Iteration']);
                            }
                            gApp._objectUpdated(record);
                        },
                        failure: function(e) {
                            console.log("Save on buttonclick failed", e);
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
                            console.log('Resetting data for: ' + record.get('FormattedID'));
                            var d = gApp._findTreeNode(gApp._getNodeTreeRecordId(record));
                            d.data.card = null; //Drop the card and re-create on next hover.
                            d.data.record = record;
                            gApp._startTreeAgain();
                        },
                        failure: function(){
                            console.log("Restore record on buttonclick failed");
                        }
                    });
                });
                gApp._changedItems = [];
                this.disable();
                saveButton.disable();
            }
        });

        Ext.define('depsType', {
            extend: 'Ext.data.Model',
            fields: [
                'value',
                'name'
            ]
        });

        var depsTypeStore = Ext.create('Ext.data.Store', {
            model: 'depsType',
            data: [
                { value: 0, name: 'None'},
                { value: 1, name: 'All'},
                { value: 2, name: 'Features Only'},
                { value: 3, name: 'User Stories Only'},
                { value: 4, name: 'Portfolio Item Only'},
            ],
            proxy: {
                type: 'ajax',
                url: 'depsType.json',
                reader: {
                    type: 'json',
                    root: 'depsType'
                }
            },
            autoLoad: true
        });
        var depsTypeSelector = Ext.create('Ext.form.field.ComboBox', {
//            queryMode: 'local',
            margin: 5,
            name: 'showDeps',
            id: 'showDeps',
            store: depsTypeStore,
            valueField: 'value',
            displayField: 'name',
            fieldLabel: 'Show Dependencies',
            listeners: {
                select: function() {
                    switch(this.value) {
                        case 0: {
                            d3.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                            break;
                        }
                        case 1: {
                            d3.selectAll('.dependencyGroup').attr('visibility', 'visible');
                            break;
                        }
                        case 2: {
                            //Turn them all off and then turn on the ones you want
                            d3.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                            // We need to filter on the type of the node, not the SVG group
                            gApp._nodeTree.each( function(d) {
                                if ((d.data.record.data._type.startsWith('portfolioitem/')) &&
                                    (d.data.record.data.PortfolioItemType.Ordinal === 0)) {
                                        var dDeps = d3.selectAll('[class~=dependencyGroup]').filter(function() {
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
                            d3.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                            // We need to filter on the type of the node, not the SVG group
                            gApp._nodeTree.each( function(d) {
                                if (d.data.record.data._type.toLowerCase() === 'hierarchicalrequirement') {
                                        var dDeps = d3.selectAll('[class~=dependencyGroup]').filter(function() {
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
                            d3.selectAll('.dependencyGroup').attr('visibility', 'hidden');
                            // We need to filter on the type of the node, not the SVG group
                            gApp._nodeTree.each( function(d) {
                                if (d.data.record.data._type.startsWith('portfolioitem/')) {
                                        var dDeps = d3.selectAll('[class~=dependencyGroup]').filter(function() {
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
                }
            }
        });

        hdrBox.add( depsTypeSelector);
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
        gApp._kickOff();
    },

    _onFilterChange: function(inlineFilterButton){
        gApp.advFilters = inlineFilterButton.getTypesAndFilters().filters;
        inlineFilterButton._previousTypesAndFilters = inlineFilterButton.getTypesAndFilters();
        if ( gApp._nodes.length) {
            gApp._clearNodes();
        }
        if (gApp.getSetting('oneTypeOnly')) {
            gApp._fetchOneType();
        } else {
            if ( gApp.down('#itemSelector').getRecord() !== false ) {
                gApp.setLoading("Fetching Artefacts....");
                gApp._getArtifacts( [gApp.down('#itemSelector').getRecord()], true);
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
            var filters = [];
            var storeConfig = gApp._fetchPIConfig(true);
            storeConfig.models = [ 'portfolioitem/' + ptype.rawValue ];
            storeConfig.context = gApp.getContext().getDataContext();
            storeConfig.autoLoad = true;
            storeConfig.pageSize = 200;
            
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
                storeConfig: storeConfig,
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
                        gApp.setLoading("Fetching Artefacts....");
                    }
                    gApp._getArtifacts(records, true);
                }
            });
        }   

//        Ext.util.Observable.capture( is, function(event) { console.log('event', event, arguments);});
        if(gApp.getSetting('showFilter') && !gApp.down('#inlineFilter')){
            hdrBox.add({
                xtype: 'rallyinlinefiltercontrol',
                name: 'inlineFilter',
                itemId: 'inlineFilter',
                margin: 5,                           
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
                        inlinefilterchange: this._onFilterChange,   //This gets called on set up and then kicks off everything
                        inlinefilterready: this._onFilterReady,
                        scope: this
                    } 
                }
            });
        }
//        if (gApp.getSetting('oneTypeOnly')){
            //Get the records you can see of the type set in the piType selector
            //and call _getArtifacts with them.
  //          gApp._fetchOneType();
  //      }
    },

    _fetchOneType: function() {
        gApp.setLoading("Fetching Artefacts....");
        var fetchConfig = gApp._fetchPIConfig(true);
        fetchConfig.model = gApp._getSelectedType();
        fetchConfig.autoLoad = true;
        fetchConfig.pageSize = 2000;    //Wells Fargo..... Ouch!
        fetchConfig.listeners = {
            load: function(store,records,opts) {
                gApp._clearNodes();
                if (records.length > 0) {
                    gApp._nodes.push({'Name': 'Combined View',
                        'record': {
                            'data': {
                                '_ref': 'root',
                                '_type': 'root',
                                'Name': ''
                            }
                        },
                        'local':true
                    });
                    gApp._getArtifacts(records, gApp.getSetting('includeStories')|| gApp.getSetting('includeDefects'));
                }
                else {
                    gApp.setLoading(false);
                }
            },
            change: function (a,b,c,d,e,f) {
                console.log('change: ',arguments);
            }
        };
        Ext.create ('Rally.data.wsapi.Store', Ext.clone(fetchConfig));
    },

    _clearNodes: function() {
        if (gApp._nodes) {
            gApp._removeCards();
            gApp._nodes = [];
        }
    },

    _fetchPIConfig: function(lowest){
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

    _recordsToProcess: [],
    _runningThreads: [],
    _lastThreadID: 0,

    _threadCreate: function() {

        var workerScript = worker.toString();
        //Strip head and tail
        workerScript = workerScript.substring(workerScript.indexOf("{") + 1, workerScript.lastIndexOf("}"));
        var workerBlob = new Blob([workerScript],
            {
                type: "application/javascript"
            });
        var wrkr = new Worker(URL.createObjectURL(workerBlob));
        var thread = {
            lastCommand: '',
            worker: wrkr,
            state: 'Initiate',
            id: ++gApp._lastThreadID,
        };

        gApp._runningThreads.push(thread);
        wrkr.onmessage = gApp._threadMessage;
        gApp._giveToThread(thread, {
            command: 'initialise',
            id: thread.id,
            fields: gApp.STORE_FETCH_FIELD_LIST.concat([gApp._getModelFromOrd(0).split("/").pop()])
        });
    },

    _makeModel: function(item) {
        switch (item._type.toLowerCase()) {
            case 'hierarchicalrequirement' : {
                return Ext.create(gApp._userStoryModel, item);
            }
            case 'defect' : {
                return Ext.create(gApp._defectModel, item);
            }
            case 'task' : {
                return Ext.create(gApp._taskModel, item);
            }
            default: {
                //Portfolio Item
                return Ext.create(gApp._portfolioItemModels[item._type.split('/').pop()], item);
            }
        }
    },

    //This is in the context of the worker thread even though the code is here
    _threadMessage: function(msg) {
        if ((msg.data.response === 'Alive') && (msg.data.reply === 'Asleep')) {
            //TODO: Add timeout control here. If the process is busy, it will not return Asleep, but will be Alive.
            // console.log('Thread ' + msg.data.id + ' responded to ping');
        }

        //Records come back as raw info. We need to make proper Rally.data.WSAPI.Store records out of them
        if (msg.data.reply === 'Data') {
            var records = [];

            _.each(msg.data.records, function(item) {
                records.push(gApp._makeModel(item));
            });

            if (records.length) {
                gApp._getArtifacts(records, true);
            }
        }
        var thread = _.find(gApp._runningThreads, { id: msg.data.id});
        thread.state = 'Asleep';
        //Farm out more if needed
        if (gApp._recordsToProcess.length > 0) {
            //We have some, so give to a thread
            gApp._processRecord(thread, gApp._recordsToProcess.pop());
        }

        if ( gApp._allThreadsIdle()) {
            gApp.fireEvent('redrawNodeTree');
        }
    },

    _allThreadsIdle: function() {
        return _.every(gApp._runningThreads, function(thread) {
            return thread.state === 'Asleep';
        });
    },

    _checkThreadState: function(thread) {
        return thread.state;
    },

    _wakeThread: function(thread) {
        if ( gApp._checkThreadState(thread) === 'Asleep') {
            thread.lastMessage = 'wake';
            thread.worker.postMessage({
                command: thread.lastMessage
            });
        }
    },

    _checkThreadActivity: function() {
        while (gApp._runningThreads.length < gApp.self.MAX_THREAD_COUNT) {
            //Check the required amount of threads are still running
            gApp._threadCreate();
        }
        _.each(gApp._runningThreads, function(thread) {
            if ((gApp._recordsToProcess.length > 0) && (thread.state === 'Asleep')) {
                //Keep asking to process until their is somethng that needs doing
                gApp._processRecord(thread,gApp._recordsToProcess.pop());
            }
        });

    },

    _giveToThread: function(thread, msg){
        thread.state = 'Busy';
        thread.worker.postMessage(msg);
    },

    _processRecord: function(thread, record) {
        thread.lastCommand = 'readchildren';
        var msg = {
            command: thread.lastCommand,
            objectID: record.get('ObjectID'),
            hasChildren: (record.hasField('Children') && (record.get('Children').Count > 0) && (!record.data._ref.includes('hierarchicalrequirement'))) ?
                Rally.util.Ref.getUrl(record.get('Children')._ref):null,
            hasDefects: (gApp.getSetting('includeDefects') && record.hasField('Defects') && (record.get('Defects').Count > 0) ) ?
                Rally.util.Ref.getUrl(record.get('Defects')._ref):null,
            hasStories: (gApp.getSetting('includeStories') && record.hasField('UserStories') && (record.get('UserStories').Count > 0)) ?
                Rally.util.Ref.getUrl(record.get('UserStories')._ref):null,
            hasTasks: null  //Makes no sense here.
        };
        gApp._giveToThread(thread, msg);    //Send a wakeup message with an item
    },

    _getArtifacts: function(records, cascade) {
        gApp._nodes = gApp._nodes.concat( gApp._createNodes(records));

        if ( cascade  ) {
            _.each(records, function(record) {
                gApp._recordsToProcess.push(record);
            });
            gApp._checkThreadActivity();
        }
        else {
            this.fireEvent('redrawNodeTree');
        }
    },


    _createNodes: function(data) {
        //These need to be sorted into a hierarchy based on what we have. We are going to add 'other' nodes later
        var nodes = [];
        //Push them into an array we can reconfigure
        _.each(data, function(record) {
            if (record.data._ref === 'root') return null;
            nodes.push({'Name': record.get('FormattedID'), 'record': record});
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
        return record.data._ref.split('/').pop();
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

    _sumNodeTree: function(tree) {
        tree.each( function(d) { d.value = 0;});
        return tree.sum(function(d) { return 1;});        // Set the dimensions in svg to match
    },

    _createNodeTree: function (nodes) {
        //Try to use d3.stratify to create nodes
        var nodetree = gApp._stratifyNodeTree(nodes);
        gApp._nodeTree = gApp._sumNodeTree(nodetree);      //Save for later
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

        d3.select('#axisSvg').append("g")        
            .attr("transform","translate(0,0)")
            .attr("id","datelineGroup");

        gApp._addDateLine(new Date(), 'dateline');

        if (gApp._MilestoneStore) {
            var records = gApp._MilestoneStore.getRecords();
            _.each( records, function(record) {
                var dateGroup = null;

                if ( (record.get('Projects').Count > 0) && gApp.getSetting('showPMilestones')){
                    dateGroup = gApp._addDateLine( record.get('TargetDate'),  'project--milestone' );

                } 
                else if ( (record.get('Projects').Count === 0) && gApp.getSetting('showGMilestones')) {
                    dateGroup = gApp._addDateLine( record.get('TargetDate'), 'global--milestone');
                }
                if (dateGroup !== null) {
                    dateGroup.select('circle').on('click', function() {
                        Rally.nav.Manager.edit(record);
                    });
                }
            });
        }
        
    },

    _addDateLine: function(drawnDate, classType) {
        var st = d3.select('#datelineGroup');
        var acceptedClasses = ['global--milestone','project--milestone', 'dateline']; //Match this with .css entries
        var dateGroup = null;

        if (acceptedClasses.includes(classType)){
            var linePos = gApp.dateScaler(drawnDate);
            if ((linePos > 0) && (linePos < d3.select('#scaledSvg').attr('width'))) {
            dateGroup = st.append('g')
                .attr('transform', 'translate(' + linePos + ',0)' )
                .attr('id', 'dateGroup'+ Ext.Date.format(drawnDate, 'F-j-y-g-i-a'));
            var dateText = dateGroup.append('g')
                .attr('id','dateText'+ Ext.Date.format(drawnDate, 'F-j-y-g-i-a'))
                .attr('visibility', 'hidden');

            dateText.append('rect')
                .attr('class', 'chosenDate')
                .attr('x', 18)
                .attr('width', 200)
                .attr('height', 18);
                dateText.append('text')
                .text('(' + classType[0].toUpperCase() + ') ' + Ext.Date.format(drawnDate, 'F j, Y, g:i a'))
                .attr('class', 'chosenDate')
                .attr('y', 9)
                .attr('x', 20)
                .attr('alignment-baseline', 'text-top');

            dateGroup.append('line')
                .attr('x1',0)
                .attr('y1', 0)
                .attr('x2', 0)
                .attr('y2', d3.select('svg').attr('height'))
                .attr('class', classType);
            dateGroup.append('circle')
                .attr('cx',0)
                .attr('cy', 3)
                .attr('r', 3)
                .attr('class', classType)
                .on('mouseover', function() {
                    dateText.attr('visibility', 'visible');
                })
                .on('mouseout', function() {
                    dateText.attr('visibility', 'hidden');
                });
            }
        }
        return dateGroup;
    },

    _removeSVGTree: function() {

        if (d3.select('#datelineGroup')) {
            d3.select('#datelineGroup').remove();
        }

        //Go through all nodes and kill the cards
        gApp._removeCards();

        //Remove all the nodes we added
        d3.select('#zoomTree').selectAll("[class~=nodeGroup]").remove();
    },

    _removeCards: function() {
        _.each(gApp._nodes, function(node) {
            if (node.card) {
                node.card.destroy();
                node.card = null;
            }
        });
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

    _addComponents: function() {
        this.add(
            {
                xtype: 'container',
                itemId: 'headerBox',
                layout: 'hbox',
            }
        );

        this.add(
            {  
                xtype: 'container',
                itemId: 'filterBox'
            }
        );

        this.add(
            {
                xtype: 'container',
                itemId: 'rootSurface',
                overflowX: 'hidden',
                overflowY: 'hidden',
                margin: 3,
                autoEl: {
                    tag: 'svg'
                },
                listeners: {
                    afterrender:  function() {  gApp = this.up('#rallyApp'); gApp._onElementValid();},
                },
            }
        );
    },

    _getUserStoryModel: function() {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: 'UserStory'
        }). then( {
            success: function(model) {
                gApp._userStoryModel = model;
                deferred.resolve();
            },
            failure: function() {
                deferred.reject();
            }
        });
        return deferred.promise;
    },

    _getTaskModel: function() {
        var deferred = Ext.create('Deft.Deferred');

        deferred.resolve();

        return deferred.promise;
    },

    _getDefectModel: function() {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: 'Defect'
        }). then( {
            success: function(model) {
                gApp._defectModel = model;
                deferred.resolve();
            },
            failure: function() {
                deferred.reject();
            }
        });
        return deferred.promise;
    },

    _continueLaunch: function() {

        this.on('redrawNodeTree', function() {
            d3.select('svg').selectAll('g').remove();
            this._enterMainApp();
        });
        this.subscribe(this, Rally.Message.objectUpdate, this._objectUpdated, this);

        //We need a way to detect whether we are running in slm or external. Rendering order is different.
        if(this.ownerCt) {
            this._addComponents();
        }
        else {
            this.on ('afterrender', function() {
                this._addComponents();
            });
        }
    },

    _objectUpdated: function(update){
            var d = gApp._findTreeNode(gApp._getNodeTreeRecordId(update));
            if (d === null) { return;} 
//            var node = d3.select('#group-'+d.data.Name);
//            node.remove();
            //Check if the record was part of the changes we have logged
            _.remove(gApp._changedItems, function(item) {
                return (item.get('FormattedID') === d.data.record.get('FormattedID'));
            });
            if (gApp._changedItems.length === 0) { 
                gApp.down('#saveRecords').disable();
                gApp.down('#dropRecords').disable();
            }
            update.self.load(update.getId(), {
                fetch: gApp.STORE_FETCH_FIELD_LIST
            }).then({
                success: function(record) {
                    d.data.record = record;
                    var gt = gApp._calcGroupTranslate(d);
                    gApp._setGroupTranslate(d, gt.startX, gt.endX)
                    gApp._startTreeAgain(); 
                }
            });
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addEvents('redrawNodeTree');
    },

    _MilestoneStore: null,

    _fetchMilestones: function() {
        var deferred = Ext.create('Deft.Deferred');

        var filters = Rally.data.wsapi.Filter.or([
            {
                property: 'Projects.ObjectID',
                value: gApp.getContext().getProject().ObjectID
            },
            {
                property: 'Projects.ObjectID',
                value: null
            }
        ]);

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Milestone',
            autoLoad: true,
            fetch: true,
            filters: filters,
            listeners: {
                load: function(store, results) {
                    if (store.getRecords().length) {
                        gApp._MilestoneStore = store;
                        deferred.resolve(results);
                    }
                    else {
                        deferred.resolve(null);
                    }
                }
            }
        });
        return deferred.promise;

    },

    launch: function() {

        var me = this;
        gApp = me;

        //Set a default motion for timeline items
        if (gApp._animation === null) {
            gApp._animation = d3.easeElastic;
            gApp._animation.amplitude(1.2).period(0.35);
        }

        //We need to get all the usual models before we continue. We will get the portfolio models from the item type selector
        Deft.Chain.parallel( [
            this._getUserStoryModel,
            this._getTaskModel,
            this._getDefectModel
        ], this). then ({
            success: this._continueLaunch,
            failure: function() {
                Rally.ui.notify.Notifier.showWarning({ message: 'Failed to fetch artefact models'});
            },
            scope: me
        });

        //Now find all the milestones that affect this node. Two types: global, and project specific

        Deft.Chain.pipeline( [
            gApp._fetchMilestones,
//            gApp._renderMilestones Can't render these until we have set up the svg panels.
        ], this). then ({
            success: function(results) {
                if (results === null) { 
                    Rally.ui.notify.Notifier.showWarning({ message: 'No Milestones available'});
                    return;
                }

                var globalMls = _.filter(results, function(mls) {
                    return !(mls.get('TotalProjectCount'));
                });
                if (globalMls.length === 0 ) {
                    Rally.ui.notify.Notifier.show({ message: results.length.toString() + ' Project Milestones available'});
                }
                else if (globalMls.length === results.length) {
                    Rally.ui.notify.Notifier.show({ message: results.length.toString() + ' Global Milestones available'});
                }
                else {
                    Rally.ui.notify.Notifier.show({ message: globalMls.length.toString() + ' Global and ' + 
                        (results.length - globalMls.length).toString() + ' Project Milestones available'});
                }
            },
            scope: me
        });
    },


});
}());