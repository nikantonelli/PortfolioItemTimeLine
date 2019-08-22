(function () {
    var Ext = window.Ext4 || window.Ext;

Ext.define("Rally.apps.CFDChart", {
    extend: "Ext.Component",
    settingsScope: "workspace",
    projectScopeable: false,
    alias: 'widget.explorerCFDChart',

    config: {
        app: undefined
    },

    constructor: function (config) {
        this.mergeConfig(config);
        this.callParent(arguments);
    },

    requires: [
        'Rally.ui.combobox.ComboBox',
        'Rally.util.Test',
        'Deft.Deferred'
    ],

//    mixins: [
//        'DateMixin'
//    ],
//
    scheduleStates: ["Defined", "In-Progress", "Completed", "Accepted"],

    items: [
        {
            xtype: 'container',
            itemId: 'header',
            cls: 'header'
        }
    ],

    _setDefaultConfigValues: function () {
        var config = Ext.clone(this.chartComponentConfig);
        config.storeConfig.find = config.storeConfig.find || {};
        config.calculatorConfig = config.calculatorConfig || {};
        config.chartConfig = config.chartConfig || {};
        config.chartConfig.title = config.chartConfig.title || {};
        config.chartConfig.xAxis = config.chartConfig.xAxis || {};
        config.chartConfig.xAxis.type = config.chartConfig.xAxis.type || "datetime";
        config.chartConfig.yAxis = config.chartConfig.yAxis || [
            {
                title: {}
            }
        ];

        this.chartComponentConfig = config;
    },

    _parseRallyDateFormatToHighchartsDateFormat: function () {
        var dateFormat = this._getUserConfiguredDateFormat() || this._getWorkspaceConfiguredDateFormat();

        for (var i = 0; i < this.dateFormatters.length; i++) {
            dateFormat = dateFormat.replace(this.dateFormatters[i].key, this.dateFormatters[i].value);
        }

        return dateFormat;
    },

    _formatDate: function (date) {
        if (!this.dateFormat) {
            this.dateFormat = this._parseRallyDateFormatToHighchartsDateFormat();
        }

        return Highcharts.dateFormat(this.dateFormat, date.getTime());
    },

    _getTimeZone: function () {
        return gApp.getContext().getUser().UserProfile.TimeZone || gApp.getContext().getWorkspace().WorkspaceConfiguration.TimeZone;
    },

    _getChartStartDate: function (portfolioitem) {

            //If we have an actual start AND actual end, use those
            // If not, and we still have an actual start, use the actual start and todays date as end
            //If no actual start or actual end, then use todays date minus six months as start, todays date as end

        var startDate = portfolioitem.ActualStartDate;
        var sixMonthsAgo = Ext.Date.subtract(new Date(), Ext.Date.MONTH, 6);

        if (!startDate) {
            startDate = sixMonthsAgo;
        }
        return Ext.Date.format(startDate, 'Y-m-d\\TH:i:s.u\\Z');
    },

    dateFormatters: [
        {key: "MMM", value: "%b"},
        {key: "MM", value: "%m"},
        {key: "dd", value: "%d"},
        {key: "yyyy", value: "%Y"}
    ],

    _getMonth: function(month) {
        var monthMap = { jan: 0, feb: 1, mar: 2, apr: 3,
                         may: 4, jun: 5, jul: 6, aug: 7,
                         sep: 8, oct: 9, nov: 10, dec: 11 };
        if(isNaN(month)) {
            try {
                month = monthMap[month.toLowerCase()];
            } catch(err) { }
        } else {
            month = parseInt(month, 10) - 1;
        }

        return month.toString();
    },

    _getChartEndDate: function (portfolioitem) {
        var startDate = portfolioitem.ActualStartDate;
        var endDate = portfolioitem.ActualEndDate;
        var todaysDate = new Date();

        if (!startDate) {
            endDate = todaysDate;
        } else {
            if (!endDate) endDate = todaysDate;
        }
        return Ext.Date.format(endDate, 'Y-m-d\\TH:i:s.u\\Z');
    },

    _calculateDateRange: function (portfolioItem) {
        var calcConfig = this.chartComponentConfig.calculatorConfig;
        calcConfig.startDate = calcConfig.startDate || this._getChartStartDate(portfolioItem);
        calcConfig.endDate = calcConfig.endDate || this._getChartEndDate(portfolioItem);
        calcConfig.timeZone = calcConfig.timeZone || this._getTimeZone();

        this.chartComponentConfig.chartConfig.xAxis.tickInterval = this._configureChartTicks(calcConfig.startDate, calcConfig.endDate);
    },
_objectFromYearFirstDate: function (dateArray) {
            var month = 0,
                day = 0,
                year = 0;

            if (dateArray.length !== 3) {
                return { year: year, month: month, day: day };
            }

            year = dateArray[0];
            month = this._getMonth(dateArray[1]);
            day = dateArray[2];

            return {
                year: year,
                month: month,
                day: day
            };
        },

        _objectFromMonthFirstDate: function (dateArray) {
            var month = 0,
                day = 0,
                year = 0;

            if (dateArray.length !== 3) {
                return { year: year, month: month, day: day };
            }

            month = this._getMonth(dateArray[0]);
            day = dateArray[1];
            year = dateArray[2];

            return {
                month: month,
                day: day,
                year: year
            };
        },

    _shouldSplitOnDash: function (dateStr) {
        return dateStr.split('-').length === 3;
    },

    _splitDateParts: function (dateStr) {
        if (this._shouldSplitOnDash(dateStr)) {
            return this._objectFromYearFirstDate(dateStr.split('-'));
        }
        else {
            return this._objectFromMonthFirstDate(dateStr.split('/'));
        }
    },

    dateStringToObject: function (dateStr) {
        var finalIndex = dateStr.indexOf('T'),
            dateObj;

        if (finalIndex > -1) {
            dateStr = dateStr.slice(0, dateStr.indexOf('T'));
        }

        dateObj = this._splitDateParts(dateStr);

        return new Date(dateObj.year, dateObj.month, dateObj.day);
    },

    _configureChartTicks: function (startDate, endDate) {
        var pixelTickWidth = 125,
            appWidth = this.container.getWidth(),
            ticks = Math.floor(appWidth / pixelTickWidth);

        var startDateObj = this.dateStringToObject(startDate),
            endDateObj = this.dateStringToObject(endDate);

        var days = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / 86400000);

        return Math.floor(days / ticks);
    },

    _buildChartTitle: function (portfolioItem) {
        var widthPerCharacter = 10,
            totalCharacters = Math.floor(this.container.getWidth() / widthPerCharacter),
            title = "Portfolio Item Chart",
            align = "center";

        if (portfolioItem) {
            title = portfolioItem.FormattedID + ": " + portfolioItem.Name;
        }

        if (totalCharacters < title.length) {
            title = title.substring(0, totalCharacters) + "...";
            align = "left";
        }

        return {
            text: title,
            align: align,
            margin: 30
        };
    },

    _getUserConfiguredDateFormat: function () {
        return gApp.getContext().getUser().UserProfile.DateFormat;
    },

    _getWorkspaceConfiguredDateFormat: function () {
        return gApp.getContext().getWorkspace().WorkspaceConfiguration.DateFormat;
    },

    _updateQueryConfig: function (portfolioItem) {
        this.chartComponentConfig.storeConfig.find._ItemHierarchy = portfolioItem.ObjectID;
//        this.chartComponentConfig.storeConfig.find._ValidFrom = {
//            "$gte": this._getChartStartDate(portfolioItem),
//            "$lt" : this._getChartEndDate(portfolioItem)
//        };
//        this.chartComponentConfig.storeConfig.find._ValidTo = this._getChartEndDate(portfolioItem);
    },

    _onUserStoryModelRetrieved: function (model, portfolioItem) {
        var scheduleStateValues = model.getField('ScheduleState').getAllowedStringValues();
        this.chartComponentConfig.calculatorConfig.scheduleStates = scheduleStateValues;

        this._setDynamicConfigValues(portfolioItem);
        this._calculateDateRange(portfolioItem);
        this._updateQueryConfig(portfolioItem);
        this.container.insert(0, this.chartComponentConfig);
    },

    _setDynamicConfigValues: function (portfolioItem) {
        this._updateChartConfigDateFormat();
        this.chartComponentConfig.chartConfig.title = this._buildChartTitle(portfolioItem);
        this.chartComponentConfig.chartConfig.subtitle = this._buildChartSubtitle(portfolioItem);

        this.chartComponentConfig.calculatorConfig.chartAggregationType = 'count';
        this.chartComponentConfig.chartConfig.yAxis[0].title.text = 'Count';

        this.chartComponentConfig.chartConfig.yAxis[0].labels = {
            x: -5,
            y: 4
        };
    },


    _updateChartConfigDateFormat: function () {
        var self = this;

        this.chartComponentConfig.chartConfig.xAxis.labels = {
            x: 0,
            y: 20,
            formatter: function () {
                return self._formatDate(self.dateStringToObject(this.value));
            }
        };
    },

    _buildChartSubtitle: function (portfolioItem) {
        var widthPerCharacter = 6,
            totalCharacters = Math.floor(this.container.getWidth() / widthPerCharacter),
            plannedStartDate = "",
            plannedEndDate = "";

        var template = Ext.create("Ext.XTemplate",
            '<tpl if="plannedStartDate">' +
                '<span>Planned Start: {plannedStartDate}</span>' +
                '    <tpl if="plannedEndDate">' +
                '        <tpl if="tooBig">' +
                '            <br />' +
                '        <tpl else>' +
                '            &nbsp;&nbsp;&nbsp;' +
                '        </tpl>' +
                '    </tpl>' +
                '</tpl>' +
                '<tpl if="plannedEndDate">' +
                '    <span>Planned End: {plannedEndDate}</span>' +
                '</tpl>'
        );

        if (portfolioItem && portfolioItem.PlannedStartDate) {
            plannedStartDate = Rally.util.DateTime.formatWithDefault(portfolioItem.PlannedStartDate, gApp.getContext());
        }

        if (portfolioItem && portfolioItem.PlannedEndDate) {
            plannedEndDate = Rally.util.DateTime.formatWithDefault(portfolioItem.PlannedEndDate, gApp.getContext());
        }

        var formattedTitle = template.apply({
            plannedStartDate: plannedStartDate,
            plannedEndDate: plannedEndDate,
            tooBig: totalCharacters < plannedStartDate.length + plannedEndDate.length + 60
        });

        return {
            text: formattedTitle,
            useHTML: true,
            align: "center"
        };
    },

    chartComponentConfig: {
        xtype: "rallychart",
        //Colour blind safe colour range
        chartColors: ['#d73027','#fc8d59','#fee090','#e0f3f8','#91bfdb','#4575b4'], //These should match the CSS file for the dendrogram
        queryErrorMessage: "No User Stories to display.<br /><br />Most likely, stories are either not yet available or started for this portfolio item.",
        aggregationErrorMessage: "Invalid/Incomplete data.<br /><br />Check the User Story Estimate data. Data is based on count and plan estimate.",
        storeType: 'Rally.data.lookback.SnapshotStore',
        storeConfig: {
            find: {
                "_TypeHierarchy": "HierarchicalRequirement",
                "Children": null
            },
            removeUnauthorizedSnapshots: true,
            compress: true,
            fetch: ["ScheduleState", "PlanEstimate"],
            hydrate: ["ScheduleState"],
            sort: {
                "_ValidFrom": 1
            }
        },
        calculatorType: "Rally.apps.charts.rpm.cfd.CumulativeFlowCalculator",
        chartConfig: {
            chart: {
                defaultSeriesType: "area",
                zoomType: "xy"
            },
            xAxis: {
                categories: [],
                tickmarkPlacement: "on",
                tickInterval: 5,
                title: {
                    text: "Days",
                    margin: 10
                }
            },
            yAxis: [
                {
                    title: {
                        text: "Count"
                    }
                }
            ],
            tooltip: {
                formatter: function () {
                    return "" + this.x + "<br />" + this.series.name + ": " + this.y;
                }
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    },
                    groupPadding: 0.01
                },
                area: {
                    stacking: 'normal',
                    marker: {
                        enabled: false
                    }
                }
            }
        }
    },

    generateChart: function() {
        var record = this.record;
        if (!record) return; //Needs to be a record defined - error if not
        this._setDefaultConfigValues();

        Rally.data.ModelFactory.getModel({
            type: 'UserStory',
            success: function (model) {
                this._onUserStoryModelRetrieved(model, record.data);
            },
            scope: this
        });
     }
});
}());