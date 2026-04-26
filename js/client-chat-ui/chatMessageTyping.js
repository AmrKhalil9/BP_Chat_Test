var clientChatUiChatMessageTyping = function (session, msg) {
    var variables = clientChatUiVariables;
    if (variables.typingTimer) {
        window.clearTimeout(variables.typingTimer);
    } else {
        session.sendTyping(msg);
        variables.msgTypingInterval = window.setInterval(function () {
            session.sendTyping($('#input-field').val());
        }, variables.msgTypingTimeout * 1000);
    }

    variables.typingTimer = window.setTimeout(function () {
        clientChatUiNotTyping(session);
    }, variables.notTypingTimeout * 1000);
};
