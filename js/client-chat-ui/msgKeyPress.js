var clientChatUiMsgKeyPress = function (event, session) {
    if (event.which == 13 && event.type !== "keyup") {
        if (!event.shiftKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            clientChatUiSendMessage(session);
            $('.emoji-wysiwyg-editor').html('');
        } else {
            var chatLog = $('#chatLog');
            var msg = $('#input-field,.emoji-wysiwyg-editor');
            var scroll1 = msg.scrollTop();
            setTimeout(function () {
                var scroll2 = msg.scrollTop();
                if (scroll2 > scroll1) {
                    var logHeight = chatLog.height();
                    var minHeight = 64;
                    var heightIncrement = 16;
                    if (logHeight > minHeight) {
                        var h = msg.height();
                        msg.height(h + heightIncrement);
                        if (scroll1 === 0) {
                            msg.scrollTop(0);
                        }
                    }
                }
            }, 10);
            clientChatUiChatMessageTyping(session);
        }
    } else {
        clientChatUiChatMessageTyping(session);
    }
};
