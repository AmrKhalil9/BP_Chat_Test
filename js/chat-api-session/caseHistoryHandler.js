var caseHistoryHandler = (function caseHistoryHandlerContext() {

    var helpers = undefined;
    var onLogEvent = undefined;

    function historySessionHandler(session) {
        var sessionState = {
            parties: {},
            displayName: 'me',
            entryName: '', // ?
            sessionId: session.chat_id,
            getProfilePhotoUrl: function () {
                return '/';
            }
        };

        session.events.forEach(function (event, i) {
            event.history = true;
            if (i === session.events.length - 1) {
                event.last = true;
            }
            historyEventHandler(event, sessionState);
        });
    }

    function historyEventHandler(msg, o) {
        try {
            switch (msg.event) {
                case commonConstants.events.chat.session.NETWORK_CONNECTION_ERROR:
                    msg.sessionId = o.sessionId;
                    msg.fromClass = 'sys';
                    msg.fromName = o.entryName;
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.NETWORK_CONNECTION_ESTABLISHED:
                    msg.sessionId = o.sessionId;
                    msg.fromClass = 'sys';
                    msg.fromName = o.entryName;
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.ENDED:
                    msg.sessionId = o.sessionId;
                    msg.fromClass = 'sys';
                    msg.fromName = o.entryName;
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.PARTY_JOINED:
                    msg.sessionId = o.sessionId;
                    var p = helpers.buildParty(o, msg);
                    p.displayName = p.firstName + ' ' + p.lastName;
                    helpers.detectParty(o);
                    onLogEvent(helpers.preparePartyLogEvent(o, msg, p));
                    break;

                case commonConstants.events.chat.session.PARTY_LEFT:
                    msg.sessionId = o.sessionId;
                    var party = o.parties[msg.party_id];
                    delete o.parties[msg.party_id];
                    helpers.detectParty(o);
                    onLogEvent(helpers.preparePartyLogEvent(o, msg, party));
                    break;

                case commonConstants.events.chat.session.MESSAGE:
                    msg.sessionId = o.sessionId;
                    msg.fromClass = 'session_msg';
                    onLogEvent(helpers.prepareLogEvent(o, msg));
                    break;

                case commonConstants.events.chat.session.FILE:
                    msg.sessionId = o.sessionId;
                    msg.party_id = msg.party_id || o.sessionId;
                    msg.fileUrl = '/';
                    onLogEvent(helpers.prepareLogEvent(o, msg));
                    break;

                case commonConstants.events.chat.session.TIMEOUT_WARNING:
                    msg.sessionId = o.sessionId;
                    msg.fromClass = 'sys';
                    onLogEvent(helpers.prepareLogEvent(o, msg));
                    break;

                case commonConstants.events.chat.session.INACTIVITY_TIMEOUT:
                    msg.sessionId = o.sessionId;
                    o.internalParty = undefined;
                    msg.fromClass = 'sys';
                    onLogEvent(helpers.prepareLogEvent(o, msg));
                    break;

                case commonConstants.events.chat.session.COBROWSING_REQUESTED:
                    msg.fromClass = 'sys';
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.COBROWSING_REJECTED:
                    msg.fromClass = 'sys';
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.COBROWSING_STARTED:
                    msg.fromClass = 'sys';
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.COBROWSING_ENDED:
                    msg.fromClass = 'sys';
                    onLogEvent(msg);
                    break;

                case commonConstants.events.chat.session.INFO:
                case commonConstants.events.chat.session.STATUS:
                case commonConstants.events.chat.session.TYPING:
                case commonConstants.events.chat.session.FORM_SHOW:
                case commonConstants.events.chat.session.SECURE_FORM_SHOW:
                case commonConstants.events.chat.session.NOT_TYPING:
                case commonConstants.events.chat.session.SIGNALING:
                case commonConstants.events.chat.session.CASE_SET:
                    // doesn't matter
                    break;
            }
        } catch (e) {
            console.error('Cannot handle case history event :', msg, e);
        }
    }

    function removePersistentChatClientHistory() {
        $('#messages_history_separator').prevAll().remove();
    }

    return function caseHistoryHandlerImpl(caseHistory, helpersImpl, onLogEventUICallback) {
        helpers = helpersImpl;
        onLogEvent = onLogEventUICallback;

        removePersistentChatClientHistory();

        var lastDate = null;
        caseHistory.sessions.forEach(function (session) {
            var sessionTimestamp = commonUtilService.fixTimestamp(session.created_time);
            if (!lastDate || !commonUtilService.areDatesEqual(lastDate, sessionTimestamp)) {
                var dateMsg = {
                    event: 'date-message',
                    history: true,
                    date: sessionTimestamp,
                    sessionId: session.sessionId
                };
                clientChatUiAppendLog(dateMsg);
                lastDate = sessionTimestamp;
            }
            historySessionHandler(session);
        });
        if (lastDate) {
            var now = new Date();
            var sessionId = sessionStorage.getItem('sp-chat-session');
            if (!commonUtilService.areDatesEqual(lastDate, now)) {
                var dateMsg = {
                    event: 'date-message',
                    history: true,
                    date: Date.now(),
                    sessionId: sessionId
                };
                clientChatUiAppendLog(dateMsg);
            }
        }
        setTimeout(persistentChat.fixHistoryMessagesRaw);
    }
})();
