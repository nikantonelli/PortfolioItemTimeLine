(function () {
    var Ext = window.Ext4 || window.Ext;

Ext.define("Rally.apps.charts.rpm.cfd.CumulativeFlowCalculator", {
    extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",

    getDerivedFieldsOnInput: function () {
        var chartAggregationType = this.config.chartAggregationType;

        return _.map(this.config.scheduleStates, function(state) {
            return {
                "as": state,
                "f": function (snapshot) {
                    if (chartAggregationType === 'storycount') {
                        if (snapshot.ScheduleState) {
                            return snapshot.ScheduleState === state ? 1 : 0;
                        }

                        return 0;
                    } else {
                        if (snapshot.PlanEstimate) {
                            return snapshot.ScheduleState === state ? snapshot.PlanEstimate : 0;
                        }

                        return 0;
                    }

                }
            };
        }, this);
    },

    getMetrics: function () {
        return _.map(this.config.scheduleStates, function(state) {
            return {
                "field": state,
                "as": state,
                "f": "sum"
            };
        });
    }
});
}());