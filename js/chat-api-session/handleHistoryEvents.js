var chatApiSessionHandleHistoryEvents = function (r, session) {
    var offerRtc = null;
    session.historyReceived = true;
    if (r.events) {
        var currentSessionId = sessionStorage.getItem('sp-chat-session');
        persistentChat.removeSessionMessages(currentSessionId);
        var timeout = false, i, n, event;
        for (i = 0, n = r.events.length; i < n; ++i) {
            event = r.events[i];
            if (!timeout && event.event === 'chat_session_inactivity_timeout') {
                timeout = true;
            }
        }
        for (i = 0, n = r.events.length; i < n; ++i) {
            event = r.events[i];
            event.sessionHistory = true;
            if (event.event === 'chat_session_signaling') {
                var type = event.data.type;
                if (type === 'OFFER_CALL') {
                    offerRtc = event;
                } else if (type === 'END_CALL') {
                    offerRtc = false;
                }
            } else {
                if (event.event === 'chat_session_form_show' && r.events.indexOf(event) !== r.events.length - 1) {
                    var onlyNavAfterForm = true;
                    for (var j = r.events.indexOf(event) + 1; j < r.events.length; j++) {
                        if (r.events[j].event !== 'chat_session_navigation') {
                            onlyNavAfterForm = false;
                        }
                    }
                    if (timeout || onlyNavAfterForm) {
                        session.handleEvent(event);
                    }
                } else {
                    session.handleEvent(event);
                }
            }
        }
    }
    session.historyRendered = true;
    return offerRtc;
};
