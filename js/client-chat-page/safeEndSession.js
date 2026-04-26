var clientChatPageSafeEndSession = function () {
    if (window.chatSession) {
        if (window.chatSession.sessionStatus === 'connected') {
            //session queued or connected, need disconnect
            var endChatMessage = "Do you want to end the chat session?";
            var definition = widgetConfiguration.getDefinition();
            if (definition && definition.chatWidgetStyling && definition.chatWidgetStyling.endSessionDialogText) {
                endChatMessage = definition.chatWidgetStyling.endSessionDialogText;
            }
            window.parent.postMessage(JSON.stringify({
                message: 'bp-show-close-chat-dialog',
                text: endChatMessage,
            }), '*');
        } else {
            if (window.sessionStorage.getItem('bp-cobrowsing')) {
                window.chatSession.sendCobrowsingEnded();
            }
            if (!window.chatSession.sessionEnded) {
                window.chatSession.endSession();
            } else {
                window.chatSession.uiCallbacks.onSessionEnded();
            }
        }
    } else {
        window.setTimeout(function () {
            localStorage.removeItem('bp-sent-message-id');
            sessionStorage.removeItem('bp-clicked-buttons-msg-id');
            sessionStorage.removeItem('bp-last-message');
            sessionStorage.removeItem('bp-last-message-timestamp');
            sessionStorage.removeItem('bp-min-message-counter');
            sessionStorage.removeItem('bp-minimized');
            sessionStorage.removeItem('bp-cobrowsing');
            window.parent.postMessage('sp-session-end', '*');
        }, 50);
    }
};

var clientChatPageSafeEndSessionConfirm = function () {
    window.chatSession.sessionStatus = undefined;
    if (window.sessionStorage.getItem('bp-cobrowsing')) {
        window.chatSession.sendCobrowsingEnded();
    }
    window.chatSession.disconnectSession();
}
