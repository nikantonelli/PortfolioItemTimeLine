var Ext = window.Ext4 || window.Ext;

var getRecordId = function(record) {
    return record.data._ref.split('/').pop();
}