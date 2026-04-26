var chatApiSessionSendXhr = function (cp, endpoint, method, data) {
    var xhrOptions = chatApiSessionPrepareRequest(cp, endpoint, method);
    if (data) {
        if (data.toString() === '[object FormData]') {
            xhrOptions.data = data;
            xhrOptions.contentType = false;
            xhrOptions.processData = false;
        } else {
            xhrOptions.data = JSON.stringify(data);
            xhrOptions.contentType = 'application/json; charset=utf-8';
            xhrOptions.dataType = 'json';
        }
    }
    return jQuery.ajax(xhrOptions);
};
