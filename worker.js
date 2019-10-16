function worker() {

    var id = 0;
    var currentState = 'Initiate';
    var timeout = 120000;
    var fetchFields = 'true';


    onmessage = function(ev) {

        switch(ev.data.command){
            case 'wake' : {
                defaultReply();
                break;
            } 
            case 'initialise': {
                this.id = ev.data.id;
                currentState = 'Asleep';
                fetchFields = encodeURIComponent(ev.data.fields.toString());
                defaultReply();
                break;
            } 
            case 'readchildren' : {
                _actionFetchChildren(ev.data);
                break;
            }
            default: {
                console.log('Unknown message received by thread: ', this.id);
                break;
            }
        }
    };

    function _actionFetchChildren(msg) {
        if (
            ((msg.hasChildren !== null) && _getFromURL(msg.hasChildren)) +
            ((msg.hasStories !== null) && _getFromURL(msg.hasStories)) +
            ((msg.hasDefects !== null) && _getFromURL(msg.hasDefects)) +
            ((msg.hasTasks !== null) && _getFromURL(msg.hasTasks)) ) {
                return;

        } else {
            defaultReply();
        }
    }

    function _getFromURL(url) {
        var getReq = new XMLHttpRequest();
        getReq.onreadystatechange = _successHandler;
        getReq.withCredentials = true;
        currentState = 'Reading';
        getReq.open("GET", url + '?fetch=' + fetchFields, true);
        getReq.send(null);
        return true;
    }

    function _successHandler(event) {
        if ((this.readyState === 4) && (this.status === 200)){
            _dataReply(JSON.parse(this.responseText).QueryResult.Results);
            currentState = 'Asleep';
        }
    }

    function _dataReply(data) {
        postMessage( {
            response: 'Alive',
            reply: 'Data',
            records: data,
            id: this.id
        });
    }

    function defaultReply() {
        postMessage({
            response: 'Alive',
            reply: this.currentState,
            id: this.id
        });
    }
}
