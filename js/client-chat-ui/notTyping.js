var clientChatUiNotTyping = function (session) {
    var variables = clientChatUiVariables;
    if (variables.typingTimer) {
        window.clearInterval(variables.msgTypingInterval);
        variables.msgTypingInterval = null;
        if($('input-field').val()) {
            session.sendTyping($('#input-field').val());
        } else {
            session.sendNotTyping();
        }
        variables.typingTimer = null;
    }
};
