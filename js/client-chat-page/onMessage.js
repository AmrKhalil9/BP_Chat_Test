var clientChatPageOnMessage = function (e) {
    var i18n = clientChatUiI18n();
    var data = '' + e.originalEvent.data;
    if (data.indexOf("sp-") === 0) {
        if (data === 'sp-dragged') {
            clientChatPageUpdateScrollbar();
        } else if (data === 'sp-disconnect') {
            clientChatPageSafeEndSession();
        } else if (data === 'sp-req-notification') {
            $('#notification-prompt').css("display", "block");
        } else if (data === 'sp-req-notification-end') {
            $('#notification-prompt').css("display", "none");
        } else if (data.indexOf("sp-together-url") === 0) {
            window.chatSession.send(i18n.clickToStartCobrowsingPrompt + ": " + data.replace("sp-together-url", ""), {
                alternateMsg: {
                    fromClass: 'sys',
                    msg: i18n.screenSharingRequestedMessageText,
                    type: 'cobrowsing'
                }
            });
        } else if (data.indexOf("sp-together-stop") === 0) {
            window.chatSession.send(i18n.screenSharingEndedMessageText, {
                alternateMsg: {
                    fromClass: 'sys',
                    msg: i18n.screenSharingEndedMessageText,
                }
            });
        } else if (data === "sp-started-together") {
            $('#shareScreen').addClass('stop-sharing');
        } else if (data === "sp-stopped-together") {
            $('#shareScreen').removeClass('stop-sharing');
        }
    } else if (data === 'bp-cobrowsing-ended') {
        window.sessionStorage.removeItem('bp-cobrowsing');
    } else if (data === 'bp-cobrowsing-ended-message') {
        window.chatSession.sendCobrowsingEnded();
    } else if (data === 'bp-cobrowsing-rejected') {
        window.chatSession.sendCobrowsingRejected();
    } else if (data === 'bp-close-chat-confirmed') {
        clientChatPageSafeEndSessionConfirm();
    } else {
        try {
            var data = JSON.parse(data);
            if (data.message === 'bp-cobrowsing-started') {
                window.sessionStorage.setItem('bp-cobrowsing', 'true');
                window.chatSession.sendCobrowsingStarted(data.provider, data.url, data.sessionId);
            } else if (data.message === 'bp-max-height') {
                $('.min-scroll').css('max-height', data.height - 124 + 'px');
            }
        } catch (e) {}
    }
};
