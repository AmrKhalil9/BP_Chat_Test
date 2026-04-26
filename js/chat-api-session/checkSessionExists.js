var chatApiSessionCheckSessionExists = function (cp, sessionId) {
    var historyEndpoint = 'chats/' + sessionId + '/history?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
    return chatApiSessionSendXhr(cp, historyEndpoint, "GET");
};
