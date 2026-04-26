(function () {

    widgetConfiguration.getServicePatternChatConfig().then(function (config) {

        SERVICE_PATTERN_CHAT_CONFIG = config;

        $.chatUI = {
            appendLog: clientChatUiAppendLog,
            sendMessage: clientChatUiSendMessage,
            sendLocation: clientChatUiSendLocation,
            sendNavigation: clientChatUiSendNavigation,
            msgKeyPress: clientChatUiMsgKeyPress,
            notTyping: clientChatUiNotTyping
        };

        $(window).on("message", function (event) {
            clientChatPageOnMessage(event);
        });

        $(document).ready(function () {
            clientChatPageOnReady();
        });
    })

})();
