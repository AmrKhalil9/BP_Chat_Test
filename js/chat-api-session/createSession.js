var chatApiSessionCreateSession = function (cp) {

    var lastInvocationTime = localStorage.getItem('bp-chat-start-last-invocation-time');
    var newInvocationTime = Date.now();
    if (lastInvocationTime && newInvocationTime < Number(lastInvocationTime) + 1000) {
        console.error('Attempt to start a chat twice in 1 second');
        return;
    }
    localStorage.setItem('bp-chat-start-last-invocation-time', newInvocationTime);

    chatApiSessionVariables.logging = cp.parameters.logging;

    if (SERVICE_PATTERN_CHAT_CONFIG.directChatPIN) {
        cp.parameters.directChatPIN = SERVICE_PATTERN_CHAT_CONFIG.directChatPIN;
    }

    var endpoint = 'chats?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
    var requestPayload = {
        phone_number: cp.phone_number,
        from: cp.from,
        parameters: cp.parameters
    };
    if (cp.initialMessage) {
        requestPayload.initial_message = cp.initialMessage;
    }
    return chatApiSessionSendXhr(cp, endpoint, 'POST', requestPayload).pipe(function (r) {
        r.session = chatApiSessionCreateSessionHandler(cp, r);
        return r;
    });
};
