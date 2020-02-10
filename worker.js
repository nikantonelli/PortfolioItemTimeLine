function worker() {

    var id = 0;
    var currentState = 'Initiate';      //Used during debug. Could remove.
//    var timeout = 120000;               //Might use this in future to overide 30sec standard. See _getFromURL below
    var fetchFields = 'true';


    onmessage = function(ev) {

        switch(ev.data.command){
            case 'wake' : {
                defaultReply();
                break;
            } 
            case 'initialise': {
                id = ev.data.id;
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
                console.log('Unknown message received by thread: ', id);
                break;
            }
        }
    };

    function _actionFetchChildren(msg) {
        if (
            ((msg.hasChildren !== null) && _getFromURL(msg.hasChildren)) +
            ((msg.hasStories !== null) && _getFromURL(msg.hasStories)) +
            ((msg.hasDefects !== null) && _getFromURL(msg.hasDefects)) +
            ((msg.hasTasks !== null) && _getFromURL(msg.hasTasks)) +
            ((msg.hasTestCases !== null) && _getFromURL(msg.hasTestCases)) ) {
                return;

        } else {
            console.log("sending default response to: ", msg);
            defaultReply();
        }
    }

    function _getFromURL(url) {
        var getReq = new XMLHttpRequest();
        getReq.onloadend = _loadHandler;
        getReq.onabort = _abortHandler;
        getReq.ontimeout = _timeoutHandler;
//        getReq.timeout = timeout;
        getReq.withCredentials = true;
        currentState = 'Reading';
        getReq.open("GET", url + '?fetch=' + fetchFields, true);
        getReq.send(null);
        return true;
    }

    function _loadHandler(event) {
        if ((this.readyState === 4) && (this.status === 200)){
            _dataReply(JSON.parse(this.responseText).QueryResult.Results);
            currentState = 'Asleep';
        }
        else if ((this.readyState === 4) && (this.status === 0)){
            _errorReply('Non Specified Fail');
            currentState = 'Asleep';
            console.log('Fail Response', event);
            }
        else {
            console.log('Non Data Response', event);
        }
    }
    function _abortHandler(event) {
        _errorReply('Abort');
        currentState = 'Asleep';
        console.log('Abort Response', event);
    }
    function _timeoutHandler(event) {
        _errorReply('Timeout');
        currentState = 'Asleep';
        console.log('Timeout Response', event);
    }

    function _dataReply(data) {
        postMessage( {
            response: 'Alive',
            reply: 'Data',
            error: '',
            records: data,
            id: id
        });
    }

    function _errorReply(msg) {
        postMessage( {
            response: 'Alive',
            reply: '',
            error: msg,
            id: id
        });
    }

    function defaultReply() {
        postMessage({
            response: 'Alive',
            reply: this.currentState,
            error: '',
            id: id
        });
    }
}
