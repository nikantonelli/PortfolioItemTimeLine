(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define("Rally.apps.DateMixin", {

        dateFormatters: [
            {key: "MMM", value: "%b"},
            {key: "MM", value: "%m"},
            {key: "dd", value: "%d"},
            {key: "yyyy", value: "%Y"}
        ],

        dateToStringDisplay: function (date) {
            return Ext.Date.format(date, 'm/d/Y');
        },

        dateToString: function (date) {
            return Ext.Date.format(date, 'Y-m-d\\TH:i:s.u\\Z');
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
        }

    });

}());