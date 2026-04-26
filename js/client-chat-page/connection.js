var clientChatPageConnection = function () {

    var connect = function () {
        var connectRequestData = clientChatPageGetConnectRequestData();
        if (connectRequestData.parameters.message) {
            var savedMsgId = Number(localStorage.getItem('bp-sent-message-id'));
            var initialMsgId = (savedMsgId && !isNaN(savedMsgId)) ? savedMsgId : 1;
            connectRequestData.initialMessage = {
                event: commonConstants.events.chat.session.MESSAGE,
                msg: escapeHTML(connectRequestData.parameters.message),
                msg_id: '' + initialMsgId
            };
            localStorage.setItem('bp-sent-message-id', initialMsgId + 2);
        }

        var startSession = function () {
            chatApiSessionCreateSession(connectRequestData)
            .fail(function (e) {
                document.querySelector('#error').innerHTML(e.text + '. Retrying...');
                $('#error').css('display', 'block');
                window.setTimeout(connect, 4000);
            })

            .done(function (session) {
                onConnected(session);
                if (connectRequestData.initialMessage) {
                    var uiEvent = {
                        event: commonConstants.events.chat.session.MESSAGE,
                        party_id: session.session.sessionId,
                        msg: connectRequestData.initialMessage.msg,
                        msg_id: connectRequestData.initialMessage.msg_id,
                        timestamp: Math.round(Date.now() / 1000).toString()
                    };
                    var helpers = chatApiSessionCreateSessionHandlerHelpers();
                    clientChatUiAppendLog(helpers.prepareLogEvent(session.session, uiEvent));
                }
            });
        };

        if (window.bpWidgetMain && window.bpWidgetMain.shouldAllowSessionStart) {
            window.bpWidgetMain.init();
            window.bpWidgetMain.shouldAllowSessionStart().then(function (allowed) {
                if (!allowed) {
                    document.querySelector('#error').innerHTML = 'Identity verification failed. Please complete verification and try again.';
                    $('#error').css('display', 'block');
                    if (window.bpWidgetMain.showVerificationStatus) {
                        window.bpWidgetMain.showVerificationStatus('Identity verification failed. Please complete verification and try again.', 'error');
                    }
                    return;
                }
                startSession();
            }).catch(function () {
                document.querySelector('#error').innerHTML = 'Identity verification failed. Please try again.';
                $('#error').css('display', 'block');
                if (window.bpWidgetMain.showVerificationStatus) {
                    window.bpWidgetMain.showVerificationStatus('Identity verification failed. Please try again.', 'error');
                }
            });
            return;
        }

        startSession();
    };

    var onConnected = function (o) {
        var i18n = clientChatUiI18n();
        $('#error').css('display', 'none');
        var oldSessionId = sessionStorage.getItem('sp-chat-session');
        sessionStorage.setItem('sp-chat-session', o.session.sessionId);
        if (o.session.sessionId !== oldSessionId) {
            sessionStorage.removeItem('bp-clicked-buttons-msg-id');
            sessionStorage.removeItem('bp-last-message');
            sessionStorage.removeItem('bp-last-message-timestamp');
            localStorage.removeItem('bp-sent-message-id');
        }
        window.localStorage.setItem('chattedBefore','true');
        window.chatSession = o.session;

        persistentChat.fixHistoryMessages();
        clientChatPageShowForm('start_form', '');

        o.session.assignUICallbacks({

            onFormShow: function (f) {
                clientChatPageShowForm(f.form_name, f.form_request_id);
                window.parent.postMessage('bp-stop-cobrowsing', '*');
            },
            onChatConnected: function () {
                clientChatPageShowForm('connect_chat_form', '');
            },
            onChatQueued: function () {
                clientChatPageShowForm('find_agent_form', '');
            },
            onFormSent: function (msg) {
                if (o.session.sessionStatus) {
                    switch (o.session.sessionStatus) {
                        case 'queued':
                            clientChatPageShowForm('find_agent_form', '', msg);
                            break;
                        case 'connected':
                            clientChatPageShowForm('connect_chat_form', '', msg);
                            break;
                    }
                } else {
                    clientChatPageShowForm('start_form', '', msg);
                }
            },
            onLogEvent: function (event) {
                $.chatUI.appendLog(event);
                clientChatPageUpdateScrollbar();
            },
            onAutostartVideocall: function(o, p) {
                window.chatSession.callPrompt = $('#call-prompt');
                window.chatSession.webRTCSignaling(window.chatSession.internalParty.id).requestCall(true);
                o.videocallAutostarted = true;
            },
            onSessionEnded: function () {
                if (o.session.sessionStatus) {
                    o.session.sessionStatus = undefined;
                    //the session is ended, but there is no party
                    //it occurs when no agent available, no need to close chat
                    //there is some messages, chat closed bu customer
                    $('#callMe').css("display", "none");
                    $('#shareScreen').css("display", "none");
                    $('#minimizeChat').css("display", "none");
                    $('#chat-body').addClass("sp-readonly");
                    $('#agent-name').text(i18n.sessionCompletedWidgetTitle);
                    $('#min_agent_name').text(i18n.sessionCompletedWidgetTitle);

                    clientChatPageUpdateScrollbar();
                    window.parent.postMessage('bp-stop-cobrowsing-and-close-chat', '*');
                    return;
                }
                window.setTimeout(function () {
                    sessionStorage.removeItem('bp-clicked-buttons-msg-id');
                    sessionStorage.removeItem('bp-last-message');
                    sessionStorage.removeItem('bp-last-message-timestamp');
                    localStorage.removeItem('bp-sent-message-id');
                    sessionStorage.removeItem('bp-min-message-counter');
                    sessionStorage.removeItem('bp-minimized');
                    window.parent.postMessage('sp-session-end', '*');
                }, 50);
            }
        });

        if (!o.is_new_chat) {
            o.session.getHistory();
        }

        var urlVars = clientChatPageGetUrlVars(window.location.href);
        $.chatUI.sendNavigation(o.session, urlVars['referrer'], urlVars['referrerTitle']);

        clientChatPageInitDragAndDrop();

    };

    // two exports because connect need onConnected and back
    return {
        connect: connect,
        onConnected: onConnected
    }
};
