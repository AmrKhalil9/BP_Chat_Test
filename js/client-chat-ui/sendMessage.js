var clientChatUiSendMessage = function(session) {
    var messageValue = $('.emoji-wysiwyg-editor').html();
    if (messageValue) {
        session.send(messageValue);
        $('#input-field').val('');
        $('.emoji-wysiwyg-editor').html('');
        clientChatUiNotTyping(session);
    }
};
