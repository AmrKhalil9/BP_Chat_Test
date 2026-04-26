var chatApiSessionBuildSessionFromSessionId = function (cp, id, state) {
    var r = {
        chat_id: id,
        state: state
    };
    r.session = chatApiSessionCreateSessionHandler(cp, r);
    return r;
};
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
var chatApiSessionCheckSessionExists = function (cp, sessionId) {
    var historyEndpoint = 'chats/' + sessionId + '/history?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
    return chatApiSessionSendXhr(cp, historyEndpoint, "GET");
};
var chatApiSessionCreateSession = function (cp) {

    var lastInvocationTime = localStorage.getItem('bp-chat-start-last-invocation-time');
    var newInvocationTime = Date.now();
    if (lastInvocationTime && newInvocationTime < Number(lastInvocationTime) + 1000) {
        console.error('Attempt to start a chat twice in 1 second');
        return;
    }
    localStorage.setItem('bp-chat-start-last-invocation-time', newInvocationTime);

    chatApiSessionVariables.logging = cp.parameters.logging;

    if (SERVICE_PATTERN_CHAT_CONFIG.directChatPIN) {
        cp.parameters.directChatPIN = SERVICE_PATTERN_CHAT_CONFIG.directChatPIN;
    }

    var endpoint = 'chats?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
    var requestPayload = {
        phone_number: cp.phone_number,
        from: cp.from,
        parameters: cp.parameters
    };
    if (cp.initialMessage) {
        requestPayload.initial_message = cp.initialMessage;
    }
    return chatApiSessionSendXhr(cp, endpoint, 'POST', requestPayload).pipe(function (r) {
        r.session = chatApiSessionCreateSessionHandler(cp, r);
        return r;
    });
};
var chatApiSessionCreateSessionHandler = function (cp, r) {
    var helpers = chatApiSessionCreateSessionHandlerHelpers();
    var textFormId;

    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
        if (node instanceof HTMLAnchorElement) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });

    var pendingEventsQueue = [];
    persistentChat.onHistoryLoaded(function () {
        for (var i = 0; i < pendingEventsQueue.length; ++i) {
            o.handleEvent(pendingEventsQueue[i]);
        }
        pendingEventsQueue = [];
    });

    function onLogEvent(msg) {
        var sessionId = sessionStorage.getItem('sp-chat-session');
        msg.sessionId = sessionId;
        if (commonUtilService.getIncomingEventStatus(msg) === 'new') {
            persistentChat.addMessageToChatHistory(msg);
        }
        o.uiCallbacks.onLogEvent(msg);
    }

    var savedMsgId = Number(localStorage.getItem('bp-sent-message-id'));
    var initialMsgId = (savedMsgId && !isNaN(savedMsgId)) ? savedMsgId : 1;
    function incrementMsgId() {
        o.msgId = o.msgId + 2;
        localStorage.setItem('bp-sent-message-id', o.msgId);
    }

    function processEvent(msg) {
        chatApiSessionPrintToConsole('Event received', msg);

        if (persistentChat.isEnabled() && !persistentChat.isHistoryLoaded()) {
            pendingEventsQueue.push(msg);
        }

        switch (msg.event) {
            case commonConstants.events.chat.session.INFO:
                o.serviceName = msg.service_name;
                break;

            case commonConstants.events.chat.session.STATUS:
                helpers.changeSessionState(o, msg.state);
                break;

            case commonConstants.events.chat.session.NETWORK_CONNECTION_ERROR:
                msg.fromClass = 'sys';
                msg.fromName = o.entryName;
                onLogEvent(msg);
                if (o.uiCallbacks.hideChatInput) {
                    o.uiCallbacks.hideChatInput();
                }
                break;

            case commonConstants.events.chat.session.NETWORK_CONNECTION_ESTABLISHED:
                msg.fromClass = 'sys';
                msg.fromName = o.entryName;
                onLogEvent(msg);
                if (!o.sessionEnded) {
                    o.uiCallbacks.showChatInput();
                }
                break;

            case commonConstants.events.chat.session.ENDED:
                o.sessionEnded = true;
                o.internalParty = undefined;
                if (o.webRTC) {
                    o.webRTC.closeConnection();
                }
                msg.fromClass = 'sys';
                msg.fromName = o.entryName;
                onLogEvent(msg);
                o.uiCallbacks.onSessionEnded();
                break;

            case commonConstants.events.chat.session.TYPING:
                o.uiCallbacks.onSessionTyping(o.parties[msg.party_id]);
                break;

            case commonConstants.events.chat.session.FORM_SHOW:
                if (msg.form_name === '') {
                    textFormId = msg.form_request_id;
                }
                o.uiCallbacks.onFormShow(msg);
                break;

            case commonConstants.events.chat.session.SECURE_FORM_SHOW:
                onLogEvent(helpers.prepareLogEvent(o, msg));
                break;

            case commonConstants.events.chat.session.NOT_TYPING:
                o.uiCallbacks.onSessionNotTyping(o.parties[msg.party_id]);
                break;

            case commonConstants.events.chat.session.PARTY_JOINED:
                var p = helpers.buildParty(o, msg);
                helpers.detectParty(o);
                onLogEvent(helpers.preparePartyLogEvent(o, msg, p));
                var definition = widgetConfiguration.getDefinition();
                if (definition && definition.chatWidgetStyling) {
                    var sound = new Audio(definition.chatWidgetStyling.agentJoinSoundUrl);
                    if (sound) {
                        try {
                            var deffered = sound.play();
                            if (deffered) {
                                deffered.then(function () { }, function (error) {
                                    console.warn(error);
                                }).catch(function (e) {
                                    console.warn(error);
                                });
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
                if (
                    !o.videocallAutostarted &&
                    p.type == 'internal' &&
                    clientChatPageGetUrlVars(window.location.href)['autostartVideocall'] == 'true'
                ) {
                    o.uiCallbacks.onAutostartVideocall(o, p);
                }
                break;

            case commonConstants.events.chat.session.PARTY_LEFT:
                var party = o.parties[msg.party_id];
                delete o.parties[msg.party_id];
                helpers.detectParty(o);
                onLogEvent(helpers.preparePartyLogEvent(o, msg, party));
                break;

            case commonConstants.events.chat.session.MESSAGE:
                var sanitizedMessage = DOMPurify.sanitize(msg.msg, {USE_PROFILES: {html: true}});
                msg.msg = sanitizedMessage;
                msg.fromClass = 'session_msg';
                onLogEvent(helpers.prepareLogEvent(o, msg));
                break;

            case commonConstants.events.chat.session.FILE:
                function logFileEvent() {
                    msg.party_id = msg.party_id || o.sessionId;
                    msg.fileUrl = o.cp.url + '/chats/' + o.sessionId + '/files/' + msg.file_id;
                    msg.msg_id = msg.file_id;
                    onLogEvent(helpers.prepareLogEvent(o, msg));
                }
                if (msg.sessionHistory) {
                    logFileEvent();
                } else {
                    setTimeout(logFileEvent, 700);
                }
                break;

            case commonConstants.events.chat.session.FILE_URL:
                setTimeout(function () {
                    msg.party_id = msg.party_id || o.sessionId;
                    msg.fileUrl = msg.file_url;
                    var i = msg.file_url.lastIndexOf('/');
                    if (i !== -1) {
                        msg.file_name = msg.file_url.substring(i + 1);
                    } else {
                        msg.file_name = msg.file_url;
                    }
                    o.uiCallbacks.onLogEvent(helpers.prepareLogEvent(o, msg));
                }, 700);
                break;
            case commonConstants.events.chat.session.DIRECTIVE_FILE_URL:
                //idk why timers are used for FILE/FILE_URL just removed them here to keep directive/message order
                //and break only this event if timers must be used
                msg.party_id = msg.party_id || o.sessionId;
                msg.fileUrl = msg.file_url;
                var i = msg.file_url.lastIndexOf('/');
                if (i !== -1) {
                    msg.file_name = msg.file_url.substring(i + 1);
                } else {
                    msg.file_name = msg.file_url;
                }
                onLogEvent(helpers.prepareLogEvent(o, msg));
                break;
            case commonConstants.events.chat.session.TIMEOUT_WARNING:
                msg.fromClass = 'sys';
                onLogEvent(helpers.prepareLogEvent(o, msg));
                break;

            case commonConstants.events.chat.session.INACTIVITY_TIMEOUT:
                o.internalParty = undefined;
                msg.fromClass = 'sys';
                onLogEvent(helpers.prepareLogEvent(o, msg));
                o.sessionEnded = true;
                if (o.webRTC) {
                    o.webRTC.closeConnection();
                }
                o.sessionStatus = 'failed';
                o.uiCallbacks.onSessionEnded();
                break;

            case commonConstants.events.chat.session.SIGNALING:
                helpers.handleSignaling(o, msg);
                break;

            case commonConstants.events.chat.session.COBROWSING_REQUESTED:
                if (commonUtilService.getIncomingEventStatus(msg) === 'new') {
                    window.parent.postMessage('bp-cobrowsing-requested', '*');
                }
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

            case commonConstants.events.chat.session.CASE_SET:
                o.getCaseHistory(msg.case_id);
                break;

            case commonConstants.events.chat.session.EDIT_MESSAGE:
                var sanitizedMessage = DOMPurify.sanitize(msg.msg, {USE_PROFILES: {html: true}});
                editMessage({
                    sessionId: o.sessionId,
                    partyId: msg.party_id,
                    timestamp: msg.timestamp,
                    refMsgId: msg.ref_msg_id,
                    msg: sanitizedMessage
                }, o);
                break;

            case commonConstants.events.chat.session.DELETE_MESSAGE:
                deleteMessage({
                    sessionId: o.sessionId,
                    refMsgId: msg.ref_msg_id
                });
                break;

        }
    }

    var o = {
        parties: {},
        displayName: "me",
        status: r.state,
        sessionId: r.chat_id,
        msgId: initialMsgId,
        cp: cp,

        handleEvent: function (event) {
            eventPreprocessor.preprocessEvent(event, processEvent);
        },

        getProfilePhotoUrl: function (partyId) {
            if (partyId) {
                return o.cp.url + '/chats/' + o.sessionId + '/profilephotos/' + partyId;
            } else {
                return o.cp.url + '/chats/' + o.sessionId + '/chaticon';
            }
        },

        getHistory: function () {
            sessionStorage.removeItem('showForm');
            var historyEndpoint = 'chats/' + o.sessionId + '/history?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
            return chatApiSessionSendXhr(cp, historyEndpoint, "GET").pipe(function (history) {
                var offerRtc = chatApiSessionHandleHistoryEvents(history, o);
                if (offerRtc) {
                    window.chatSession.callPrompt = $('#call-prompt');
                    o.webRTCSignaling(offerRtc.party_id).requestCall(offerRtc.data.offerVideo);
                }
            });
        },

        getCaseHistory: function (caseId) {
            if (!caseId) {
                return;
            }
            var caseHistoryEndpoint = 'chats/' + o.sessionId + '/casehistory?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
            return chatApiSessionSendXhr(cp, caseHistoryEndpoint, "GET").pipe(function (caseHistory) {
                caseHistoryHandler(caseHistory, helpers, o.uiCallbacks.onLogEvent);
                setTimeout(function () { clientChatPageUpdateScrollbar(); }, 500)
            });
        },

        send: function (msg, options) {
            var sanitizedMessage = DOMPurify.sanitize(msg, {USE_PROFILES: {html: true}});
            var escapedMessage = escapeHTML(sanitizedMessage);
            var m = {
                event: commonConstants.events.chat.session.MESSAGE,
                party_id: o.sessionId,
                msg: escapedMessage,
                msg_id: '' + o.msgId,
                timestamp: Math.round(Date.now() / 1000).toString()
            };

            if (typeof ('options') !== 'undefined') {
                m.options = options;
            }

            onLogEvent(helpers.prepareLogEvent(o, m));

            if (textFormId) {
                var data = {};
                data.text = escapedMessage;
                o.sendFormData(textFormId, "", data);
                textFormId = undefined;
            }
            var eventBody = {
                event: commonConstants.events.chat.session.MESSAGE,
                msg: escapedMessage,
                msg_id: '' + o.msgId
            };
            if (options && options.directiveId) {
                eventBody.directive_id = options.directiveId;
            }
            if (options && options.alternateMsg && options.alternateMsg.type === 'cobrowsing') {
                eventBody.type = 'cobrowsing';
            }
            helpers.sendEvent(cp, o, eventBody);
            incrementMsgId();
        },

        sendLocation: function (latitude, longitude) {
            helpers.sendEvent(cp, o, {
                event: commonConstants.events.chat.session.LOCATION,
                latitude: latitude,
                longitude: longitude,
                msg_id: '' + o.msgId
            });
            incrementMsgId();
        },

        sendNavigation: function (page, title) {
            helpers.sendEvent(cp, o, {
                event: commonConstants.events.chat.session.NAVIGATION,
                page: page,
                title: title,
                msg_id: '' + o.msgId
            });
            incrementMsgId();
        },

        sendFormData: function (formRequestId, formName, formData) {
            var msg = {
                event: commonConstants.events.chat.session.FORM_DATA,
                form_request_id: formRequestId,
                form_name: formName,
                data: formData
            };
            chatApiSessionPrintToConsole('Message sent', msg);
            helpers.sendEvent(cp, o, msg);
            o.uiCallbacks.onFormSent();
        },

        sendSecureFormData: function (formRequestId, formName, formData) {
            var msg = {
                event: commonConstants.events.chat.session.SECURE_FORM_DATA,
                form_request_id: formRequestId,
                form_name: formName,
                data: formData
            };
            chatApiSessionPrintToConsole('Message sent', msg);
            helpers.sendEvent(cp, o, msg);
            o.uiCallbacks.onFormSent();
        },

        cancelSecureForm: function (formRequestId, formName) {
            var msg = {
                event: commonConstants.events.chat.session.SECURE_FORM_CANCEL,
                form_request_id: formRequestId,
                form_name: formName
            };
            chatApiSessionPrintToConsole('Message sent', msg);
            helpers.sendEvent(cp, o, msg);
            o.uiCallbacks.onFormSent(msg);
        },

        cancelFormData: function (formRequestId, formName) {
            var msg = {
                event: commonConstants.events.chat.session.FORM_DATA_CANCEL,
                form_request_id: formRequestId,
                form_name: formName
            };
            chatApiSessionPrintToConsole('Message sent', msg);
            helpers.sendEvent(cp, o, msg);
            o.uiCallbacks.onFormSent(msg);
        },

        sendTyping: function (message) {
            helpers.sendEvent(cp, o, { event: commonConstants.events.chat.session.TYPING, msg: message });
        },

        sendNotTyping: function () {
            helpers.sendEvent(cp, o, { event: commonConstants.events.chat.session.NOT_TYPING });
        },

        endSession: function () {
            var msg = { event: commonConstants.events.chat.session.END };
            chatApiSessionPrintToConsole('end session', msg);
            if (o.webRTC) {
                o.webRTC.closeConnection();
            }
            helpers.sendEvent(cp, o, msg);

        },

        disconnectSession: function () {
            var msg = { event: commonConstants.events.chat.session.DISCONNECT };

            chatApiSessionPrintToConsole('Message sent', msg);

            if (o.webRTC) {
                o.webRTC.closeConnection();
            }
            helpers.sendEvent(cp, o, msg);
        },

        fileUploaded: function (fileId, fileType, fileName) {
            var event = {
                event: commonConstants.events.chat.session.FILE,
                msg_id: '' + o.msgId,
                file_id: fileId,
                file_type: fileType,
                file_name: fileName
            };
            helpers.sendEvent(cp, o, event);
            o.handleEvent(event);
            incrementMsgId();
        },

        sendCobrowsingRejected: function () {
            var event = { event: commonConstants.events.chat.session.COBROWSING_REJECTED };
            onLogEvent(helpers.prepareLogEvent(o, {
                event: commonConstants.events.chat.session.COBROWSING_REJECTED,
                fromClass: 'sys'
            }));
            helpers.sendEvent(cp, o, event);
        },

        sendCobrowsingStarted: function (provider, url, sessionId) {
            var event = {
                event: commonConstants.events.chat.session.COBROWSING_STARTED,
                provider_type: provider,
                cobrowsing_url: url,
                cobrowsing_id: sessionId
            };
            onLogEvent(helpers.prepareLogEvent(o, {
                event: commonConstants.events.chat.session.COBROWSING_STARTED,
                fromClass: 'sys'
            }));
            helpers.sendEvent(cp, o, event);
        },

        sendCobrowsingEnded: function () {
            var event = { event: commonConstants.events.chat.session.COBROWSING_ENDED };
            onLogEvent(helpers.prepareLogEvent(o, {
                event: commonConstants.events.chat.session.COBROWSING_ENDED,
                fromClass: 'sys'
            }));
            helpers.sendEvent(cp, o, event);
        },

        webRTCSignaling: function (party_id) {

            var requestCall = function (offerVideo) {
                if (o.callPrompt) {
                    o.callPrompt.css("display", "block");
                }
                send({ type: "REQUEST_CALL", offerVideo: offerVideo });
            };

            var endCall = function () {
                send({ type: "END_CALL" });
            };

            var rejectCall = function () {
                send({ type: "CALL_REJECTED" });
            };

            var answerCall = function (sdp) {
                send({ type: "ANSWER_CALL", sdp: sdp });
            };

            var offerCall = function (sdp) {
                chatApiSessionPrintToConsole("send offer");
                send({ type: "OFFER_CALL", sdp: sdp });
            };

            var sendIceCandidate = function (candidate) {
                send({
                    type: "ICE_CANDIDATE",
                    candidate: candidate.candidate,
                    sdpMid: candidate.sdpMid,
                    sdpMLineIndex: candidate.sdpMLineIndex
                });
            };

            var send = function (data) {
                helpers.sendEvent(cp, o, {
                    event: commonConstants.events.chat.session.SIGNALING,
                    msg_id: '' + o.msgId,
                    destination_party_id: party_id,
                    data: data
                });
                incrementMsgId();
            };

            return {
                requestCall: requestCall,
                answerCall: answerCall,
                offerCall: offerCall,
                sendIceCandidate: sendIceCandidate,
                endCall: endCall,
                rejectCall: rejectCall,
            };
        },

        webRTCSession: function (remoteSdp, offerVideo, party_id) {
            if (commonUtilService.isIE()) {
                console.warn('WebRTC is not supported in Internet Explorer');
                return;
            }
            var PeerConnection = window.RTCPeerConnection;
            var IceCandidate = window.RTCIceCandidate;
            var SessionDescription = window.RTCSessionDescription;

            var signaling = o.webRTCSignaling(party_id);

            var onError = function (err) {
                chatApiSessionPrintToConsole("Error", err);
                toggleCallPrompt(false);
                toggleCallControls(false);
            };
            var definition = widgetConfiguration.getDefinition();
            var isCallEnabled = definition && definition.chatWidgetStyling && definition.chatWidgetStyling.videoCallEnabled;
            if (!isCallEnabled) {
                return;
            }
            var videoEnabled = widgetConfiguration.isVisitorVideoEnabled();
            var iceServers = sessionStorage.getItem('iceServersConfiguration');
            if (!iceServers) {
                iceServers = [];
            } else {
                iceServers = JSON.parse(iceServers);
                iceServers.forEach(function (iceServer) {
                    if (iceServer.url) {
                        iceServer.urls = iceServer.url;
                        delete iceServer.url;
                    }
                });
            }
            var pc = new PeerConnection({ iceServers: iceServers });
            pc.onicecandidate = function (event) {
                chatApiSessionPrintToConsole("onicecandidate %o", event);
                if (!!event.candidate) {
                    signaling.sendIceCandidate(event.candidate);
                }
            };
            pc.ontrack = function (ev) {
                chatApiSessionPrintToConsole('onaddstream', ev);
                if (ev.streams && ev.streams[0]) {
                    o.uiCallbacks.onAddStream(ev.streams[0]);
                }
            };

            var hasSDP = false;
            var iceCandidateList = [];

            var localStream;

            var callConfirmed = function () {
                chatApiSessionPrintToConsole('callConfirmed');
                new Promise(function (resolve, reject) {
                    if (videoEnabled) {
                        navigator.mediaDevices.getUserMedia({ video: true })
                            .then(function () { resolve(true) })
                            .catch(function () { resolve(false) })
                    } else {
                        resolve(false)
                    }
                }).then(function (videoAccess) {
                    navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: videoAccess
                    }).then(function (stream) {
                        toggleCallPrompt(false);
                        localStream = stream;
                        try {
                            var tracks = stream.getTracks();
                            tracks.forEach(function (track) {
                                pc.addTrack(track, stream);
                            });
                        } catch (e) {
                        }
                        o.uiCallbacks.onAddLocalStream(stream);
                        if (!remoteSdp) {
                            chatApiSessionPrintToConsole("create offer");
                            pc.createOffer().then(function (data) {
                                pc.setLocalDescription(data).then(function () {
                                    hasSDP = true;
                                    signaling.offerCall(data.sdp);
                                }).catch(onError);
                            }).catch(onError);
                        } else {
                            chatApiSessionPrintToConsole("createAnswer");
                            offerReceived(remoteSdp);
                            pc.createAnswer().then(function (data) {
                                pc.setLocalDescription(data).then(function () {
                                    hasSDP = true;
                                    iceCandidateList.forEach(addIceCandidate);
                                    signaling.answerCall(data.sdp);
                                }).catch(onError)
                            }).catch(onError);
                        }
                    }).catch(onError);
                });
            };

            var callRejected = function () {
                chatApiSessionPrintToConsole("callRejected");
                signaling.rejectCall();
                closeConnection();
            };

            var offerReceived = function (sdp) {
                chatApiSessionPrintToConsole("offerReceived set remote description");
                pc.setRemoteDescription(new SessionDescription({
                    type: "offer",
                    sdp: sdp
                })).then(function () {
                    chatApiSessionPrintToConsole('setRemoteDescription success');
                    toggleCallConfirmationDialog(false);
                    toggleInCallControls(true);
                    if (offerVideo) {
                        htmlUtilService.displayBlock($('#myCam'));
                        htmlUtilService.displayBlock($('#video'));
                        unmuteVideo();
                    } else {
                        $('#call-controls_mute-video').addClass('off');
                    }
                    updateChatView();
                }).catch(onError);
            };

            var answerReceived = function (sdp) {
                chatApiSessionPrintToConsole("answer received set remote description ");
                pc.setRemoteDescription(new SessionDescription({
                    type: "answer",
                    sdp: sdp
                })).then(function () {
                    chatApiSessionPrintToConsole('setRemoteDescription success');
                }).catch(onError);
            };

            var addIceCandidate = function (candidate) {
                chatApiSessionPrintToConsole("addIceCandidate", candidate);
                if (hasSDP) {
                    pc.addIceCandidate(new IceCandidate(candidate)).then(function () {
                        chatApiSessionPrintToConsole('addIceCandidate success');
                    }).catch(onError);
                } else {
                    iceCandidateList.push(candidate);
                }
            };

            var closeConnection = function () {
                signaling.endCall();
                $('#video').hide();
                toggleCallPrompt(false);
                toggleCallControls(false);
                toggleCallConfirmationDialog(false);
                toggleInCallControls(false);
                try {
                    pc.close();
                } catch (e) {

                }
                try {
                    localStream.getTracks().forEach(function (track) {
                        track.stop()
                    });
                } catch (e) {

                }

                pc = undefined;
            };

            var updateTracks = function (kind, value) {
                localStream.getTracks().forEach(function (track) {
                    if (track.kind === kind) {
                        track.enabled = value;
                    }
                });
            };

            var updateChatView = function () {
                var $preCallControls = $('#call-controls_before-call');
                var $inCallControls = $('#call-controls_in-call');
                var $video = $('#video');
                var preCallControlsHeight = 98;
                var inCallControlsHeight = 66;
                var videoHeight = 230;
                var value = 0;

                if ($preCallControls.is(":visible")) {
                    value += preCallControlsHeight;
                } else if ($inCallControls.is(":visible")) {
                    value += inCallControlsHeight;
                }

                if (value && $video.is(":visible")) {
                    value += videoHeight;
                }

                $('#servicepattern-chat').css('top', value);
                clientChatPageUpdateScrollbar();
            };

            var muteAudio = function () {
                updateTracks('audio', false);
            };
            var unmuteAudio = function () {
                updateTracks('audio', true);
            };
            var muteVideo = function () {
                updateTracks('video', false);
            };
            var unmuteVideo = function () {
                updateTracks('video', true);
            };

            var toggleCallPrompt = function (isShown) {
                chatApiSessionPrintToConsole("toggleCallPrompt: " + (isShown ? 'show' : 'hide'));
                if (o.callPrompt) {
                    o.callPrompt.css('display', isShown ? 'block' : 'none');
                    $('#callMe').css('display', isShown ? 'none' : 'block');
                }
            };

            var toggleCallControls = function (isShown) {
                chatApiSessionPrintToConsole("toggleCallControls: " + (isShown ? 'show' : 'hide'));
                $('#call-controls').css('display', isShown ? 'block' : 'none');
                $('#callMe').css('display', isShown ? 'none' : 'block');
                updateChatView();
            };

            var toggleCallConfirmationDialog = function (isShown) {
                chatApiSessionPrintToConsole("toggleCallConfirmationDialog: " + (isShown ? 'show' : 'hide'));
                $('#call-controls_before-call')
                    .css('display', isShown ? 'block' : 'none')
                    .find('span:first-child')
                    .text(offerVideo ? 'video' : 'audio');
            };

            var toggleInCallControls = function (isShown) {
                chatApiSessionPrintToConsole("toggleInCallControls: " + (isShown ? 'show' : 'hide'));
                $('#call-controls_in-call').css('display', isShown ? 'block' : 'none');
            };

            o.webRTC = {
                callConfirmed: callConfirmed,
                callRejected: callRejected,
                offerReceived: offerReceived,
                answerReceived: answerReceived,
                addIceCandidate: addIceCandidate,
                closeConnection: closeConnection,
                muteAudio: muteAudio,
                unmuteAudio: unmuteAudio,
                muteVideo: muteVideo,
                unmuteVideo: unmuteVideo,
                toggleCallPrompt: toggleCallPrompt,
                toggleCallControls: toggleCallControls,
                toggleCallConfirmationDialog: toggleCallConfirmationDialog,
                toggleInCallControls: toggleInCallControls,
                updateChatView: updateChatView,
            };

            return o.webRTC;
        },

        assignUICallbacks: function (a) {
            var cb = a || {};
            o.uiCallbacks = {};
            o.uiCallbacks.onChatQueued = cb.onChatQueued || helpers.noop;
            o.uiCallbacks.onChatConnected = cb.onChatConnected || helpers.noop;
            o.uiCallbacks.onSessionEnded = cb.onSessionEnded || helpers.noop;
            o.uiCallbacks.onLogEvent = cb.onLogEvent || helpers.noop;
            o.uiCallbacks.onSessionTyping = function (party) {
                if (party && cb.onSessionTyping) cb.onSessionTyping(party);
            };
            o.uiCallbacks.onSessionNotTyping = function (party) {
                if (party && cb.onSessionNotTyping) cb.onSessionNotTyping(party);
            };
            o.uiCallbacks.onFormShow = cb.onFormShow || helpers.noop;
            o.uiCallbacks.onFormSent = cb.onFormSent || helpers.noop;
            o.uiCallbacks.onCallConfirm = cb.onCallConfirm || helpers.noop;
            o.uiCallbacks.onAddStream = cb.onAddStream || helpers.noop;
            o.uiCallbacks.onAddLocalStream = cb.onAddLocalStream || helpers.noop;
            o.uiCallbacks.onAutostartVideocall = cb.onAutostartVideocall || helpers.noop;
        },

        reassignUICallbacks: function (a) {

            if (!o.uiCallbacks) {
                o.assignUICallbacks(a);
                return;
            }

            var cb = a || {};

            if (cb.onChatQueued) {
                o.uiCallbacks.onChatQueued = cb.onChatQueued;
            }

            if (cb.onChatConnected) {
                o.uiCallbacks.onChatConnected = cb.onChatConnected;
            }

            if (cb.onSessionEnded) {
                o.uiCallbacks.onSessionEnded = cb.onSessionEnded;
            }

            if (cb.onLogEvent) {
                o.uiCallbacks.onLogEvent = cb.onLogEvent;
            }

            if (cb.onSessionTyping) {
                o.uiCallbacks.onSessionTyping = function (party) {
                    if (party) cb.onSessionTyping(party);
                };
            }

            if (cb.hideChatInput) {
                o.uiCallbacks.hideChatInput = function () {
                    cb.hideChatInput()
                };
            }

            if (cb.showChatInput) {
                o.uiCallbacks.showChatInput = function () {
                    cb.showChatInput()
                };
            }

            if (cb.onSessionNotTyping) {
                o.uiCallbacks.onSessionNotTyping = function (party) {
                    if (party) cb.onSessionNotTyping(party);
                };
            }

            if (cb.onFormShow) {
                o.uiCallbacks.onFormShow = cb.onFormShow;
            }

            if (cb.onFormSent) {
                o.uiCallbacks.onFormSent = cb.onFormSent;
            }

            if (cb.onAddStream) {
                o.uiCallbacks.onAddStream = cb.onAddStream;
            }

            if (cb.onAddLocalStream) {
                o.uiCallbacks.onAddLocalStream = cb.onAddLocalStream;
            }
        }
    };

    o.assignUICallbacks(null);

    loadWebRtcIceServers(cp, o);
    chatApiSessionStartPoll(cp, o);

    return o;
};
var chatApiSessionCreateSessionHandlerHelpers = function () {
    var helpers = {
        sendEvent: function (cp, o, event) {
            var endpoint = 'chats/' + o.sessionId + '/events?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
            return chatApiSessionSendXhr(cp, endpoint, 'POST', {events: [event]});
        },

        changeSessionState: function (o, state) {
            o.sessionStatus = state;
            switch (state) {
                case 'failed':
                    o.sessionEnded = true;
                    if (o.webRTC) {
                        o.webRTC.closeConnection();
                    }
                    o.uiCallbacks.onSessionEnded();
                    break;

                case 'queued':
                    o.uiCallbacks.onChatQueued();
                    break;

                case 'connected':
                    o.uiCallbacks.onChatConnected();
                    break;
            }
        },

        handleSignaling: function (o, msg) {
            var type = msg.data.type;
            var offerVideo = msg.data.offerVideo === 'true';

            switch (type) {
                case 'OFFER_CALL':
                    o.webRTCSession(msg.data.sdp, offerVideo, msg.party_id);
                    if (o.callPrompt && o.callPrompt.is(":visible")) {
                        // call initiated by client
                        o.webRTC.callConfirmed();
                    } else {
                        // call initiated by agent
                        o.webRTC.toggleCallConfirmationDialog(true);
                    }
                    if (o.webRTC) {
                        o.webRTC.toggleCallControls(true);
                    }
                    break;

                case 'ANSWER_CALL':
                    if (o.webRTC) {
                        o.webRTC.answerReceived(msg.data.sdp);
                    }
                    break;

                case 'ICE_CANDIDATE':
                    if (o.webRTC) {
                        o.webRTC.addIceCandidate(msg.data);
                    }
                    break;

                case 'END_CALL':
                    if (o.webRTC) {
                        o.webRTC.closeConnection();
                    }
                    break;
            }
        },

        buildParty: function (o, msg) {
            var p = {
                id: msg.party_id,
                type: msg.type,
                firstName: msg.first_name,
                lastName: msg.last_name,
                displayName: msg.display_name
            };

            o.parties[p.id] = p;
            return p;
        },

        detectParty: function (o) {
            o.scenarioParty = undefined;
            o.internalParty = undefined;
            for (var prop in o.parties) {
                if (o.parties.hasOwnProperty(prop)) {
                    var p = o.parties[prop];
                    switch (p.type) {
                        case 'scenario':
                            o.scenarioParty = p;
                            break;

                        case 'internal':
 //                       case 'msteams':
                            o.internalParty = p;
                            break;
                    }
                }
            }
        },

        prepareLogEvent: function (o, msg) {
            if (
                msg.party_id === o.sessionId ||
                /* special case for first customer msg from form */
                (msg.event === commonConstants.events.chat.session.MESSAGE && !('party_id' in msg))
            ) { // that's customer
                msg.fromClass = 'me';
                msg.fromName = o.displayName;
            } else {
                var party = o.parties[msg.party_id];
                var snippetConfig = widgetConfiguration.getSnippet();
                if(snippetConfig && snippetConfig.contactTab && snippetConfig.contactTab.iconUrl) {
                    msg.profilePhotoUrl = snippetConfig.contactTab.iconUrl;
                } else {
                    msg.profilePhotoUrl = 'none';
                }
                msg.fromName = '';
                if (party) {
                    switch (party.type) {
                        case 'scenario':
                            msg.fromClass = 'agent';
                            msg.fromName = party.displayName ? party.displayName : '';
                            break;
                        default:
                            msg.fromClass = 'agent';
                            msg.profilePhotoUrl = o.getProfilePhotoUrl(party.id);
                            msg.fromName = party.displayName ? party.displayName : 'Rep';
                    }
                }
            }
            return msg;
        },

        preparePartyLogEvent: function (o, event, party) {
            event.fromClass = 'sys';
            if (party && (party.type === 'internal' || party.type === 'msteams')) {
                event.fromName = party.displayName;
                event.firstName = party.firstName;
                event.lastName = party.lastName;
                event.profilePhotoUrl = o.getProfilePhotoUrl(party.id);
                return event;
            }
            return {fromClass: 'sys'};
        },

        noop: function () {}
    };

    return helpers;
};

/* Custom HTML sanitizer
    needs to be in sync with AD version at agentdesktop/src/com/brightpattern/agentdesktop/client/chat/presenter/ChatUtils.java
 */
var escapeHTML = function(msg) {
    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = msg;
    
    var result = escapeRecursive(document.createElement("div"), tempDiv.childNodes);

    return result.innerHTML;
}

var escapeRecursive = function(result, childNodes) {
    if (childNodes.length === 0) {
        return result;
    }

    [].forEach.call(childNodes, function (node) {
        switch (node.nodeName) {
            case "A":
                var a;
                var href = node.href;
                if(isValidHrefAttribute(href)) {
                    a = document.createElement("a");
                    a.setAttribute("href", encodeURI(href));
                    a.setAttribute("target", "_blank");
                    a.innerText = node.innerText;
                } else {
                    a = document.createTextNode(node.innerText);
                }
                
                result.appendChild(a);

                break;
            case "BR":
                var br = document.createElement("br");
                result.appendChild(br);
                break;
            case "#text":
                var tmpDiv = document.createElement("div");
                tmpDiv.innerText = node.nodeValue;
                if (tmpDiv.childNodes.length > 1) {
                    escapeRecursive(result, tmpDiv.childNodes);
                } else {
                    result.appendChild(tmpDiv.childNodes[0]);
                }
                break;
            case "DIV":
                // Safari-specific issue trac #26009, part 2
                if (commonUtilService.isSafari()) {
                    var br = document.createElement("br");
                    result.appendChild(br);
                    if (node.childNodes.length !== 1 || node.childNodes[0].nodeName !== "BR") {
                        escapeRecursive(result, node.childNodes);
                    }
                }
                break;
            default:
                escapeRecursive(result, node.childNodes);
                break;
        }
    });

    return result;
}

var isValidHrefAttribute = function(href){
    return (isValidProtocol(href) && isValidHost(href)) || isValidEmailAddress(href);
}

var isValidProtocol = function(href){
    return !!href.match(/^((https?|ftp):\/\/|\.{0,2}\/)/);
}

var isValidHost = function(href){
    var a = document.createElement("a");
    a.href = href;
    
    return !!a.host;
}

var isValidEmailAddress = function(href){
    var pattern = /^mailto:[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return !!href.match(pattern);
}

var eventPreprocessor = (function () {

    var preprocessEvent = function (event, eventProcessor) {
        switch (event.event) {
            case commonConstants.events.chat.session.MESSAGE:
                processMessage(event, eventProcessor);
                break;
            default:
                eventProcessor(event);
                break;
        }
    }

    var processMessage = function (event, eventProcessor) {
        var fileEvents = findFileEvents(event);

        if (fileEvents.length === 0) {
            eventProcessor(event);
        } else {
            var messageEvents = findMessageEvents(event);
            var mergedEvents = mergeEvents(fileEvents, messageEvents);
            mergedEvents.forEach(function (e) {
                eventProcessor(e);
            });
        }
    }

    var findFileEvents = function (event) {
        var attachmentRegex = new RegExp('\\/attachment(\\s*:\\s*|\\s+)(http[^\\s^,]+)(\\s*,\\s*(audio|video|image))?', 'gi');
        var text = event.msg_text || event.msg;
        var files = [];

        var match = attachmentRegex.exec(text);
        while (match) {
            var fileEvent = createFileEvent(match, event);
            files.push(fileEvent);

            match = attachmentRegex.exec(text);
        }

        return files;
    }

    var createFileEvent = function (match, event) {
        var fileEvent = Object.assign({}, event, {
            msg_id: crypto.randomUUID().toUpperCase(),
            original_msg_id: event.msg_id,
            event: commonConstants.events.chat.session.DIRECTIVE_FILE_URL,
            file_url: match[2],
            file_type: match[4] || 'attachment'
        });

        delete fileEvent.msg;
        delete fileEvent.msg_text;

        return fileEvent;
    }

    var findMessageEvents = function (event) {
        var messageRegex = new RegExp('\\/attachment(?:\\s*:\\s*|\\s+)(?:http[^\\s^,]+)(?:\\s*,\\s*(?:audio|video|image))?', 'i');
        var text = event.msg || event.msg_text || ''; //try to parse msg first to keep html markup
        var messages = text.split(messageRegex);

        return messages.map(function (message) {
            return createMessageEvent(message.trim(), event);
        });
    }

    var createMessageEvent = function (message, event) {
        function innerText(html){
            var dif = document.createElement('div');
            dif.innerHTML = html;

            return dif.innerText;
        }

        return Object.assign({}, event, {
            msg_id: crypto.randomUUID().toUpperCase(),
            original_msg_id: event.msg_id,
            msg: message,
            msg_text: innerText(message)
        });
    }

    var mergeEvents = function (fileEvents, messageEvents) {
        var result = [];
        for (var i = 0, j = 0; i < fileEvents.length && j < messageEvents.length; i++, j++) {
            var fileEvent = fileEvents[i];
            var messageEvent = messageEvents[j];
            if (messageEvent.msg.length > 0) {
                result.push(messageEvent);
            }
            result.push(fileEvent);
        }

        if (fileEvents.length > messageEvents.length) {
            result.push(...fileEvents.slice(messageEvents.length));
        } else if (fileEvents.length < messageEvents.length) {
            result.push(...messageEvents.slice(fileEvents.length).filter(function (messageEvent) {
                return messageEvent.msg.length > 0;
            }));
        }

        return result;
    }

    return {
        preprocessEvent: preprocessEvent
    }
}());
var chatApiSessionHandleEvents = function (r, session) {
    if (r.events) {
        for (var i = 0; i < r.events.length; i++) {
            session.handleEvent(r.events[i]);
        }
    }
};
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
var loadWebRtcIceServers = function (cp, o) {
    var iceServersEndpoint = '/iceservers'
        + '?tenantUrl=' + encodeURIComponent(cp.tenantUrl)
        + '&domain=' + encodeURIComponent(window.location.host)
        + '&appId=' + encodeURIComponent(cp.appId)
        + '&sessionId=' + encodeURIComponent(o.sessionId);

    function base64ToUint8Array(base64) {
        var binaryString = atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    function decryptAesGcmWithPbkdf2(sessionId, encryptedData) {
        var encryptedByteArray = base64ToUint8Array(encryptedData);
        var salt = encryptedByteArray.slice(0, 16);
        var iv =  encryptedByteArray.slice(16, 28);
        var ciphertext = encryptedByteArray.slice(28);

        // 1. Derive the AES-GCM Key
        return crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(sessionId),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        ).then(function (passwordKey) {
            return crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt:  salt, // salt should be an ArrayBuffer
                    iterations: 65536,
                    hash: "SHA-256"
                },
                passwordKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["decrypt"]
            );
        }).then(function (aesGcmKey) {
            return crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv, // iv should be an ArrayBuffer
                },
                aesGcmKey,
                ciphertext // ciphertext should be an ArrayBuffer
            );
        }).then(function (decryptedBuffer) {
            return new TextDecoder().decode(decryptedBuffer);;
        }).catch(function (err) {
            console.error('Decryption error:', err);
        });
    }


    return chatApiSessionSendXhr(cp, iceServersEndpoint, "GET").pipe(function (response) {
        decryptAesGcmWithPbkdf2(o.sessionId, response).then(function (decryptedText) {
            var iceServersConfiguration = JSON.parse(decryptedText);
            sessionStorage.setItem('iceServersConfiguration', JSON.stringify(iceServersConfiguration));
        });
    });
};
var chatApiSessionPrepareRequest = function (cp, endpoint, method) {
    var url = cp.url + '/' + endpoint + "&timestamp=" + (new Date().getTime());
    var xhrOptions = {
        type: method,
        url: url,
        headers: {
            Authorization: 'MOBILE-API-140-327-PLAIN appId="' + cp.appId + '", clientId="' + cp.clientId + '"'
        }
    };

    if (cp.crossDomain) {
        xhrOptions.crossDomain = true;
        xhrOptions.xhrFields = {withCredentials: true};
    }

    return xhrOptions;
};
var chatApiSessionPrintToConsole = function (a, b) {
    if (chatApiSessionVariables.logging) {
        if (typeof console !== 'undefined') {
            if (typeof b !== 'undefined') {
                console.log(a + " %o", b);
            } else {
                console.log(a);
            }
        }
    }
};
var chatApiSessionSendXhr = function (cp, endpoint, method, data) {
    var xhrOptions = chatApiSessionPrepareRequest(cp, endpoint, method);
    if (data) {
        if (data.toString() === '[object FormData]') {
            xhrOptions.data = data;
            xhrOptions.contentType = false;
            xhrOptions.processData = false;
        } else {
            xhrOptions.data = JSON.stringify(data);
            xhrOptions.contentType = 'application/json; charset=utf-8';
            xhrOptions.dataType = 'json';
        }
    }
    return jQuery.ajax(xhrOptions);
};
var chatApiSessionStartPoll = function (cp, session) {
    var lastPollRequest = null;
    var isNetworkAvailable = true;

    function handleRequestError(jqXHR, exception) {
        var isBlocked = sessionStorage.getItem("blockConnectionInterruptCheck") === 'true';
        if (jqXHR.status === 0 && (jqXHR.statusText === 'abort' || jqXHR.statusText === 'error')) {
            if (isBlocked) {
                sessionStorage.setItem("blockConnectionInterruptCheck", false);
            } else {
                checkAndUpdateNetworkConnectionStatus(false);
            }
        }
    }

    function checkAndUpdateNetworkConnectionStatus(isConnected) {
        if (!isConnected) {
            if (isNetworkAvailable) {
                session.handleEvent({event: commonConstants.events.chat.session.NETWORK_CONNECTION_ERROR});
            }
            isNetworkAvailable = false;
        } else {
            if (!isNetworkAvailable) {
                isNetworkAvailable = true;
                session.handleEvent({event: commonConstants.events.chat.session.NETWORK_CONNECTION_ESTABLISHED});
            }
        }
    }

    poll();
    function poll() {
        var timeout = window.setTimeout(function () {
            if (lastPollRequest && !session.sessionEnded) {
                lastPollRequest.abort();
                lastPollRequest = null;
            }
            timeout = null;
            poll();
        }, 13000);
        var endpoint = 'chats/' + session.sessionId + '/events?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
        lastPollRequest = chatApiSessionSendXhr(cp, endpoint, 'GET');
        return lastPollRequest.done(function (r) {
            checkAndUpdateNetworkConnectionStatus(true);
            chatApiSessionHandleEvents(r, session);
            if (timeout) {
                window.clearTimeout(timeout);
                if (!session.sessionEnded) {
                    poll();
                }
            }
        }).fail(function (xhr, err) {
            handleRequestError(xhr, err);
            if (xhr.responseJSON && xhr.responseJSON.error_code === "5005") {
                session.handleEvent({event: commonConstants.events.chat.session.INACTIVITY_TIMEOUT});
                window.clearTimeout(timeout);
            }
        });
    }
};
var chatApiSessionVariables = {
    logging: false,
    textFormId: undefined
};
var clientChatPageConfigurationChat = function (data, _styles) {
    var variables = clientChatPageVariables;
    var connection = clientChatPageConnection();
    var previewMode = widgetConfiguration.isPreviewMode();
    var chatUrl = widgetConfiguration.getChatPath();
    var i18n = clientChatUiI18n();

    var store = window.sessionStorage;

    var confObj = widgetConfiguration.getObject(),
        snippetConfig = widgetConfiguration.getSnippet(),
        poConfig = widgetConfiguration.getProactiveOffer(),
        customFormConfig = widgetConfiguration.getForm(),
        styles = previewMode ? JSON.parse(sessionStorage.getItem("styles")) : confObj.styles,
        comparsion = previewMode ? (confObj.widgetType === 'chat_styling') : true,
        cwConfig = previewMode ? confObj : (confObj.definition || {}).chatWidgetStyling || {},
        fullConf = widgetConfiguration.getFullConfigurationObject();

    var lmConfig, win, frameHeight;

    if (previewMode) {
        lmConfig = confObj.leaveMessage;
        poConfig = confObj;
        snippetConfig = confObj;
        customFormConfig = confObj;
        win = window;
    }

    if (snippetConfig) {
        lmConfig = snippetConfig.leaveMessage;
        win = window.parent;
    }

    if (poConfig) {
        win = window.parent;
    }

    var pcConfig = (snippetConfig && snippetConfig.preChat) ? snippetConfig.preChat : '',
        source = store.getItem('source'),
        sourceObj = (source === 'proactive' && commonUtilService.stringIsTrue(store.getItem('serviceAvailable')))
            ? poConfig.preChat
            : pcConfig;

    function getFrameHeight(configHeight, innerHeight) {
        return Math.min.apply(Math, [configHeight, innerHeight - 20]);
    }

    function isFormSecure(form) {
        return form.hasClass('secure');
    }

    function checkIframe() {
        var key = (+new Date) + "" + Math.random();

        try {
            var global = window.parent;
            global[key] = "asd";
            return global[key] === "asd";
        }
        catch (e) {
            return false;
        }
    }

    function submitCustomFormData(data) {
        var chatSession = window.chatSession;
        sendFormData(chatSession.sendSecureFormData, chatSession.sendFormData, variables, data)
    }

    function cancelCustomFormData(data) {
        var chatSession = window.chatSession;
        sendFormData(chatSession.sendSecureFormData, chatSession.sendFormData, variables, data)
    }

    function sendFormData(secureFormCallback, formCallback, variables, data) {
        var requestId = variables.currentFormRequestId;
        var formName = variables.currentFormName;
        isFormSecure($customForm) ? secureFormCallback(requestId, formName, data) : formCallback(requestId, formName, data);
    }

    function getFormByName(formName) {
        var form;
        switch (formName) {
            case 'preChatForm':
                form = $('#preChatForm');
                break;
            case 'questionForm':
                form = $('#questionForm');
                break;
            case 'unavailableForm':
                form = $('#unavailableForm');
                break;
            case 'customForm':
                form = $('#customForm');
                break;
        }
        return form;
    }

    function formOnHide(formName, customFormCallback, data) {
        htmlUtilService.displayNone($('#offline-form'));
        var form = getFormByName(formName);
        if (formName === 'customForm') {
            customFormCallback(data);
            $('.custom-form-fields').scrollTop(0);
            htmlUtilService.displayNone($customForm);
            $('#agent-name').text($('#agent-name').attr('data-original-name'));
            $('#agent-name').attr('data-original-name', '');
            $('#header-avatar-container .avatar').css({'display': ''});
            clientChatPageUpdateScrollbar();
        } else {
            connection.connect();
            htmlUtilService.displayNone(form);
        }
    }

    function formAnimateFast(form, formInner) {
        if (form && form.animate) {
            form.animate({
                scrollTop: $('.error-balloon:visible').eq(0).offset().top + formInner.scrollTop() - 154
            }, 'fast');
        }
    }

    function showErrorBalloons(context, message) {
        var errorBalloons = getErrorBalloons(context);
        if (message) {
            errorBalloons.text(message);
        }
        errorBalloons.show();
    }

    function hideErrorBalloons(context) {
        var errorBalloons = getErrorBalloons(context);
        errorBalloons.hide();
    }

    function getErrorBalloons(context) {
        return $(context).find('.error-balloon');
    }

    function setCallChatButton(buttonClass, isButtonEnabled, buttonText) {
        if (isButtonEnabled) {
            $('.sp-callback-form').append('<button id="sp-callback-submit" class="' + buttonClass + '">' + buttonText + '</button>');
        } else {
            $('.' + buttonClass + '').remove();
        }
    }

    function getFieldInput(context) {
        var $input;
        switch ($(context).attr('class')) {
            case 'field-wrapper field-radio':
                $input = $(context).find('input:checked');
                break;
            case 'field-wrapper field-multiline':
                $input = $(context).find('textarea');
                break;
            case 'field-wrapper field-select':
                $input = $(context).find('select');
                break;
            default:
                $input = $(context).find('input');
        }
        return $input;
    }

    function getCaptcha(field) {
        var captcha = '';
        $(field).find('table.captcha td').each(function () {
            captcha += $(this).text();
        });
        return captcha;
    }

    function isCaptchaValid(field) {
        return getCaptcha(field) === $(field).find('input').val();
    }

    function validateAndUpdateFields(fields, data) {
        var result = {isValid: true};
        fields.each(function () {
            var $input = getFieldInput(this);
            var key = $input.attr('name');
            var type = $input.attr('type');
            var message = i18n.requiredField;
            if (key !== 'captcha_text') {
                var val = ($input.val() || '');
                var noError = (val && val.length > 0 && $(this).find('.error-balloon').length > 0) || !$input.prop('required');
                if (this.className === 'field-wrapper field-radio') {
                    noError = ( $(this).find('input:checked').length == 0 && $(this).find('.error-balloon').length > 0) ? false : true;
                }
                if (this.className === 'field-wrapper field-select') {
                    noError = ( $(this).find('option:selected').val().length == 0 && $(this).find('.error-balloon').length > 0  && $(this).find('select[required]').length > 0) ? false : true;
                }
                var validationRequired = commonUtilService.stringIsTrue($input.attr("data-validate"));
                if ((type === 'tel' || type === 'email' || type === 'datetime') && noError && $input.val() && validationRequired) {
                    var isValid = true;
                    if (type === 'tel') {
                        isValid = commonUtilService.validatePhoneNumber($input.val());
                    }
                    if (type === 'email') {
                        isValid = commonUtilService.validateEmail($input.val());
                    }
                    if (type === 'datetime') {
                        isValid = commonUtilService.validateDate($input.val());
                    }
                    if (!isValid) {
                        message = i18n.invalidInputField;
                        noError = false;
                    }
                }
                if (noError) {
                    hideErrorBalloons(this);
                    variables.cp.parameters[key] = data[key] = val;
                    if (variables.cp[key]) {
                        variables.cp[key] = val;
                    } else if (key === 'phone') {
                        variables.cp.phone_number = val;
                    }
                } else {
                    showErrorBalloons(this, message);
                    result.isValid = false;
                }
            } else if (!isCaptchaValid(this)) {
                htmlUtilService.displayBlock($('#error-captcha'));
                result.isValid = false;
            }
        });
        return result;
    }

    function appendTip(elementSelector, tipId) {
        if (htmlUtilService.hasElementRequiredFields(elementSelector)) {
            var elementParent = $(elementSelector + ' *[required="true"]').parents(elementSelector);
            var tip = $('#' + tipId);
            if (elementParent.length > 0 && tip.length === 0) {
                elementParent.append('<div id="' + tipId + '" class="reqDescr">' + i18n.refersToRequiredFields + '</div>');
            }
        }
    }

    if (!checkIframe()) {
        win = window;
    }

    var showAgentPic;
    if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling) {
        showAgentPic = fullConf.widget.chatWidgetStyling.showAgentPic;
    }
    if (comparsion) {
        showAgentPic = cwConfig.showAgentPic;
    }

    var $query = $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions');
    switch (showAgentPic) {
        case 'none':
        default:
            $query.addClass('narrow');
            break;
        case 'always_default':
            $query.removeClass('narrow');
            break;
        case 'show':
            $query.removeClass('narrow');
            break;
    }

    var $spChatFrame = $('#sp-chat-frame');
    var $messagesDiv = $('#messages-div');
    var $headerAvatar = $('#header-avatar .avatar');
    var $minHeaderAvatar = $('#min_agent_image');
    var $customForm = $('#customForm');
    var $cancelPreChatForm = $('#cancelPreChatForm');
    if (comparsion) {
        var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
        if (!isChatMinimized) {
            if (!widgetConfiguration.isMobile()) {
                frameHeight = Math.min.apply(Math, [cwConfig.height, win.innerHeight - 20]);
                $spChatFrame.css({height: frameHeight, width: cwConfig.width})

            } else {
                $spChatFrame.css({height: '100%', width: '100%'});
            }
        }
        switch (showAgentPic) {
            case 'none':
                $messagesDiv.addClass('noAgentImage');
                $messagesDiv.removeClass('defaultAgentImage');
                $headerAvatar.hide();
                $minHeaderAvatar.hide();
                break;
            case 'always_default':
                $headerAvatar.show();
                $messagesDiv.removeClass('noAgentImage');
                $messagesDiv.removeClass('defaultAgentImage');
                if (previewMode) {
                    $('.previewAgentImage').attr('style', 'background:url(' + chatUrl + 'images/man-with-glasses.jpg) center center no-repeat/contain;');
                }
                break;
            case 'show':
                $headerAvatar.show();
                $messagesDiv.removeClass('noAgentImage');
                $messagesDiv.removeClass('defaultAgentImage');
                if (previewMode) {
                    $('.previewAgentImage').attr('style', 'background:url(' + chatUrl + 'images/man-with-glasses.jpg) center center no-repeat/contain;');
                }
                break;
        }

        var $previewCallme = $('#preview #callMe');
        if (cwConfig.videoCallEnabled === false) {
            htmlUtilService.displayNone($previewCallme);
        } else {
            htmlUtilService.displayFlex($previewCallme);
        }

        if (cwConfig.visitorVideoEnabled === false) {
            $('#call-prompt .content').html(i18n.allowMicroPrompt);
            $('#call-prompt .error.camera').remove();
        } else {
            $('#call-prompt .content').html(i18n.allowMicroVideoPrompt);
        }

        if (cwConfig.fileUploadEnabled === false) {
            $('#attachFile:not(.preview)').remove();
            $('#attachFile.preview').hide();
            $('#input-div').addClass('without_file');
        } else {
            $('#attachFile.preview').show();
            $('#input-div').removeClass('without_file');
        }

        if (cwConfig.emojiSelector === false) {
            htmlUtilService.displayNone($('.emoji-picker'));
        } else {
            htmlUtilService.displayBlock($('.emoji-picker'));
        }

        if (cwConfig.widgetMinimizationEnabled === false) {
            htmlUtilService.displayNone($('#minimizeChat'));
        } else {
            htmlUtilService.displayFlex($('#minimizeChat'));
        }

        if (cwConfig.title) {
            $('.agent-name').text(cwConfig.title);
            $('#min_agent_name').text(cwConfig.title)
        }

        $('#notification-prompt .content').text(cwConfig.notificationsPrompt || i18n.notificationsPrompt);
        $('#input-field').attr('placeholder', cwConfig.hintMessageTextBox || i18n.hintMessageTextBox);
        $('.min-tab-wrapper > .sp-round-button').attr('title', cwConfig.showChatTooltip || i18n.showChatTooltip);
        $('.min-tab-wrapper > .min-chat-tab > .min-tab-content').attr('title', cwConfig.showChatTooltip || i18n.showChatTooltip);
        $('#callMe').attr('title', cwConfig.webRtcCallTooltip || i18n.webRtcCallTooltip);
        $('#switchVideo').attr('title', cwConfig.webRtcSwitchVideoTooltip || i18n.webRtcSwitchVideoTooltip);
        $('#shareScreen').attr('title', cwConfig.shareScreenTooltip || i18n.shareScreenTooltip);
        $('#minimizeChat').attr('title', cwConfig.minimizeChatTooltip || i18n.minimizeChatTooltip);
        $('#sp-close-frame').attr('title', cwConfig.endChatTooltip || i18n.endChatTooltip);
        $('i.emoji-picker').attr('title', cwConfig.emojiTooltip || i18n.emojiTooltip);
        $('#attachFile').attr('title', cwConfig.sendFileTooltip || i18n.sendFileTooltip);
        $('#min_dismiss_button').attr('title', cwConfig.minimizedDismissMessagesTooltip || i18n.minimizedDismissMessagesTooltip);
        $('#call-prompt > .error.camera').text(cwConfig.cameraNotDetectedText || i18n.cameraNotDetectedText);
        $('#call-prompt > .error.microphone').text(cwConfig.microNotDetectedText || i18n.microNotDetectedText);

        $('#surveyForm .serviceSurvey .description').text(cwConfig.surveyFormWasIssueResolvedQuestion || i18n.surveyFormWasIssueResolvedQuestion);
        $('#surveyForm .serviceSurvey input#service-1 + label').text(cwConfig.surveyFormWasIssueResolvedPositiveAnswer || i18n.surveyFormWasIssueResolvedPositiveAnswer);
        $('#surveyForm .serviceSurvey input#service-0 + label').text(cwConfig.surveyFormWasIssueResolvedNegativeAnswer || i18n.surveyFormWasIssueResolvedNegativeAnswer);
        $('#surveyForm .helpfulSurvey .description').text(cwConfig.surveyFormContactSatisfactionQuestion || i18n.surveyFormContactSatisfactionQuestion);
        $('#surveyForm .recommendSurvey .description').text(cwConfig.surveyFormNetPromoterScoreQuestion || i18n.surveyFormNetPromoterScoreQuestion);
        $('#surveyForm .transcriptSurvey .description').text(cwConfig.surveyFormSendChatTranscriptQuestion || i18n.surveyFormSendChatTranscriptQuestion);
        $('#surveyForm .emailSurvey .description').text(cwConfig.surveyFormEmailFieldLabel || i18n.surveyFormEmailFieldLabel);
        $('#surveyForm .emailSurvey .error-balloon').text(cwConfig.surveyFormEmailValidationErrorText || i18n.surveyFormEmailValidationErrorText);

        $('.agentJoinedMessage span').text(cwConfig.agentJoinedMessage);
        $('.inactivityWarningText span').text(cwConfig.inactivityWarningMessage);
        $('.inactivityTimeoutText span').text(cwConfig.inactivityTimeoutMessage);
        $('.sessionEndedText span').text(cwConfig.sessionEndedMessage);
        $('.agentLeftText span').text(cwConfig.agentLeftMessage);
        $('.chat_widget #agent-name').text(cwConfig.title);
        $('#min_agent_name').text(cwConfig.title);
    }

    if (confObj.widgetType === 'form') {
        $('#custom_submit').val(confObj.submitButtonText);
        $('#custom_cancel').text(confObj.cancelButtonText);
    }

    if (confObj.widgetType === 'onPageForm') {

        if ($('.sp-callback-form').length === 1) {
            $('#preview .sp-callback-form').css('display', 'inline-block');
        }
        clientChatPageGenerateInputs(confObj.fields, '.sp-callback-form');
        setCallChatButton('chatButton', confObj.chatButtonEnabled, confObj.chatButtonText);
        setCallChatButton('callButton', confObj.callButtonEnabled, confObj.callButtonText);
    }

    if (sourceObj) {

        if (sourceObj.enabled) {
            var isCallButtonEnabled = sourceObj.callButtonEnabled;
            var isChatButtonEnabled = sourceObj.chatButtonEnabled;
            var submitPhone = $('#submitPhone');
            var submitChat = $('#submitChat');
            var title;
            var $preChatForm =  $('#preChatForm');
            var $preChatFormTabs =  $preChatForm.find('.tabs');
            $preChatForm.removeClass();
            $preChatForm.addClass('agent-message question__call-tab_hide question__chat-tab_hide question__call-tab_active question__chat-tab_active');
            if (!isCallButtonEnabled) {
                $preChatForm.removeClass('question__call-tab_active');
            } else {
                $preChatForm.removeClass('question__call-tab_hide');
            }
            if (!isChatButtonEnabled) {
                $preChatForm.removeClass('question__chat-tab_active');
            } else {
                $preChatForm.removeClass('question__chat-tab_hide');
            }
            if (isCallButtonEnabled && isChatButtonEnabled) {
                $preChatForm.removeClass('question__call-tab_active');
            }

            $preChatFormTabs.toggleClass('none', (!isCallButtonEnabled || !isChatButtonEnabled));

            if (commonUtilService.isServiceNotAvailable()) {
                title = lmConfig ? lmConfig.title : '';
            } else {
                title = sourceObj.title;
            }

            $('#agent-name').html(title);
            $('#min_agent_name').html(title);
            submitPhone.val(sourceObj.callButtonText);
            $('.tabPhone span').text(sourceObj.callButtonText);
            submitChat.val(sourceObj.chatButtonText);
            $('.tabChat span').text(sourceObj.chatButtonText);

            if (cwConfig.fileUploadEnabled === false) {
                $('#attachFile:not(.preview)').remove();
                $('#attachFile.preview').hide();
                $('#input-div').addClass('without_file');
            } else {
                $('#attachFile.preview').show();
                $('#input-div').removeClass('without_file');
            }

            if (cwConfig.emojiSelector === false) {
                htmlUtilService.displayNone($('.emoji-picker'));
            } else {
                htmlUtilService.displayBlock($('.emoji-picker'));
            }

            if (commonUtilService.isDefined(sourceObj.cancelButtonEnabled) && sourceObj.cancelButtonEnabled === true) {
                $cancelPreChatForm.val(sourceObj.cancelButtonText);
                $cancelPreChatForm.css({'display': 'block'});
            } else {
                $('#cancelPreChatForm:not(.preview)').remove();
                $('#cancelPreChatForm.preview').hide();
            }

            $cancelPreChatForm.on('click', function () {
                window.parent.postMessage("sp-pre-chat-form-cancel-button-clicked", "*");
                clientChatPageSafeEndSession();
            });

            $('#submit').on('click', function () {
                submit('questionForm');
            });

            submitChat.on('click', function () {
                window.parent.postMessage("sp-pre-chat-form-chat-button-clicked", "*");
                submit('preChatForm', 'chatFields');
            });

            submitPhone.on('click', function () {
                window.parent.postMessage("sp-pre-chat-form-phone-button-clicked", "*");
                submit('preChatForm', 'phoneFields');
            });

            clientChatPageGenerateInputs(sourceObj.commonFields, '.commonFields');
            clientChatPageGenerateInputs(sourceObj.chatFields, '.chatFields');
            clientChatPageGenerateInputs(sourceObj.phoneFields, '.phoneFields');
            appendTip('.questionFormInner', 'questionFormInnerReqDescr');
        }

        function submit(formName, className) {
            var globalNoError = true,
                data = {};
            var fields, form, formInner;
            var questionFormInner = $('.questionFormInner');

            // Might be problem here
            switch (formName) {
                case 'preChatForm':
                    fields = $('#preChatForm .commonFields .field-wrapper, #preChatForm .' + className + ' .field-wrapper');
                    form = questionFormInner;
                    formInner = questionFormInner;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
                case 'questionForm':
                    fields = $('#questionForm .field-wrapper');
                    form = $('.questionFormFieldsWrapper');
                    formInner = questionFormInner;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
                case 'customForm':
                    fields = $('#customForm .field-wrapper');
                    form = $('.custom-form-fields');
                    formInner = $customForm;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
                case 'unavailableForm':
                    fields = $('#unavailableForm .field-wrapper');
                    variables.leaveMessageForm = 'true';
                    variables.extChatData = {email: (lmConfig.email) ? lmConfig.email : ''};
                    fields.each(function (index) {
                        var name = $(this).find('input,label,select,textarea').attr('name');
                        var val;
                        if ($(this).find('input').not('input[type="radio"],input[type="checkbox"]').length > 0) {
                            val = $(this).find('input').val();
                        }
                        if ($(this).find('textarea').length > 0) {
                            val = $(this).find('textarea').val();
                        }
                        if ($(this).find('input[type="radio"],input[type="checkbox"]').length > 0) {
                            val = $(this).find('input:checked').val();
                        }
                        if ($(this).find('select').length > 0) {
                            val = $(this).find('option:selected').val();
                        }
                        variables.extChatData[name] = val;
                    });
                    form = $('#offline-form-fields');
                    formInner = questionFormInner;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
            }

            if (globalNoError) {
                formOnHide(formName, submitCustomFormData, data);
            } else {
                var visibleErrorBallons = $('.error-balloon:visible');
                if (visibleErrorBallons.length > 0) {
                    visibleErrorBallons.siblings('input').eq(0).focus();
                    formAnimateFast(form, formInner);
                }
            }
        }

        function cancel(formName, className) {
            formOnHide(formName, cancelCustomFormData, {});
        }

        $('#unsubmit').on('click', function () {
            submit('unavailableForm');
        });

        $('#custom_submit').on('click', function () {
            submit('customForm');
        });

        $('#custom_cancel').on('click', function () {
            cancel('customForm');
        });

    }
    var avatarImageWrapper = $('.avatar-image-wrapper');
    if ((cwConfig && cwConfig.showAgentPic !== 'none') && previewMode) {
        $('.avatar-image').attr('style', 'background:url(' + chatUrl + 'images/man-with-glasses.jpg) center center no-repeat/contain;');
        avatarImageWrapper.removeClass('collapse');
        avatarImageWrapper.removeClass('contain');
    } else {
        if (snippetConfig && snippetConfig.contactTab) {
            var src = snippetConfig.contactTab.iconUrl ? snippetConfig.contactTab.iconUrl : '';
            if (src.length > 0) {
                $('.avatar-image').attr('style', "background-image:url('" + src + "')");
                avatarImageWrapper.addClass('contain');
            } else {
                avatarImageWrapper.addClass('collapse');
            }
            if (title) {
                window.parent.postMessage(JSON.stringify({
                    type: 'bp-update-agent-data',
                    data: {
                        name: title,
                        url: (showAgentPic !== 'none') ? src : undefined
                    }
                }), '*');
            }
        }
    }

    if (lmConfig) {
        if (lmConfig.okButtonText) {
            $('#unsubmit').val(lmConfig.okButtonText);
        }

        if (commonUtilService.isDefined(lmConfig.cancelButtonEnabled) && lmConfig.cancelButtonEnabled === true) {
            $('#uncancelWrapper:not(.preview)').remove();
            $('#uncancelWrapper.preview').hide();
        } else {
            $('#uncancel').html(lmConfig.cancelButtonText);
            htmlUtilService.displayBlock($('#uncancelWrapper'));
        }

        clientChatPageGenerateInputs(lmConfig.fields, '.offlineFields');
        appendTip('.offlineFields', 'offlineFieldsReqDescr');
    }

    if (customFormConfig) {
        if (customFormConfig.title) {
            $('#agent-name').html(customFormConfig.title);
            $('#min_agent_name').html(customFormConfig.title);
        }
        frameHeight = previewMode ? getFrameHeight(cwConfig.height, window.innerHeight) : getFrameHeight(cwConfig.height, window.parent.innerHeight);
        var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
        if (!isChatMinimized) {
            $spChatFrame.css({'height' : frameHeight, 'width' : cwConfig.width});
        }
        clientChatPageGenerateInputs(customFormConfig.fields, '.customFormFields');
        $('#custom_submit').val(customFormConfig.submitButtonText);
        $('#custom_cancel').text(customFormConfig.cancelButtonText);
        $('#agent-name').attr('data-original-name', $('#agent-name').text());
        $('#agent-name').text(customFormConfig.title);
        $('#header-avatar-container .avatar').css({'display': 'none'});
        appendTip('.customFormFields', 'customFormFieldsReqDescr');
    }
    scaleProactiveOffer();

    updateChatStyles(cwConfig, styles);

    if ($.fn.perfectScrollbar) {
        setTimeout(function () {
            $('.questionFormInner').perfectScrollbar({useBothWheelAxes: false});
            $('.offlineFields').perfectScrollbar({useBothWheelAxes: false});
            $('.custom-form-fields').perfectScrollbar({useBothWheelAxes: false});
            $('.questionFormFieldsWrapper').perfectScrollbar({useBothWheelAxes: false});
        }, 100);
    }

    if (previewMode) {

        if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling) {
            var isRoundButton = fullConf.widget.chatWidgetStyling.tabStyle === 'round';
            if (isRoundButton) {
                document.querySelector('#sp-chat-widget .sp-round-button').style.display = '';
                document.querySelector('#sp-chat-widget .sp-chat-widget__content').style.display = 'none';
            } else {
                document.querySelector('#sp-chat-widget .sp-chat-widget__content').style.display = '';
                document.querySelector('#sp-chat-widget .sp-round-button').style.display = 'none';
            }
        }
    }
};
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
        chatApiSessionCreateSession(connectRequestData)
            .fail(function (e) {
                document.querySelector('#error').innerHTML(e.text + '. Retrying...');
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
var clientChatPageGenerateInputs = function (object, parentElement) {
    var formInputsOutput = '';
    var i18n = clientChatUiI18n();
    var fieldTypes = {
        LABEL: 'label',
        CALLBACK_PHONE: 'callback_phone',
        PHONE: 'phone',
        EMAIL: 'email',
        NAME: 'name',
        TEXT: 'text',
        DATE: 'date',
        MULTILINE_TEXT: 'multiline_text',
        SLIDER: 'numerical_range_slider',
        RADIO: 'radio_buttons',
        CAPTCHA: 'captcha',
        CONTACT_BUTTON: 'contact_button',
        SELECTION_LIST: 'selection_list',
    };

    function generateCaptcha(options) {
        var text = '';
        for (var i = 0; i < options.captchaLength; i++) {
            var rand = Math.floor(Math.random() * options.chars.length);
            text += options.chars.charAt(rand);
        }
        return text;
    }

    // ToDo: Add "name" input for captcha to admin tool.
    function generateFieldName(field, arrayIndex) {
        if (field.formFieldType === fieldTypes.CAPTCHA) {
            field.name = 'captcha_text';
        }
        return field.name ? field.name.replace(/\s/g, '_') : 'field_' + arrayIndex;
    }

    if (object) {
        object.forEach(function (item, i, arr) {
            var formFieldType = item.formFieldType,
                placeholder = item.name,
                name = generateFieldName(item, i),
                id = name,
                required = item.required ? "true" : "false",
                ariaRequired = !!item.required,
                validate = !!item.validate,
                requiredSuffix = item.required ? '*' : '',
                label = (typeof item.label !== 'undefined' && item.label != null) ? item.label + requiredSuffix : '',
                options = item.options,
                outputCurrent = '',
                value = (widgetConfiguration.isPreviewMode() && commonUtilService.isDefined(SERVICE_PATTERN_CHAT_CONFIG[item.name])) ? SERVICE_PATTERN_CHAT_CONFIG[item.name] : '',
                nextItem = object[i + 1];
            var errorMessageText = i18n.requiredField;
            var errorMsg = (item.required || validate) ? ' <div id="error-' + name + '" class="error-balloon">' + errorMessageText + '</div>' : '';
            switch (formFieldType) {

                case fieldTypes.LABEL: {
                    var forAttribute = '';
                    if (commonUtilService.isDefined(nextItem)) {
                        forAttribute = generateFieldName(nextItem, i + 1);
                    }
                    outputCurrent = htmlUtilService.wrapWithDiv('field-wrapper field-label', htmlUtilService.wrapWithLabel('', label, name, forAttribute));
                    break;
                }

                case fieldTypes.CALLBACK_PHONE:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-callback-phone',
                        htmlUtilService.generateInput('tel', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.PHONE:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-phone_number',
                        htmlUtilService.generateInput('tel', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.EMAIL:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-email',
                        htmlUtilService.generateInput('email', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.NAME:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-name',
                        htmlUtilService.generateInput('text', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.TEXT:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-text',
                        htmlUtilService.generateInput('text', id, value, validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.DATE:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-date',
                        htmlUtilService.generateInput('datetime', name, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.MULTILINE_TEXT:
                    var rows = ((commonUtilService.isObject(options) && Array.isArray(options) && options.length === 1) ? options[0] : '');
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-multiline',
                        htmlUtilService.generateTextArea(name, id, value, label, rows, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.SLIDER:
                    var middleValue = Math.floor(((item.maxValue - item.minValue)/2)) + item.minValue;
                    outputCurrent = '' +
                        '<div class="field-wrapper field-range">' +
                        '<input oninput="$(this).siblings(\'.currentValue\').html($(this).val());"' +
                        'class=""' +
                        'type="range" ' +
                        'id="' + id +
                        '" name="' + name +
                        '" placeholder="' + label +
                        '" min="' + item.minValue +
                        '" max="' + item.maxValue +
                        '" value="" ' +
                        (required === 'true' ? ('required="' + required + '" ') : '') +
                        ariaRequired +
                        '/>' +
                        '<div class="minValue">' + item.minValue + '</div>' +
                        '<div class="maxValue">' + item.maxValue + '</div>' +
                        '<div class="currentValue">' + middleValue + '</div>' +
                        errorMsg +
                        '</div>';
                    break;

                case fieldTypes.RADIO:
                    var radioOptions = '';
                    options.forEach(function (option, j) {
                        radioOptions += htmlUtilService.wrapWithDiv(
                            'option',
                            htmlUtilService.generateInput('radio', name + '_' + j, option, validate, name, "", required, ariaRequired, '') +
                            htmlUtilService.wrapWithLabel('', option, '', name + '_' + j)
                        );
                    });
                    outputCurrent = htmlUtilService.wrapWithDiv('field-wrapper field-radio', radioOptions + errorMsg);
                    break;

                case fieldTypes.CAPTCHA:

                    var defaults = {
                        captchaLength: 5,
                        chars: commonConstants.alphabet
                    };

                    var captchaText = generateCaptcha(defaults);

                    var table = $('<table></table>')

                    var row = $('<tr></tr>').appendTo(table);
                    for (var k = 0; k < captchaText.length; k++) {
                        $('<td>' + captchaText.charAt(k) + '</td>').css({
                            'border': '1px solid lightgrey'
                        }).appendTo(row);
                    }

                    outputCurrent = htmlUtilService.wrapWithDiv('field-wrapper field-captcha',
                        htmlUtilService.wrapWithLabel('', 'Enter the text shown below: ') +
                        htmlUtilService.wrapWithDiv('captcha_wrapper',
                            '<input type="text" required="true" name="captcha_text" id="captcha_text" class="agent-message" />' +
                            '<table class="captcha">' + table.html() + '</table>'
                        ) +
                        htmlUtilService.wrapWithDiv('error-balloon', 'Incorrect code', 'error-captcha')
                    );
                    break;

                case fieldTypes.CONTACT_BUTTON:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-contact-button',
                        htmlUtilService.generateInput('button', id, "Contact button") + errorMsg
                    );
                    break;

                case fieldTypes.SELECTION_LIST:
                    var req = (required === 'true' ? ('required="' + required + '" ') : '');
                    outputCurrent = '' +
                        '<div class="field-wrapper field-select">' +
                        '<select id="' + id + '" name="' + name + '" ' + req + ariaRequired + '">' +
                        '<option value="" disabled selected>' + label + '</option>';
                    options.forEach(function (option) {
                        outputCurrent += '<option value="' + option + '">' + option + '</option>';
                    });
                    outputCurrent += '</select>' + errorMsg + '</div>';
                    break;
            }

            formInputsOutput += outputCurrent;

        });

        $(parentElement).html(formInputsOutput);

        $('.tabChat').on('click', function () {
            $('#preChatForm').addClass('question__chat-tab_active');
            $('#preChatForm').removeClass('question__call-tab_active');
        });

        $('.tabPhone').on('click', function () {
            $('#preChatForm').addClass('question__call-tab_active');
            $('#preChatForm').removeClass('question__chat-tab_active');
        });

        $('.radioStars input').on('change', function () {
            $(this).parent().attr('data-rated', $(this).val());
        })
    }
};
var clientChatPageGetConnectRequestData = function () {
    var variables = clientChatPageVariables;
    return {
        crossDomain: true,
        clientId: 'WebChat',
        url: variables.cp.webServer,
        appId: variables.cp.appId,
        tenantUrl: variables.cp.tenantUrl,
        from: variables.cp.from,
        phone_number: variables.cp.phone_number,
        parameters: variables.cp.parameters || {}
    };
};
var clientChatPageGetUrlVars = function (url) {
    var vars = {};
    var hash;
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars[hash[0]] = decodeURIComponent(hash[1]);
    }
    return vars;
};
var clientChatPageInitDragAndDrop = function () {

    var obj = $("#chat-body");
    var timeoutID;

    function checkAndUpdateTimeout(timeoutID) {
        if (timeoutID) {
            window.clearTimeout(timeoutID);
            timeoutID = null;
        }
    }

    obj.on('dragenter dragleave dragover drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });

    obj.on('dragenter', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        if ($('#attachFile').is(':visible')) {
            obj.attr("dnd", "1");
            checkAndUpdateTimeout(timeoutID);
        }
    });

    obj.on('dragleave', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        if (timeoutID) {
            window.clearTimeout(timeoutID);
            timeoutID = null;
        } else {
            timeoutID = window.setTimeout(function () {
                obj.attr("dnd", null);
            }, 200);
        }
    });

    obj.on('dragover', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        obj.attr("dnd", "1");
        checkAndUpdateTimeout(timeoutID);
    });

    obj.on('drop', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        clientChatPageUploadFiles(e.originalEvent.dataTransfer.files);
        obj.attr("dnd", null);
        checkAndUpdateTimeout(timeoutID);
    });
};
var clientChatPageMakeId = function () {
    var text = "";
    var possible = commonConstants.alphabet;
    for (var i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
var clientChatPageOnFormSubmit = function (e) {
    var variables = clientChatPageVariables;
    e.preventDefault();
    if (variables.currentForm && typeof variables.currentForm.onSubmit === 'function') {
        variables.currentForm.onSubmit(form_name);
    }
};
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
var clientChatPageOnReady = function (e) {
    var platform = window.platform;
    var variables = clientChatPageVariables;
    var connection = clientChatPageConnection();
    var i18n = clientChatUiI18n();
    var $preChatForm = $('#preChatForm');
    var $body = $('body');
    var $attachFile = $('#attachFile');
    var $shareScreen = $('#shareScreen');
    var $minimizeChat = $('#minimizeChat');
    var $innerChat = $('#inner-chat');
    var $minInnerChat = $('#min_inner_chat');
    var $minMsgContainer = $('#min_messages');
    var $minMsgCounter = $('.min-message-counter');
    var $minDismissButton = $('#min_dismiss_button');
    var $messagesDiv = $('#messages-div');
    var $callMe = $('#callMe');
    var $callConfirmationControls = $('#call-controls_before-call');
    var $inCallControls = $('#call-controls_in-call');
    var sessionId;
    var inputObservInterval = null;
    var pastTimeMinMessagesTimer = null;

    window.parent.postMessage("ready", "*");

    function afterConfigurationReceived() {
        if (widgetConfiguration.getDefinitionStyling().tabStyle === 'round') {
            $minInnerChat.addClass('use-round-button');
        } else {
            $minInnerChat.addClass('use-default-styling');
        }
        if (sessionStorage.getItem('bp-minimized') === 'true') {
            commonUtilService.updateParentDimensions({ height: { auto: true } });
        }
    }

    $(window).on("message", function (event) {
        var data = event.originalEvent.data;

        if (!commonUtilService.isString(data)) return;

        if (data === 'showChatTab') {
            updatePreChatTabActive('chat');
        }

        if (data === 'showCallTab') {
            updatePreChatTabActive('call');
        }

        if (data === 'showDefaultTab') {
            updatePreChatTabActive('default');
        }

        if (data === 'bp-request-minimize-off') {
            onRestoreChatFromMinimization();
        }

        if (commonUtilService.isDefined(data) && commonUtilService.includes(data, 'definition')) {
            sessionStorage.setItem("confParams", data);
            afterConfigurationReceived();
            generateForms();
            setTimeout(function () {
                $('#inner-chat input:visible').first().focus();
            }, 100);
            window.parent.postMessage("formsGenerated", "*");
            persistentChat.loadChatHistory(event.originalEvent.origin);
        }
        if (commonUtilService.includes(data, '[parentPath]')) {
            sessionStorage.setItem("parentPath", data.split('[parentPath]=')[1])
        }
        if (commonUtilService.includes(data, '[parentHost]')) {
            sessionStorage.setItem("parentHost", data.split('[parentHost]=')[1])
        }
        if (commonUtilService.includes(data, '[serviceAvailable]')) {
            sessionStorage.setItem("serviceAvailable", data.split('[serviceAvailable]=')[1])
        }
        if (commonUtilService.includes(data, '[source]')) {
            sessionStorage.setItem("source", data.split('[source]=')[1])
        }
    });

    if (navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1) {
        var refreshIntervalId = setInterval(function () {
            var ds = $('#dynamicStyle');
            if (ds.length > 0) {
                var det = ds.detach();
                setTimeout(function () {
                    det.appendTo('body');
                }, 0);
                clearInterval(refreshIntervalId);
            }
        }, 400);
    }

    function updateFileAttachVisibility() {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            htmlUtilService.displayNone($attachFile);
        } else {
            htmlUtilService.displayBlock($attachFile);
        }
    }

    function updateEmojiPickerVisibility() {
        // Initializes and creates emoji set from sprite sheet
        window.emojiPicker = new EmojiPicker({
            emojiable_selector: '[data-emojiable=true]',
            assetsPath: widgetConfiguration.getChatPath() + 'js/libraries/emoji/img',
            popupButtonClasses: 'fa fa-smile-o'
        });
        // Finds all elements with 'emojiable_selector' and converts them to rich emoji input fields
        // You may want to delay this step if you have dynamically created input fields that appear later in the loading process
        // It can be called as many times as necessary; previously converted input fields will not be converted again
        window.emojiPicker.discover();
        if (!widgetConfiguration.isEmojiPickerEnabled()) {
            htmlUtilService.displayNone($('.emoji-picker'));
        }
    }

    function setUserPlatform() {
        if (commonUtilService.isDefined(platform)) {
            variables.cp.parameters.user_platform = {
                browser: platform.name + ' ' + platform.version,
                os: platform.os.toString(),
                description: platform.description
            }
        }
    }

    function generateForms() {
        var cp = variables.cp;
        var object = widgetConfiguration.getObject();
        var styles = widgetConfiguration.getStyles();
        variables.cp.parameters = {
            email: cp.email,
            last_name: cp.last_name,
            first_name: cp.first_name,
            account_number: cp.account_number,
            logging: cp.logging,
            location: {
                latitude: cp.latitude,
                longitude: cp.longitude
            }
        };
        setUserPlatform();
        for (var property1 in variables.cp) {
            if (variables.cp.hasOwnProperty(property1) && property1.indexOf("custom_") === 0) {
                variables.cp.parameters[property1.substring("custom_".length)] = variables.cp[property1];
            }
        }

        var snippetConfig = widgetConfiguration.getSnippet();
        if (snippetConfig) {
            $body.addClass(Object.keys(styles)[0]);
            $body.addClass('position_' + snippetConfig.contactTab.location);
            $body.addClass(widgetConfiguration.getOrientation());
            snippetConfig.contactTab.location.split('_').forEach(function (item, i) {
                $body.addClass(item + "_" + i);
            });
        }

        if (object) {
            clientChatPageConfigurationChat();
            scaleProactiveOffer();
        }

        for (var field in variables.cp.parameters) {
            if (variables.cp.parameters.hasOwnProperty(field)) {
                $preChatForm.find('[name="' + field + '"]').val(variables.cp.parameters[field]);
            }
        }

        if (variables.cp.start) {
            sessionId = variables.cp.start;
            connection.connect();

        } else {
            requestTabName();
            sessionId = sessionStorage.getItem("sp-chat-session");
            if (sessionId) {
                chatApiSessionCheckSessionExists(clientChatPageGetConnectRequestData(), sessionId)
                    .fail(function () {
                        preChatCheck();
                    })
                    .done(function () {
                        var session = chatApiSessionBuildSessionFromSessionId(clientChatPageGetConnectRequestData(), sessionId, '?');
                        setTimeout(function() {
                            connection.onConnected(session);
                        });
                    });
            } else {
                preChatCheck();
            }
        }

        updateEmojiPickerVisibility();
        updateFileAttachVisibility();

        if (widgetConfiguration.isMobile()) {
            $('#inner-chat').addClass("mobile-version");
        }

        $(document.getElementById('content-form')).on("submit", clientChatPageOnFormSubmit);
    }

    function preChatCheck () {
        var $offlineForm = $('#offline-form');
        var $unavailableForm = $('#unavailableForm');
        var snippetConfig = widgetConfiguration.getSnippet();
        var poConfig = widgetConfiguration.getProactiveOffer();
        var preChatSource = sessionStorage.getItem("source");
        if (snippetConfig && (preChatSource === 'widget' && snippetConfig.preChat.enabled) || (preChatSource === 'proactive' && poConfig.preChat.enabled)) {
            htmlUtilService.displayBlock($offlineForm);
            var available = sessionStorage.getItem('serviceAvailable');
            if (commonUtilService.stringIsFalse(available)) {
                htmlUtilService.displayBlock($unavailableForm);
            }
            else {
                htmlUtilService.displayBlock($preChatForm);
            }
        } else {
            connection.connect();
        }
    }

    function updateInputHeight(e) {
        var $editor = $('.emoji-wysiwyg-editor');
        var scrollHeight = $editor.prop("scrollHeight");
        if ($editor.html().length > 20 && !widgetConfiguration.isMobile()) {
            $editor.height(scrollHeight + "px");
        } else {
            $editor.height("auto");
            $messagesDiv.css("bottom", "auto");
        }
        $('#input-field').val($editor.text());
        if (e && (e.type === 'keypress' && ((e.ctrlKey || e.metaKey) && (e.keyCode === 13 || e.keyCode === 10)))) {
            var inputField = $('#input-field');
            $editor.text(inputField.val());
            $messagesDiv.css("bottom", "65px");
        } else {
            var bottom = $('.chat-body__input').height();
            $messagesDiv.css("bottom", bottom + "px");
        }
    }

    function setInputUpdater() {
        inputObservInterval = setInterval(function () {
            updateInputHeight();
        }, 500);
    }

    function clearInputUpdater() {
        clearInterval(inputObservInterval);
    }

    function setChatInputEventListeners() {
        $('#input-button').on('click', function () {
            $.chatUI.sendMessage(window.chatSession);
            updateInputHeight(event);
        });

        $body.on('keydown', '.emoji-wysiwyg-editor', function (event) {
            $.chatUI.msgKeyPress(event, window.chatSession);
        });

        $body.on('keyup', '.emoji-wysiwyg-editor', function (event) {
            $.chatUI.msgKeyPress(event, window.chatSession);
            updateInputHeight(event);
        });

        $body.on('blur', '.emoji-wysiwyg-editor', function (e) {
            clearInputUpdater();
            if (!(e && e.relatedTarget && $(e.relatedTarget).hasClass('emoji-picker-icon'))) {
                $.chatUI.notTyping(window.chatSession);
            }
        });

        $body.on('focus', '.emoji-wysiwyg-editor', function () {
            setInputUpdater();
            var $editor = $('.emoji-wysiwyg-editor');
            if ($editor.text() && ($editor.text().length === 0)) {
                $.chatUI.notTyping(window.chatSession);
            }
        });
    }

    function requestTabName() {
        window.parent.postMessage('getTabName', '*');
    }

    function updatePreChatTabActive(tabName) {
        var sourceObject;
        var preChatSource = sessionStorage.getItem("source");
        if (preChatSource === 'widget') {
            sourceObject = widgetConfiguration.getSnippet();
        }
        if (preChatSource === 'proactive') {
            sourceObject = widgetConfiguration.getProactiveOffer();
        }
        if (sourceObject) {
            var preChatConfig = sourceObject.preChat;
            var isCallEnabled = preChatConfig.callButtonEnabled;
            var isChatEnabled = preChatConfig.chatButtonEnabled;
            if (tabName === 'call' || tabName === 'chat') {
                $preChatForm.removeClass('question__chat-tab_active');
                $preChatForm.removeClass('question__call-tab_active');
            }
            if (isCallEnabled && tabName === 'call') {
                $preChatForm.addClass('question__call-tab_active');
            }
            if (isChatEnabled && tabName === 'chat') {
                $preChatForm.addClass('question__chat-tab_active');
            }
        }
        if (tabName === 'default') {
            return;
        }
    }

    function setHeaderIconHints() {
        htmlUtilService.setDivHoverById('callMe', i18n.webRtcCallTooltip);
        htmlUtilService.setDivHoverById('switchVideo', i18n.webRtcSwitchVideoTooltip);
        htmlUtilService.setDivHoverById('shareScreen', i18n.shareScreenTooltip);
        htmlUtilService.setDivHoverById('minimizeChat', i18n.minimizeChatTooltip);
        htmlUtilService.setDivHoverById('endChat', i18n.endChatTooltip);
        $('i.emoji-picker').attr('title', i18n.emojiTooltip);
        htmlUtilService.setDivHoverById('attachFile', i18n.sendFileTooltip);
        htmlUtilService.setDivHoverById('min_dismiss_button', i18n.minimizedDismissMessagesTooltip);
    }

    setChatInputEventListeners();

    setHeaderIconHints();

    $('#servicepattern_close_button').on('click', function () {
        clientChatPageSafeEndSession();
    });

    $('#uncancel').on('click', function () {
        clientChatPageSafeEndSession();
    });

    $("#submitSurvey").on("click", function () {

        var data = {};
        var noError = true;
        var radios = $('input[name="service"]:checked');
        if (radios.length > 0)
            data.service = radios.get(0).value;

        radios = $('input[name="helpful"]:checked');
        if (radios.length > 0)
            data.helpful = radios.get(0).value;

        radios = $('input[name="recommend"]:checked');
        if (radios.length > 0)
            data.recommend = radios.get(0).value;

        radios = $('input[name="transcript"]:checked');
        if (radios.length > 0)
            data.transcript = radios.get(0).value;

        data.transcriptEmail = $('#transcriptEmail').val();
        if ($('input[name="transcript"]:checked').length > 0 && !commonUtilService.validateEmail(data.transcriptEmail)) {
            noError = false;
            $('#transcriptEmail').addClass('error');
        } else {
            noError = true;
            $('#transcriptEmail').removeClass('error');
        }
        if (noError === true) {
            window.chatSession.sendFormData(variables.currentFormRequestId, variables.currentFormName, data);
        }
    });

    $('#endChat').on('click', function () {
        window.chatSession.disconnectSession();
    });

    $callMe.on('click', function () {
        if (window.chatSession.internalParty) {
            // htmlUtilService.setDivHoverById('callMe', i18n['stopCall']);
            window.chatSession.callPrompt = $('#call-prompt');
            snippetCheckDeviceSupport();
            var conf = widgetConfiguration.getParams();
            var offerVideo = conf ? widgetConfiguration.isVisitorVideoEnabled() : true;
            window.chatSession.webRTCSignaling(window.chatSession.internalParty.id).requestCall(offerVideo);
        }
    });

    $shareScreen.on('click', function () {
        if ($shareScreen.hasClass('stop-sharing')) {
            window.parent.postMessage('bp-stop-cobrowsing', '*');
        } else {
            window.parent.postMessage('bp-start-cobrowsing', '*');
        }
    });

    $callConfirmationControls.find('#call-controls_reject').on('click', function () {
        if (window.chatSession.webRTC) {
            window.chatSession.webRTC.callRejected();
        }
    });
    $callConfirmationControls.find('#call-controls_accept').on('click', function () {
        if (window.chatSession.webRTC) {
            window.chatSession.webRTC.toggleCallPrompt(true);
            window.chatSession.webRTC.callConfirmed();
        }
    });

    $inCallControls.find('#call-controls_mute-audio').on('click', function () {
        if (window.chatSession.webRTC) {
            var control = $(this);
            if (control.hasClass('off')) {
                control.removeClass('off');
                window.chatSession.webRTC.unmuteAudio();
            } else {
                control.addClass('off');
                window.chatSession.webRTC.muteAudio();
            }
        }
    });
    $inCallControls.find('#call-controls_mute-video').on('click', function () {
        if (window.chatSession.webRTC) {
            var $myCam = $('#myCam');
            var $video = $('#video');
            var control = $(this);
            if (control.hasClass('off')) {
                control.removeClass('off');
                window.chatSession.webRTC.unmuteVideo();
                htmlUtilService.displayBlock($myCam);
                htmlUtilService.displayBlock($video);
                window.chatSession.webRTC.updateChatView();
            } else {
                control.addClass('off');
                window.chatSession.webRTC.muteVideo();
                htmlUtilService.displayNone($myCam);
                htmlUtilService.displayNone($video);
                window.chatSession.webRTC.updateChatView();
            }
        }
    });
    $inCallControls.find('#call-controls_end-call').on('click', function () {
        if (window.chatSession.webRTC) {
            window.chatSession.webRTC.closeConnection();
            $inCallControls.find('#call-controls_mute-audio').removeClass('off');
            $inCallControls.find('#call-controls_mute-video').removeClass('off');
            $('#callMode').removeClass("enabled");
        }
    });

    // $('#requestAudio').on('click', function () {
    //     if (window.chatSession.internalParty) {
    //         window.chatSession.callPrompt = $('#call-prompt');
    //         window.chatSession.webRTCSignaling(window.chatSession.internalParty.id).requestCall(false);
    //     }
    // });

    // $('body').on('click', function () {
    //
    // });

    $attachFile.on('keydown', function (event) {
        if (event.keyCode === 13) {
            $attachFile.click();
        }
    });

    $attachFile.on('click', function () {
        sessionStorage.setItem("blockConnectionInterruptCheck", true);
        $('#file-upload-form').html('<input type="file" id="attach-file" name="file-upload-input"/>');
        $('#attach-file').on('change', function (event) {
            clientChatPageUploadFiles(event.target.files);
        });
        $('#attach-file').click();
    });

    function resetMinMessageCounter() {
        sessionStorage.setItem('bp-min-message-counter', 0);
        var bpLastMessageTimestampData = sessionStorage.getItem('bp-last-message-timestamp');
        if (bpLastMessageTimestampData) {
            bpLastMessageTimestampData = JSON.parse(bpLastMessageTimestampData);
            sessionStorage.setItem('bp-last-message-timestamp', JSON.stringify({
                timestamp: bpLastMessageTimestampData.timestamp,
                timestampMin: bpLastMessageTimestampData.timestamp
            }));
        }
        $minMsgCounter.text('');
        $minMsgCounter.removeClass('message-counter-small message-counter-medium message-counter-big');
    }

    function onChatMinimized() {
        window.parent.postMessage('bp-request-max-height', '*');
        var snippet = widgetConfiguration.getSnippet();
        var minLocationClass = '';
        if (snippet && snippet.contactTab) {
            var widgetLocation = snippet.contactTab.location;
            var delimeterIndex = widgetLocation.indexOf('_');
            minLocationClass = 'min-' + widgetLocation.substring(0, delimeterIndex);
            var minLocation2Class = 'min-2-' + widgetLocation.substring(delimeterIndex + 1, widgetLocation.length);
            $minInnerChat.addClass(minLocationClass + ' ' + minLocation2Class);
        }
        var chatWidgetStyling = widgetConfiguration.getDefinitionStyling();
        $innerChat.css('display', 'none');
        $minInnerChat.css('display', 'flex');
        setTimeout(function () {
            if (minLocationClass === 'min-bottom' || minLocationClass === 'min-top') {
                commonUtilService.updateParentDimensions({
                    width: { value: chatWidgetStyling.width + 'px'},
                    height: { auto: true }
                });
            } else {
                commonUtilService.updateParentDimensions({
                    width: { value: (chatWidgetStyling.width + 50) + 'px'},
                    height: { auto: true }
                });
            }
        });

        if (pastTimeMinMessagesTimer) {
            clearInterval(pastTimeMinMessagesTimer);
        }
        pastTimeMinMessagesTimer = setInterval(function () {
            $('.min-msg-block').each(function () {
                var timestamp = Number($(this).data('timestamp'));
                var passedTimeLabel = commonUtilService.getPassedTimeText(timestamp);
                $(this).find('.min-msg-time').text(passedTimeLabel);
            });
        }, 60000);
    }

    function onRestoreChatFromMinimization() {
        resetMinMessageCounter();
        $minMsgContainer.empty();
        $minInnerChat.css('display', 'none');
        $minDismissButton.css('display', 'none');
        sessionStorage.setItem('bp-minimized', false);
        var bpLastMessageTimestampData = sessionStorage.getItem('bp-last-message-timestamp');
        if (bpLastMessageTimestampData) {
            bpLastMessageTimestampData = JSON.parse(bpLastMessageTimestampData);
            sessionStorage.setItem('bp-last-message-timestamp', JSON.stringify({
                timestamp: bpLastMessageTimestampData.timestamp,
                timestampMin: null
            }));
        }
        window.parent.postMessage('bp-stop-minimized', '*');
        if (pastTimeMinMessagesTimer) {
            clearInterval(pastTimeMinMessagesTimer);
        }
        setTimeout(function () {
            $innerChat.css('display', 'block');
            clientChatPageUpdateScrollbar();
        }, 50);
    }

    $minimizeChat.on('click', function () {
        resetMinMessageCounter();
        window.parent.postMessage('bp-start-minimized', '*');
        sessionStorage.setItem('bp-minimized', true);
        onChatMinimized();
    });

    $('.min-chat-tab').on('click', function (e) {
        onRestoreChatFromMinimization();
    });
    $('#min_inner_chat .sp-round-button').on('click', function (e) {
        onRestoreChatFromMinimization();
    });
    $minMsgCounter.on('click', function (e) {
        onRestoreChatFromMinimization();
    });
    $('#min_messages').on('click', function (e) {
        onRestoreChatFromMinimization();
    });
    $minDismissButton.on('click', function (e) {
        $minDismissButton.css('display', 'none');
        resetMinMessageCounter();
        $minMsgContainer.empty();
        commonUtilService.updateParentDimensions({ height: { value: '0' } });
    });

    if (sessionStorage.getItem('bp-minimized') === 'true') {

        var currentMsgNumber = Number(sessionStorage.getItem('bp-min-message-counter'));
        if (currentMsgNumber > 0) {
            $minMsgCounter.text(currentMsgNumber);
            $minMsgCounter.removeClass('message-counter-small message-counter-medium message-counter-big');
            if (currentMsgNumber < 5) {
                $minMsgCounter.addClass('message-counter-small');
            } else if (currentMsgNumber < 10) {
                $minMsgCounter.addClass('message-counter-medium');
            } else if (currentMsgNumber >= 10) {
                $minMsgCounter.addClass('message-counter-big');
            }
            $minDismissButton.css('display', 'inline-flex');
        }
        onChatMinimized();
        }
};
var persistentChat = (function () {

    var persistentChatEnabled = false;
    var historyKey = '';
    var historyLoadedHandlers = [];

    var historyLoaded = false;
    var pendingFix = false;

    function fixCurrentSessionFileMessages(sessionId) {
        $('div[id^="' + sessionId + '-"] .msg-file-link').css('display', '');
        $('div[id^="' + sessionId + '-"] .msg-file-stub').css('display', 'none');
        setTimeout(clientChatPageUpdateScrollbar);
    }

    function fixHistorySessionsAgentPartyIcons(sessionId) {
        $('.new-msg-container:not([id^="' + sessionId + '"]) .agentImage').css({
            'background-color': '#999 !important',
            'display': 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'font-size': '1.3rem',
            'color': '#fff',
            'font-weight': '600',
            'user-select': 'none'
        }).text('A');
    }

    function fixHistoryMessagesRaw() {
        var sessionId = sessionStorage.getItem('sp-chat-session');
        fixCurrentSessionFileMessages(sessionId);
        fixHistorySessionsAgentPartyIcons(sessionId);
    }

    function fixHistoryMessages() {
        pendingFix = true;
        if (historyLoaded) {
            fixHistoryMessagesRaw();
        }
    }

    function decodeContentCache(str) {
        if (!str) {
            return null;
        }
        var decoded = decodeURI(str);
        var deobfuscated = commonUtilService.deobfuscate(decoded, 3);
        var parsed = JSON.parse(deobfuscated);
        return parsed
    }

    function encodeContentCache(data) {
        var stringifyed = JSON.stringify(data);
        var obfuscated = commonUtilService.obfuscate(stringifyed, 3);
        var encoded = encodeURI(obfuscated)
        return encoded;
    }

    var chatHistoryCacheLifetime = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    function removeOutdatedCache(data) {
        Object.keys(data).forEach(function (key) {
            data[key] = data[key].filter(function (dataItem) {
                return dataItem.date > Date.now() - chatHistoryCacheLifetime;
            });
        });
    }

    function checkCurrentDate(lastDate) {
        if (lastDate) {
            lastDate = new Date(lastDate);
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
    }

    function loadChatHistory(parentOrigin) {
        if (SERVICE_PATTERN_CHAT_CONFIG && SERVICE_PATTERN_CHAT_CONFIG.enableClientSideChatHistory) {
            persistentChatEnabled = true;
        }
        var styling = widgetConfiguration.getDefinitionStyling();
        if (styling && styling.enableClientSideChatHistory) {
            persistentChatEnabled = true;
        }
        if (!persistentChatEnabled) {
            return;
        }
        try {
            var cache = localStorage.getItem('bp-temp-cache');
            var decoded = decodeContentCache(cache) || {};
            removeOutdatedCache(decoded);
            var encoded = encodeContentCache(decoded);
            localStorage.setItem('bp-temp-cache', encoded);

            var allowedDomains = SERVICE_PATTERN_CHAT_CONFIG.sharedDomains || SERVICE_PATTERN_CHAT_CONFIG.sharedHistoryDomains;
            var parentHostname = commonUtilService.extractHostname(parentOrigin);
            historyKey = parentHostname;
            if (allowedDomains && allowedDomains.length) {
                var domainMatch = false;
                for (var i = 0; i < allowedDomains.length; ++i) {
                    var domainSuffix = (
                            (allowedDomains[i].length && (allowedDomains[i][0] === '.' || allowedDomains[i] === parentHostname)) ? '' : '.'
                        ) + allowedDomains[i];
                    if (
                        parentHostname.length >= domainSuffix.length &&
                        parentHostname.substring(parentHostname.length - domainSuffix.length) === domainSuffix
                    ) {
                        domainMatch = true;
                        break;
                    }
                }
                if (domainMatch) {
                    historyKey = JSON.stringify(allowedDomains);
                }
            }
            var hostnameData = decoded[historyKey] || [];
            hostnameData.sort(function (data1, data2) {
                return data1.date > data2.date ? 1 : -1;
            });
            var i = 0, lastDate = null;
            setTimeout(function appendChunk() {
                if (i < hostnameData.length) {
                    hostnameData[i].messages.forEach(function (msg, index) {
                        msg.history = true;
                        msg.sessionId = hostnameData[i].id;
                        if (index === 0 && (lastDate ? !commonUtilService.areDatesEqual(lastDate, hostnameData[i].date) : true)) {
                            var dateMsg = {
                                event: 'date-message',
                                history: true,
                                date: hostnameData[i].date,
                                sessionId: hostnameData[i].id
                            };
                            clientChatUiAppendLog(dateMsg);
                            lastDate = hostnameData[i].date;
                        }
                        if (index === hostnameData[i].messages.length - 1) {
                            msg.last = true;
                        }
                        clientChatUiAppendLog(msg);
                    });
                    i++;
                    setTimeout(appendChunk);
                } else {
                    checkCurrentDate(lastDate);
                    historyLoaded = true;
                    historyLoadedHandlers.forEach(function(handler) {
                        try {
                            handler();
                        } catch (e) {}
                    });
                    if (pendingFix) {
                        fixHistoryMessagesRaw();
                    }
                }
            });
        } catch (e) {
            console.error('Unable to load chat history: ', e);
        }
    }

    function addMessageToChatHistory(msg) {
        if (!persistentChatEnabled) {
            return;
        }
        try {
            var cache = localStorage.getItem('bp-temp-cache');
            var data = decodeContentCache(cache) || {};

            var hostnameData = data[historyKey];
            if (!hostnameData) {
                hostnameData = [];
                data[historyKey] = hostnameData;
            }
            var sessionId = sessionStorage.getItem('sp-chat-session');
            var sessionData = hostnameData.filter(function (dataItem) {
                return dataItem.id === sessionId;
            });

            if (sessionData.length) {
                sessionData = sessionData[0];
            } else {
                sessionData = { id: sessionId, date: Date.now(), messages: [] };
                hostnameData.push(sessionData);
            }
            sessionData.messages.push(msg);
            var encoded = encodeContentCache(data);
            localStorage.setItem('bp-temp-cache', encoded);
        } catch (e) {
            console.error('Unable to write chat history: ', e);
        }
    }

    function removeSessionMessages(sessionId) {
        if (!sessionId || !persistentChatEnabled) {
            return;
        }
        $('#messages_history_separator').prevAll().filter('[id^="' + sessionId + '-"]').remove();
    }

    function isEnabled() {
        return persistentChatEnabled;
    }

    function isHistoryLoaded() {
        return historyLoaded;
    }

    function onHistoryLoaded(handler) {
        historyLoadedHandlers.push(handler);
    }

    return {
        loadChatHistory: loadChatHistory,
        addMessageToChatHistory: addMessageToChatHistory,
        fixHistoryMessages: fixHistoryMessages,
        fixHistoryMessagesRaw: fixHistoryMessagesRaw,
        removeSessionMessages: removeSessionMessages,
        isEnabled: isEnabled,
        isHistoryLoaded: isHistoryLoaded,
        onHistoryLoaded: onHistoryLoaded,
    };
})();
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
var clientChatPageShowForm = function (fn, frId, msg) {
    var variables = clientChatPageVariables;

    var nf = variables.forms[fn]

    if (!variables.forms[fn]) {
        nf = variables.forms.custom_form;
        var form_name = fn;
    }

    if (nf) {
        var frm = document.getElementById('content-form');

        if (frm) {
            if (variables.currentForm && typeof variables.currentForm.onHide === 'function') {
                variables.currentForm.onHide(form_name, msg);
            }

            frm.innerHTML = nf.html;
            variables.currentForm = nf;

            if (frId) {
                variables.currentFormName = fn;
                variables.currentFormRequestId = frId;
            }

            if (typeof variables.currentForm.onShow === 'function') {
                variables.currentForm.onShow(form_name);
            }
        }
    }
};
var clientChatPageUpdateScrollbar = (function () {

    var pendingUpdateTimerId = -1;

    return function updateScrollbar() {
        var outer = $('#messages-div-outer');
        var inner = $('#messages-div-inner');
        var ih = inner.height();
        var oh = outer.height();

        if (ih === 0 || oh === 0) {
            if (pendingUpdateTimerId === -1) {
                pendingUpdateTimerId = setTimeout(updateScrollbar, 500);
            }
            return;
        } else if (pendingUpdateTimerId !== -1) {
            clearTimeout(pendingUpdateTimerId);
            pendingUpdateTimerId = -1;
        }

        outer.perfectScrollbar('update');

        inner.css("bottom", ih > oh ? "auto" : "0");

        inner.css("top", ih > oh ? "0" : "auto");

        if (ih > oh) {
            outer.scrollTop(ih - oh);
        }
    }
})();
var clientChatPageUploadFiles = function (files) {

    var blockExtensions = [
        '.ade', '.adp', '.apk', '.appx', '.appxbundle', '.bat',
        '.cab', '.chm', '.cmd', '.com', '.cpl', '.dll', '.dmg',
        '.ex', '.ex_', '.exe', '.hta', '.ins', '.isp', '.iso',
        '.jar', '.js', '.jse', '.lib', '.lnk',
        '.mde', '.msc', '.msi', '.msix', '.msixbundle', '.msp', '.mst',
        '.nsh', '.pif', '.ps1', '.scr', '.sct', '.shb', '.sys',
        '.vb', '.vbe', '.vbs', '.vxd', '.wsc', '.wsf', '.wsh'
    ];

    var blockMIMETypes = [
        'application/x-msdownload',
        'text/javascript',
    ]

    var i18n = clientChatUiI18n();

    function upload(cp, formData) {
        var uploadFilesEndpoint = 'files?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
        return chatApiSessionSendXhr(cp, uploadFilesEndpoint, 'POST', formData);
    }

    function uploadFile(file) {
        var formData = new FormData();
        var id = clientChatPageMakeId();
        var sessionId = sessionStorage.getItem('sp-chat-session');
        formData.append("file-upload-input", file);
        $.chatUI.appendLog({
            fromClass: "me",
            msg: "Uploading \"" + file.name + "\"",
            msgId: id,
            sessionId: sessionId
        });
        upload(window.chatSession.cp, formData)
            .fail(function (fail) {
                var errorMessage = '';
                if (fail && fail.responseJSON) {
                    errorMessage = fail.responseJSON.error_message || '';
                }
                $('#' + sessionId + '-' + id).detach();
                $.chatUI.appendLog({fromClass: "sys", msg: "Error: " + errorMessage});
            })
            .done(function (done) {
                $('#' + sessionId + '-' + id).detach();
                if (done && done.file_id) {
                    if (window.chatSession) {
                        var type = 'attachment';
                        if (file.type.match('image.*')) {
                            type = 'image';
                        } else {
                            clientChatPageUpdateScrollbar();
                        }

                        window.chatSession.fileUploaded(done.file_id, type, done.file_name);
                    }
                }
            });
    }

    for (var i = 0, item; item = files[i]; i++) {
        console.log(files[i]);
        if (
            blockExtensions.some(function (ext) { return commonUtilService.endsWith(files[i].name.toLowerCase(), ext); }) ||
            blockMIMETypes.some(function (mime) { return files[i].type.toLowerCase() === mime; })
        ) {
            $.chatUI.appendLog({
                fromClass: "sys",
                msg: files[i].name + ": " + i18n.fileUploadBlockedErrorText
            });
        } else {
            uploadFile(item);
        }
    }
    sessionStorage.setItem("blockConnectionInterruptCheck", false);
};
var clientChatPageVariables = (function () {

    function getUrlVars(url) {
        var vars = {};
        var hash;
        var hashes = url.slice(url.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars[hash[0]] = decodeURIComponent(hash[1]);
        }
        return vars;
    }

    function checkAndCloseCustomForm(msg) {
        var sessionEvents = commonConstants.events.chat.session;
        if (msg && (msg.event === sessionEvents.SECURE_FORM_CANCEL || msg.event === sessionEvents.FORM_DATA_CANCEL)) {
            htmlUtilService.displayNone($('#customForm'));
        }
    }

    var variables = {
        cp: getUrlVars(window.location.href),
        currentFormName: '',
        currentFormRequestId: '',
        currentForm: null,
        extChatData: {},
        forms: {
            MobileChatCustomerData: {
                html: '',
                onShow: function () {
                    window.parent.postMessage('sp-chat-init', '*');
                    htmlUtilService.displayBlock($('#offline-form'));
                    var definition = widgetConfiguration.getDefinition();
                    $('#agent-name').text(definition.preChat.title);
                    $('#min_agent_name').text(definition.preChat.title);
                    var url;
                    if (window.chatSession) {
                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                $.chatUI.appendLog(event);
                                commonUtilService.saveLastEventTimestamp(event);
                                clientChatPageUpdateScrollbar();
                            }
                        });
                        url = window.chatSession.getProfilePhotoUrl();
                    }
                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                    window.parent.postMessage(JSON.stringify({
                        type: 'bp-update-agent-data',
                        data: {
                            name: definition.preChat.title,
                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                        }
                    }), '*');
                },
                onHide: function () {
                    htmlUtilService.displayNone($('#offline-form'));
                    htmlUtilService.displayNone($('#questionForm'));
                },
                onSubmit: function () {}
            },

            find_agent_form: {
                html: '',
                onShow: function () {
                    window.chatSession.sessionStatus = 'queued';

                    window.parent.postMessage('sp-chat-drag', '*');

                    var definition = widgetConfiguration.getDefinition();
                    if (definition && definition.chatWidgetStyling) {
                        $('#agent-name').text(definition.chatWidgetStyling.title);
                        $('#min_agent_name').text(definition.chatWidgetStyling.title);
                    }

                    htmlUtilService.displayBlock($('#chat-body'));
                    $('#chat-body').removeClass('sp-readonly');

                    $('#messages-div-outer').perfectScrollbar({useBothWheelAxes: false});
                    $('.min-scroll').perfectScrollbar({useBothWheelAxes: false});

                    if (window.chatSession) {

                        var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                        var url = window.chatSession.getProfilePhotoUrl();
                        if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                            $('.avatar-image').attr("style", "background-image:url('" + url + "')");
                            $('#min_agent_image').attr("style", "background-image:url('" + url + "')");
                            $('.avatar-image-wrapper').removeClass('collapse');
                            $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                        }
                        window.parent.postMessage(JSON.stringify({
                            type: 'bp-update-agent-data',
                            data: {
                                name: definition.chatWidgetStyling.title,
                                url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                            }
                        }), '*');

                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                var definition = widgetConfiguration.getDefinition();
                                $.chatUI.appendLog(event);
                                clientChatPageUpdateScrollbar();
                                commonUtilService.saveLastEventTimestamp(event);
                                if (definition && definition.chatWidgetStyling) {
                                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                                    if (window.chatSession.internalParty) {
                                        $('#agent-name').text(window.chatSession.internalParty.displayName);
                                        $('.agent-name').text(window.chatSession.internalParty.displayName);
                                        $('#min_agent_name').text(window.chatSession.internalParty.displayName);
                                        $('.avatar-image-wrapper').removeClass('collapse');
                                        $('#agent-name').attr('title', $('#agent-name').text());
                                        $('#min_agent_name').attr('title', $('#agent-name').text());
                                    } else {
                                        $('#agent-name').text(definition.chatWidgetStyling.title);
                                        $('#min_agent_name').text(definition.chatWidgetStyling.title);
                                    }
                                    var agentId = window.chatSession.internalParty ? window.chatSession.internalParty.id : undefined;
                                    var url = window.chatSession.getProfilePhotoUrl(agentId);
                                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                                        $('.avatar-image').attr("style", "background-image:url('" + url + "')");
                                        $('#min_agent_image').attr("style", "background-image:url('" + url + "')");
                                        $('.avatar-image-wrapper').removeClass('contain');
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                                    }
                                    if (showAgentPic === 'none') {
                                        $('#header-avatar .avatar').hide();
                                        $('#min_agent_image').hide();
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                                    }
                                }

                                window.parent.postMessage(JSON.stringify({
                                    type: 'bp-update-agent-data',
                                    data: {
                                        name: window.chatSession.internalParty ? window.chatSession.internalParty.displayName : definition.chatWidgetStyling.title,
                                        url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                                    }
                                }), '*');
                            }
                        });
                    }
                },
                onHide: function () {
                    window.chatSession.sessionStatus = undefined;
                    htmlUtilService.displayNone($('#chat-body'));
                },
                onSubmit: function () {}
            },

            start_form: {
                html: '',
                onShow: function () {
                    window.parent.postMessage('sp-chat-drag', '*');

                    htmlUtilService.displayBlock($('#chat-body'));
                    $('#chat-body').removeClass('sp-readonly');

                    $('#messages-div-outer').perfectScrollbar({useBothWheelAxes: false});
                    $('.min-scroll').perfectScrollbar({useBothWheelAxes: false});

                    if (window.chatSession) {
                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                $.chatUI.appendLog(event);
                                clientChatPageUpdateScrollbar();
                            }
                        });
                    }
                    
                    var definition = widgetConfiguration.getDefinition();
                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                    var url = window.chatSession.getProfilePhotoUrl();
                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                        $('.avatar-image').attr('style', "background-image:url('" + url + "')");
                        $('.min_agent_image').attr('style', "background-image:url('" + url + "')");
                        $('.avatar-image-wrapper').removeClass('contain');
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                    }
                    if (showAgentPic === 'none') {
                        $('#header-avatar .avatar').hide();
                        $('.min_agent_image').hide();
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                    }
                    window.parent.postMessage(JSON.stringify({
                        type: 'bp-update-agent-data',
                        data: {
                            name: definition.chatWidgetStyling.title,
                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                        }
                    }), '*');
                },
                onHide: function (formName, msg) {
                    htmlUtilService.displayNone($('#chat-body'));
                    checkAndCloseCustomForm(msg);
                },
                onSubmit: function () {}
            },

            connect_chat_form: {
                html: '',

                onShow: function () {
                    var definition = widgetConfiguration.getDefinition();
                    window.chatSession.sessionStatus = 'connected';
                    htmlUtilService.displayBlock($('#chat-body'));
                    $('#callMe').removeClass('hang-up');

                    var connection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;

                    if (definition && definition.chatWidgetStyling.videoCallEnabled === false) {
                        $('#callMe').remove();
                    } else {
                        $('#callMe').css('display', (connection) ? 'flex' : 'none');
                    }

                    if (definition && definition.chatWidgetStyling.visitorVideoEnabled === false) {
                        $('#call-controls_mute-video, #myCam').remove();
                    }

                    if (definition && definition.chatWidgetStyling.widgetMinimizationEnabled === undefined || definition.chatWidgetStyling.widgetMinimizationEnabled === true) {
                        $('#minimizeChat').css('display', 'flex');
                    } else {
                        $('#minimizeChat').css('display', 'none');
                    }

                    if (commonUtilService.stringIsTrue(clientChatPageGetUrlVars(window.location.href)['togetherjs_enabled'])) {
                        htmlUtilService.displayFlex($('#shareScreen'));
                    }

                    htmlUtilService.displayBlock($('#endChat'));
                    $('#chat-body').removeClass('sp-readonly');

                    $('#messages-div-inner').css({'bottom': '0', 'top': 'auto'});

                    $('#messages-div-outer').perfectScrollbar({useBothWheelAxes: false});
                    $('.min-scroll').perfectScrollbar({useBothWheelAxes: false});
                    clientChatPageUpdateScrollbar();


                    window.parent.postMessage('sp-get-status-together', '*');

                    if (window.chatSession) {
                        if (definition && definition.chatWidgetStyling.webNotificationsEnabled === true) {
                            window.parent.postMessage('sp-session-start', '*'); //request web notifications
                        }

                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                var definition = widgetConfiguration.getDefinition();

                                if (event.msg === '/ban') {
                                    var store = {
                                        action: 'sp-storage',
                                        key: 'bp-bc',
                                        value: '1'
                                    };
                                    window.parent.postMessage(JSON.stringify(store), '*');
                                    window.chatSession.disconnectSession();
                                    window.chatSession.endSession();
                                    return;
                                }

                                event = $.chatUI.appendLog(event);

                                commonUtilService.saveLastEventTimestamp(event);

                                var currentSessionHistoryLoaded = !window.chatSession.historyReceived || window.chatSession.historyRendered;
                                if (!event.history && currentSessionHistoryLoaded && event.fromClass !== 'me' && event.fromClass !== 'sys') {
                                    var profilePhotoUrl = event.profilePhotoUrl;
                                    if (definition && definition.chatWidgetStyling && definition.chatWidgetStyling.showAgentPic === 'none') {
                                        profilePhotoUrl = '';
                                    }
                                    var a = {
                                        action: 'sp-notification',
                                        photo: profilePhotoUrl,
                                        msg: event.buttonsData ? event.buttonsData.message : event.originalMsg,
                                        name: event.fromName
                                    };
                                    window.parent.postMessage(JSON.stringify(a), '*');
                                }

                                if (definition && definition.chatWidgetStyling) {
                                    var titleText = window.chatSession.internalParty ? window.chatSession.internalParty.displayName : definition.chatWidgetStyling.title;
                                    $('#agent-name').text(titleText);
                                    $('#min_agent_name').text(titleText);
                                    $('#agent-name').attr('title', $('#agent-name').text());
                                    $('#min_agent_name').attr('title', $('#agent-name').text());
                                    var agentId = window.chatSession.internalParty ? window.chatSession.internalParty.id : undefined;
                                    var url = window.chatSession.getProfilePhotoUrl(agentId);
                                    var showAgentPic = definition.chatWidgetStyling.showAgentPic;
                                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                                        $('.avatar-image').attr('style', "background-image:url('" + url + "')");
                                        $('.min_agent_image').attr('style', "background-image:url('" + url + "')");
                                        $('.avatar-image-wrapper').removeClass('contain');
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                                    }
                                    if (showAgentPic === 'none') {
                                        $('#header-avatar .avatar').hide();
                                        $('.min_agent_image').hide();
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                                    }
                                    window.parent.postMessage(JSON.stringify({
                                        type: 'bp-update-agent-data',
                                        data: {
                                            name: titleText,
                                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                                        }
                                    }), '*');
                                }
                                if (currentSessionHistoryLoaded && event.event && event.event === 'chat_session_secure_form_show') {
                                    var index = -1;
                                    var i18n = clientChatUiI18n();
                                    variables.currentFormRequestId = event.form_request_id;
                                    if (definition) {
                                        for (var key in definition.forms) {
                                            if (definition.forms.hasOwnProperty(key) && definition.forms[key].id == event.form_id) {
                                                index = key;
                                            }
                                        }
                                        var customFormConfig = definition.forms[index];
                                        clientChatPageGenerateInputs(customFormConfig.fields, '.customFormFields');
                                        $('.customFormFields *[required="true"]').parents('.customFormFields').append('<div class="reqDescr">' + i18n.refersToRequiredFields + '</div>');
                                        $('#customForm').css('display', 'block');
                                        $('#customForm').addClass('secure');
                                        $('#customFormFields').scrollTop(0);
                                        $('#custom_submit').val(customFormConfig.submitButtonText);
                                        $('#custom_cancel').text(customFormConfig.cancelButtonText);
                                        $('#agent-name').attr('data-original-name', $('#agent-name').text());
                                        $('#agent-name').text(customFormConfig.title);
                                        $('#header-avatar-container .avatar').css({'display': 'none'});
                                    }
                                }
                                clientChatPageUpdateScrollbar();
                            },
                            onSessionTyping: function (a) {
                                var i18n = clientChatUiI18n();
                                $('#agent-typing').css('display', 'block');
                                var agentTypingMessage = i18n.agentTypingIndicator;
                                if (commonUtilService.includes(agentTypingMessage, '$(name)')) {
                                    agentTypingMessage = agentTypingMessage.replace('$(name)', a.displayName);
                                }
                                if (commonUtilService.includes(agentTypingMessage, '$(firstName)')) {
                                    agentTypingMessage = agentTypingMessage.replace('$(firstName)', a.firstName || a.displayName);
                                }
                                if (commonUtilService.includes(agentTypingMessage, '$(lastName)')) {
                                    agentTypingMessage = agentTypingMessage.replace('$(lastName)', a.lastName || a.displayName);
                                }
                                $('.agent-typing-wrapper').text(agentTypingMessage);
                            },
                            onSessionNotTyping: function () {
                                $('#agent-typing').css('display', 'none');
                            },
                            onAddLocalStream: function (stream) {
                                var video2 = $('#myCam');
                                try {
                                    video2.attr('src', URL.createObjectURL(stream));
                                } catch (e) {
                                    try {
                                        video2.prop('srcObject', stream);
                                    } catch (b) {
                                    }
                                }
                            },
                            onAddStream: function (stream) {
                                var $video = $('#video');
                                var $callMode = $('#callMode');

                                try {
                                    $video.attr('src', URL.createObjectURL(stream));
                                } catch (e) {
                                    try {
                                        $video.prop('srcObject', stream);
                                    } catch (b) {
                                    }
                                }

                                window.chatSession.webRTC.muteVideo();
                                // $('#callMe').addClass('hang-up');
                                $callMode.addClass('enabled');

                                var callMode = sessionStorage.getItem('callMode');
                                if (typeof callMode !== 'undefined' && callMode === 'voice') {
                                    $callMode.addClass('voice');
                                    // $('#servicepattern-chat').css('top', '35px');
                                }
                                // clientChatPageUpdateScrollbar();

                                // if (false) { // turn on to maximize video session
                                //     htmlUtilService.displayNone($('#servicepattern-chat'));
                                //     htmlUtilService.displayNone($('#input-div'));
                                //     $video.css({
                                //         position: "absolute",
                                //         width: "100%",
                                //         height: "100%",
                                //         left: "0",
                                //         right: "0",
                                //         top: "0",
                                //         bottom: "0",
                                //         padding: "0",
                                //     });
                                //     window.parent.postMessage('sp-chat-maximize-on', '*');
                                // }
                            },
                            hideChatInput: function () {
                                htmlUtilService.displayNone($('#input-div'));
                                $('#chat-body').addClass('sp-readonly');
                            },
                            showChatInput: function () {
                                htmlUtilService.displayBlock($('#input-div'));
                                $('#chat-body').removeClass('sp-readonly');
                            },
                        });
                    }
                },
                onHide: function (formName, msg) {
                    checkAndCloseCustomForm(msg);
                    window.chatSession.sessionStatus = undefined;
                    $('#endChat').css('display', 'none');
                    $('#chat-body').css('display', 'none');
                    $('#video').css('display', 'none');
                    $('#servicepattern-chat').css('top', '0');
                    $('#callMe').css('display', 'none');
                    $('#shareScreen').css('display', 'none');
                    $('#minimizeChat').css('display', 'none');

                    var definition = widgetConfiguration.getDefinition();
                    var showAgentPic = definition && definition.chatWidgetStyling.showAgentPic
                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                        var url = window.chatSession.getProfilePhotoUrl();
                        $('.avatar-image').attr('style', 'background-image:url("' + url + '")');
                        $('.min_agent_image').attr('style', 'background-image:url("' + url + '")');
                        $('.avatar-image-wrapper').addClass('contain');
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                    } else if (showAgentPic === 'none') {
                        $('#header-avatar .avatar').hide();
                        $('#min_agent_image').hide();
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                    }
                    clientChatPageUpdateScrollbar();
                },
                onSubmit: function () {
                    this.submitForm();
                },
                submitForm: function () {
                    window.chatSession.sendFormData(variables.currentFormRequestId, variables.currentFormName, {});
                }
            },

            chat_unavailable_form: {
                html: '',
                onShow: function () {
                    variables.currentFormName = 'chat_unavailable_form';
                    window.chatSession.sessionStatus = undefined;
                    htmlUtilService.displayBlock($('#offline-form'));
                    htmlUtilService.displayBlock($('#unavailableForm'));
                },
                onHide: function (formName, msg) {

                },
                onSubmit: function () {}
            },

            custom_form: {
                html: '',
                onShow: function (form_name) {
                    var definition = widgetConfiguration.getDefinition();
                    var index = -1;
                    var i18n = clientChatUiI18n();
                    if (definition) {
                        for (var key in definition.forms) {
                            if (definition.forms.hasOwnProperty(key) && definition.forms[key].name == form_name) {
                                index = key;
                            }
                        }
                        if (index !== -1) {
                            var customFormConfig = definition.forms[index];
                            if (customFormConfig && customFormConfig.title) {
                                $('#agent-name').html(customFormConfig.title);
                                $('#min_agent_name').html(customFormConfig.title);
                            }
                            clientChatPageGenerateInputs(customFormConfig.fields, '.customFormFields');
                            $('.customFormFields *[required="true"]').parents('.customFormFields').append('<div class="reqDescr">' + i18n.refersToRequiredFields + '</div>');
                            htmlUtilService.displayBlock($('#offline-form'));
                            htmlUtilService.displayBlock($('#customForm'));
                            $('#custom_submit').val(customFormConfig.submitButtonText);
                            $('#custom_cancel').text(customFormConfig.cancelButtonText);
                            $('#agent-name').attr('data-original-name', $('#agent-name').text());
                            $('#agent-name').text(customFormConfig.title);
                            $('#header-avatar-container .avatar').css({'display': 'none'});

                            var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                            var url = window.chatSession.getProfilePhotoUrl();
                            window.parent.postMessage(JSON.stringify({
                                type: 'bp-update-agent-data',
                                data: {
                                    name: customFormConfig.title,
                                    url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                                }
                            }), '*');
                        } else {
                            window.chatSession.sendFormData(variables.currentFormRequestId, form_name, 'Form not found');
                        }
                    }
                },
                onHide: function (formName, msg) {
                    checkAndCloseCustomForm(msg);
                },
                onSubmit: function (form_name) {
                    $('#agent-name').text($('#agent-name').attr('data-original-name'));
                    $('#agent-name').attr('data-original-name', '');
                    $('#header-avatar-container .avatar').css({'display': ''});
                }
            },

            survey_form: {
                html: '',
                onShow: function () {
                    var i18n = clientChatUiI18n();
                    window.parent.postMessage('sp-chat-init', '*');
                    htmlUtilService.displayBlock($('#offline-form'));
                    htmlUtilService.displayBlock($('#surveyForm'));
                    $('#agent-name').text(i18n.surveyFormTitle);
                    $('#min_agent_name').text(i18n.surveyFormTitle);
                    $('#agent-name').attr('title', $('#agent-name').text());
                    $('#min_agent_name').attr('title', $('#agent-name').text());
                    $('#transcriptEmail').val(variables.extChatData.email);

                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                    var url = window.chatSession.getProfilePhotoUrl();
                    window.parent.postMessage(JSON.stringify({
                        type: 'bp-update-agent-data',
                        data: {
                            name: i18n.surveyFormTitle,
                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                        }
                    }), '*');
                },
                onHide: function (formName, msg) {
                    htmlUtilService.displayNone($('#offline-form'));
                    htmlUtilService.displayNone($('#surveyForm'));
                },
                onSubmit: function () {},
                submitForm: function () {}
            },

            MobileChatSurvey: {
                html: '',
                onShow: function () {
                    var i18n = clientChatUiI18n();
                    window.parent.postMessage('sp-chat-init', '*');
                    htmlUtilService.displayBlock($('#offline-form'));
                    htmlUtilService.displayBlock($('#surveyForm'));
                    $('#agent-name').text(i18n.surveyFormTitle);
                    $('#min_agent_name').text(i18n.surveyFormTitle);
                    $('#agent-name').attr('title', $('#agent-name').text());
                    $('#min_agent_name').attr('title', $('#agent-name').text());
                    $('#transcriptEmail').val(variables.extChatData.email);
                },
                onHide: function (formName, msg) {
                    htmlUtilService.displayNone($('#offline-form'));
                    htmlUtilService.displayNone($('#surveyForm'));
                },
                onSubmit: function () {},
                submitForm: function () {}
            }

        }
    };

    return variables;
})();
var clientChatUiAppendLog = (function() {

    function isHtml(str) {
        var a = document.createElement('div');
        a.innerHTML = str;
        for (var c = a.childNodes, i = c.length; i--; ) {
            if (c[i].nodeType == 1) return true;
        }
        return false;
    }

    var buttonsCmdTypes = ['buttons-column', 'buttons', 'choice'];
    var buttonsCmdRegexp = new RegExp('^(?:.*?)\\/(?:' + buttonsCmdTypes.join('|') +')((?:\\s*)\\[[^\\[\\]]+?\\])+$', 'mi');

    function removeHtmlTags(str) {
        var div = document.createElement('div');
        div.innerHTML = str;
        return div.innerText;
    }

    function tryParseButtons(str) {
        try {
            var unescapedHtml = htmlUtilService.unescapeHtml(str);
            var sanitizedHtml = DOMPurify.sanitize(unescapedHtml, {USE_PROFILES: {html: true}});
            var textContent = removeHtmlTags(sanitizedHtml.trim()).trim();
            if (!buttonsCmdRegexp.test(textContent)) {
                return null;
            }
            var buttonsCmdType = null, cmdIndex = -1;
            for (var i = 0; i < buttonsCmdTypes.length; ++i) {
                cmdIndex = textContent.indexOf('/' + buttonsCmdTypes[i]);
                if (cmdIndex !== -1) {
                    buttonsCmdType = buttonsCmdTypes[i];
                    break;
                }
            }

            var textMessage = textContent.slice(0, cmdIndex).trim();
            textContent = textContent.slice(cmdIndex);
            var buttons = [], i = textContent.indexOf('[');
            do {
                textContent = textContent.slice(i + 1);
                var endI = textContent.indexOf(']');
                buttons.push(textContent.slice(0, endI));
                textContent = textContent.slice(endI + 1);
                i = textContent.indexOf('[');
            } while (i !== -1);

            return {
                message: textMessage,
                buttons: buttons,
                type: buttonsCmdType,
            };
        } catch (e) {
            console.error('Error in the message parsing (buttons): ', e);
        }
        return null;
    }

    return function (event) {
        var i18n = clientChatUiI18n();
        var e = clientChatUiPrepareEvent(event);
        var date = e.timestamp ? new Date(parseInt(commonUtilService.fixTimestamp(e.timestamp))) : new Date();
        var time = date.format('HH:MM');

        var minimized = sessionStorage.getItem('bp-minimized');
        var eventStatus = commonUtilService.getIncomingEventStatus(e);
        if (e.msg && minimized === 'true' && eventStatus === 'new') {
            var msgCounterDiv = $('.min-message-counter');
            var currentMsgNumber = Number(sessionStorage.getItem('bp-min-message-counter'));
            currentMsgNumber++;
            sessionStorage.setItem('bp-min-message-counter', currentMsgNumber);
            msgCounterDiv.removeClass('message-counter-small message-counter-medium message-counter-big');
            if (currentMsgNumber < 5) {
                msgCounterDiv.addClass('message-counter-small');
            } else if (currentMsgNumber < 10) {
                msgCounterDiv.addClass('message-counter-medium');
            } else if (currentMsgNumber >= 10) {
                msgCounterDiv.addClass('message-counter-big');
            }
            if (currentMsgNumber > 0) {
                $('#min_dismiss_button').css('display', 'inline-flex');
            }
            msgCounterDiv.text(currentMsgNumber);
            $('.min-scroll').perfectScrollbar('update');
        }

        if (e.msg) {
            var fromClass = e.fromClass;
            var messageType;
            var ariaLabel;
            var textColor;
            var backgroundColor;
            var icon = '';
            var fromName = '';
            var collapsedIconClass = '';
            var msg = e.msg;
            var logoUrl = sessionStorage.getItem('logoUrl') == 'none' ? '' : sessionStorage.getItem('logoUrl');
            var logoUrldefault = sessionStorage.getItem('logoUrldefault');

            var logo = (logoUrl && logoUrl != 'none' && (fromClass === 'agent' || fromClass === 'sys')) ? logoUrl : e.profilePhotoUrl;

            if (logoUrl == 'none') {
                $('#messages-div').addClass('noAgentImage');
            }

            if (e.profilePhotoUrl == 'none') {
                collapsedIconClass = ' collapsed';
            }

            if (e.options && e.options.alternateMsg) {
                if (e.options.alternateMsg.fromClass) {
                    fromClass = e.options.alternateMsg.fromClass;
                }
                if (e.options.alternateMsg.msg) {
                    msg = e.options.alternateMsg.msg;
                }
            }

            // fix, because 'alternateMsg' don't coming from the server after page reloading
            // this is for TogetherJS messages
            if (commonUtilService.includes(msg, i18n.clickToStartCobrowsingPrompt)) {
                fromClass = 'sys';
                msg = i18n.screenSharingRequestedMessageText;
            } else if (msg === i18n.screenSharingEndedMessageText) {
                fromClass = 'sys';
            }
            var lastMsg = event.last ? 'msg-last-in-session' : '';
            var messageId = event.msgId ? event.msgId : event.msg_id ? event.msg_id : '';
            var messageFullId = event.sessionId + '-' + messageId;
            var originalMessageId = event.original_msg_id;

            if (fromClass === 'me') {
                messageType = 'clientMessage';
                ariaLabel = 'client message';
                backgroundColor = 'main-background-color';
                textColor = 'second-color';
            } else if (fromClass === 'sys') {
                messageType = 'systemMessage';
                ariaLabel = 'system message';
                backgroundColor = 'system-message';
                textColor = 'main-color';
                fromName = 'system message';
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg>';

                if (commonUtilService.includes(msg, '$(name)')) {
                    msg = msg.replace('$(name)', htmlUtilService.escapeHtml(e.fromName));
                }
                if (commonUtilService.includes(msg, '$(firstName)')) {
                    msg = msg.replace('$(firstName)', htmlUtilService.escapeHtml(e.firstName || e.fromName));
                }
                if (commonUtilService.includes(msg, '$(lastName)')) {
                    msg = msg.replace('$(lastName)', htmlUtilService.escapeHtml(e.lastName || e.fromName));
                }
            } else {
                messageType = 'agentMessage';
                ariaLabel = 'agent message';
                fromName = e.fromName;
                if (fromClass === 'session_msg') {
                    ariaLabel = 'session message';
                    fromName = 'session message';
                }
                backgroundColor = 'agent-message';
                textColor = 'base-font';
            }
            var noBg = !!(logo == 'none' || commonUtilService.isUndefined(logo));
            var background;
            if (fromClass === 'sys' || commonUtilService.isUndefined(fromClass) || commonUtilService.stringIsTrue(logoUrldefault)) {
                background = noBg ? '' : ' style="background:url(' + logo + ') center center no-repeat;background-size:contain!important;border-radius:0"';
            } else {
                background = noBg ? '' : ' style="background:url(' + logo + ') center center no-repeat;background-size:cover!important;"';
            }

            var parsedMsg = '', additionalClass = '';
            e.buttonsData = tryParseButtons(msg);
            if (e.buttonsData) {
                additionalClass = 'btns ' + e.buttonsData.type;
                var clickedButtons = sessionStorage.getItem('bp-clicked-buttons-msg-id');
                clickedButtons = clickedButtons ? JSON.parse(clickedButtons) : [];
                var colorClass = e.buttonsData.type === 'choice' ? ' second-color' : '';
                if (e.buttonsData.message) {
                    if (isHtml(e.buttonsData.message)) {
                        parsedMsg += (
                            '<span class="visible-message' + colorClass + '">' +
                                e.buttonsData.message +
                            '</span>'
                        );
                    } else {
                        parsedMsg += (
                            '<span class="visible-message' + colorClass + '" tabindex="2" aria-live="polite" aria-label="' + htmlUtilService.escapeHtml(e.buttonsData.message) + '">' +
                                e.buttonsData.message +
                            '</span>'
                        );
                    }
                }
                if (clickedButtons.indexOf(messageFullId) === -1) {
                    parsedMsg += (
                        '<ul class="msg-buttons-container">' +
                            e.buttonsData.buttons.reduce(function (str, buttonText) {
                                return str + (
                                    '<li class="msg-button" tabindex="2">' +
                                        '<button class="main-background-color second-color base-font" role="option" aria-label="' + htmlUtilService.escapeHtml(buttonText) + '">' +
                                            buttonText +
                                        '</button>' +
                                    '</li>'
                                );
                            }, '') +
                        '</ul>'
                    );
                }
                if (parsedMsg === '') {
                    return e;
                }
            } else if (isHtml(msg)) {
                parsedMsg = '<span class="visible-message">' + msg + '</span>';
            } else {
                parsedMsg = '<span class="visible-message" aria-live="polite" aria-label="' + htmlUtilService.escapeHtml(msg) + '">' + msg + '</span>';
            }
            backgroundColor = backgroundColor += (
                commonUtilService.includes(additionalClass, 'choice') ? ' main-background-color-important' : ''
            );

            //  MST attachments
            if (undefined != e.attachments) {
                try {
                    var tmp = new DOMParser().parseFromString(parsedMsg, "text/html");

                    while (true) {
                        var nodes = tmp.getElementsByTagName("attachment");

                        if (nodes == undefined || nodes.length == 0)
                            break;

                        var node = nodes.item(0);
                        var id = node.getAttribute("id");

                        var att = undefined;
                        if (Array.isArray(e.attachments)) {
                            var i=0;
                            for (i=0; i<e.attachments.length; i++) {
                                if (e.attachments[i].id == id) {
                                    att = e.attachments[i];
                                    break;
                                }
                            }
                        }

                        if (att != undefined) {
                            var contentType = att.contentType;

                            if (contentType == "application/vnd.microsoft.card.adaptive") {
                                var card = JSON.parse(att.content);

                                var adaptiveCard = new window.AdaptiveCards.AdaptiveCard();
                                adaptiveCard.onExecuteAction = function (action) {
                                    this.open(action.url);
                                }
                                adaptiveCard.parse(card);
                                var renderedCard = adaptiveCard.render();
                                if (renderedCard != undefined && node.parentNode != undefined)
                                    node.parentNode.replaceChild(renderedCard, node);
                            } else if (contentType == "application/vnd.microsoft.card.hero") {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "Unsupported Hero Card";
                                node.parentNode.replaceChild(newNode, node);
                            } else if (contentType == "application/vnd.microsoft.teams.card.list") {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "Unsupported List Card";
                                node.parentNode.replaceChild(newNode, node);
                            } else if (contentType == "application/vnd.microsoft.teams.card.o365connector") {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "Unsupported Office 365 Connector Card";
                                node.parentNode.replaceChild(newNode, node);
                            } else if (contentType == "application/vnd.microsoft.card.thumbnail") {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "Unsupported Thumbnail Card";
                                node.parentNode.replaceChild(newNode, node);
                            } else if (contentType == "application/vnd.microsoft.card.codesnippet") {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "Unsupported Code Snippet Card";
                                node.parentNode.replaceChild(newNode, node);
                            } else if (contentType.lastIndexOf("application/vnd.microsoft", 0) === 0) {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "Card: " + contentType;
                                node.parentNode.replaceChild(newNode, node);
                            } else {
                                newNode = tmp.createElement("div");
                                newNode.innerHTML = "File: " + att.name;
                                node.parentNode.replaceChild(newNode, node);
                            }
                        } else
                            node.parentNode.removeChild(node);
                    }

                    parsedMsg = tmp.documentElement.outerHTML;
                } catch (exc) {
                }
            }

            var origMsgIdAttribute = (originalMessageId ? 'data-original-id="' + originalMessageId + '" ' : '');

            if (minimized === 'true' && eventStatus !== 'old') {

                var passedTimeLabel = commonUtilService.getPassedTimeText(Number(e.timestamp));
                var popupMsgTmpl = '' +
                    '<div id="min-' + messageFullId + '" ' + origMsgIdAttribute + 'class="min-msg-block slide-in-fwd-center ' + additionalClass + '" data-timestamp="' + e.timestamp + '">' +
                        ((ariaLabel !== 'agent message')
                            ? ''
                            : '<div class="min-msg-sender" tabindex="2" aria-live="polite" aria-label="' + i18n.replyFromMessageText + ' ' + htmlUtilService.escapeHtml(fromName) + '">' +
                                    '<span class="main-color">' + i18n.replyFromMessageText + '</span>' +
                                    '<span class="min-msg-agent-name">' + (fromName || ' ').split(' ')[0] + '</span>' +
                            '</div>'
                        ) +
                        '<div class="hidden-message" aria-live="polite" aria-label="' + ariaLabel + '">' + ariaLabel + '</div>' +
                        '<div class="min-msg-text" tabindex="2">' + parsedMsg + '</div>' +
                        '<div class="min-msg-time">' + passedTimeLabel + '</div>' +
                    '</div>';

                $('#min_messages').append(popupMsgTmpl);
                commonUtilService.updateParentDimensions({ height: { auto: true } });
            }

            var tmpl = '';
            if (e.event === 'date-message') {
                tmpl = (
                    '<div tabindex="2" class="new-msg-container date-message ' + lastMsg + '" data-timestamp="' + date.getTime() + '">' +
                        parsedMsg +
                    '</div>'
                );
            } else {
                var containerClasses = 'new-msg-container new-msg-animate ' + messageType + collapsedIconClass + ' ' + additionalClass + ' ' + lastMsg;
                tmpl = (
                    '<div id="' + messageFullId + '" ' + origMsgIdAttribute + 'class="' + containerClasses + '" data-timestamp="' + date.getTime() + '">' +
                        '<div class="pip ' + backgroundColor + '"></div>' +
                        '<div class="new-msg-body ' + messageType + ' ' + backgroundColor + '">' +
                            '<div class="new-msg-body-inner">' +
                                '<div class="new-msg-text" style="height: auto; text-align: left">' +
                                    (
                                        (ariaLabel === 'agent message')
                                            ?
                                                '<div class="agent-image-wrapper">' +
                                                    '<div class="agent-image-background-filler main-background-color"></div>' +
                                                    '<div tabindex="2" aria-live="polite" aria-label="' + htmlUtilService.escapeHtml(fromName) + '" class="agentImage"' + background + '></div>' +
                                                '</div>'
                                            : ''
                                    ) +
                                    '<div tabindex="2" style="position: relative" class="new-msg-text-inner ' + textColor + '">' +
                                        icon +
                                        '<div class="hidden-message" aria-live="polite" aria-label="' + ariaLabel + '">' + ariaLabel + '</div>' +
                                        parsedMsg +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="new-time">' + (fromClass !== 'sys' ? time : '') + '</div>' +
                    '</div>'
                );
            }

            function getInsertionPoint() {
                if (e.history) {
                    return $('#messages_history_separator');
                }
                if (e.anchorElement) {
                    return e.anchorElement;
                }
                if (e.sessionHistory) {
                    return $('#messages_session_history_separator');
                }
                return $('#messages-div-inner-clear');
            }

            $(tmpl).insertBefore(getInsertionPoint());

            if (messageId) {
                var buttonAction = function (clickEvent) {
                    window.chatSession.send(clickEvent.target.textContent.trim(), {directiveId: e.directive_id});
                    $('#' + messageFullId + ' .msg-buttons-container').remove();
                    $('#' + messageFullId + ' .new-msg-body, #' + messageFullId + ' .pip').removeClass('main-background-color-important');
                    $('#' + messageFullId + ' .visible-message').removeClass('second-color');
                    if ($('#' + messageFullId + ' .visible-message').text().trim() === '') {
                        $('#' + messageFullId).remove();
                    }
                    var clickedButtons = sessionStorage.getItem('bp-clicked-buttons-msg-id');
                    clickedButtons = clickedButtons ? JSON.parse(clickedButtons) : [];
                    clickedButtons.push(messageFullId);
                    sessionStorage.setItem('bp-clicked-buttons-msg-id', JSON.stringify(clickedButtons));
                    setTimeout(clientChatPageUpdateScrollbar);
                }
                $('#' + messageFullId + ' .msg-button, #min-' + messageFullId + ' .msg-button').click(buttonAction);
                $('#' + messageFullId + ' .msg-button, #min-' + messageFullId + ' .msg-button').on('keypress', function (keyEvent) {
                    if (keyEvent.which === 13 || keyEvent.which === 32) {
                        buttonAction(keyEvent);
                    }
                });
            }
        }

        return e;
    }
})();
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
var editMessage = function (data, session) {
    var messageFullId = data.sessionId + '-' + data.refMsgId;
    var msgElement = $('#' + messageFullId);
    var timestamp;
    var anchorElement;
    if (msgElement.length) {
        timestamp = msgElement.data('timestamp');
        anchorElement = msgElement.next();
        msgElement.remove();
    }
    $('#min-' + messageFullId).remove();
    // special case for directive attachment messages
    var dirMsgElements = $('[data-original-id="' + data.refMsgId + '"]');
    if (dirMsgElements.length) {
        timestamp = dirMsgElements.data('timestamp');
        anchorElement = dirMsgElements.last().next();
        dirMsgElements.remove();
    }

    var pseudoMessageEvent = {
        channel: 'web',
        event: 'chat_session_message',
        msg: data.msg,
        msg_id: data.refMsgId,
        msg_text: data.msg,
        party_id: data.partyId,
        timestamp: timestamp,
        anchorElement: anchorElement,
    };
    session.handleEvent(pseudoMessageEvent);
};

var deleteMessage = function (data) {
    var messageFullId = data.sessionId + '-' + data.refMsgId;
    $('#' + messageFullId).remove();
    // special case for directive attachment messages
    $('[data-original-id="' + data.refMsgId + '"]').remove();
    var minMessage = $('#min-' + messageFullId);
    if (minMessage.length) {
        minMessage.remove();
        commonUtilService.updateParentDimensions({height: {auto: true}});

        var msgCounterDiv = $('.min-message-counter');
        var currentMsgNumber = Number(sessionStorage.getItem('bp-min-message-counter'));
        currentMsgNumber--;
        sessionStorage.setItem('bp-min-message-counter', currentMsgNumber);
        msgCounterDiv.removeClass('message-counter-small message-counter-medium message-counter-big');
        if (currentMsgNumber < 5) {
            msgCounterDiv.addClass('message-counter-small');
        } else if (currentMsgNumber < 10) {
            msgCounterDiv.addClass('message-counter-medium');
        } else if (currentMsgNumber >= 10) {
            msgCounterDiv.addClass('message-counter-big');
        }
        if (currentMsgNumber < 1) {
            $('#min_dismiss_button').css('display', 'none');
            msgCounterDiv.text('');
            msgCounterDiv.removeClass('message-counter-small message-counter-medium message-counter-big');
        }
        msgCounterDiv.text(currentMsgNumber);
        $('.min-scroll').perfectScrollbar('update');
    }
};
var clientChatUiEscapeHtml = function (string, escapeHtml) {
    var div = document.createElement('div');
    if (escapeHtml) {
        div.innerText = string;
    } else {
        div.innerHTML = string;
    }

    // put links here, so we can avoid wrapping nested links a couple of times
    var links = [];

    // URLs starting with protocol
    var pattern1 = {
        pattern: /(?:^|(?!\s))((?:https?|ftp):\/\/\S+)/gim,
        template: '<a href="$1" target="_blank">$1</a>',
        isUrl: true
    };

    // URLs starting with www.
    var pattern2 = {
        pattern: /(?:^|(?!\s))(www\.\S+)/gim,
        template: '<a href="http://$1" target="_blank">$1</a>',
        isUrl: true,
        withoutProtocol: true
    };

    // emails
    var pattern3 = {
        pattern: /(?:^|(?!\s))([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gim,
        template: '<a href="mailto:$1">$1</a>'
    };

    var patterns = [pattern1, pattern2, pattern3];

    traverse(div);

    return div.innerHTML;

    function makeId() {
        return '$$$link$$$' + Math.random().toString(36).slice(2) + '$$$';
    }

    function chunkNewLines(text) {
        var chunks = [];
        for (var i = 0; i < text.length; ++i) {
            var iType = text[i] === '\n' ? 'new-line' : 'text';
            if (chunks.length && chunks[chunks.length - 1].type === iType) {
                chunks[chunks.length - 1].value += text[i];
            } else {
                chunks.push({
                    type: iType,
                    value: text[i]
                });
            }
        }
        return chunks;
    }

    function traverse(node) {
        switch (node.nodeType) {
            case Node.TEXT_NODE: {
                var chunks = chunkNewLines(node.textContent);
                for (var k = 0; k < chunks.length; ++k) {
                    if (chunks[k].type === 'new-line') {
                        var textNode = document.createTextNode(chunks[k].value);
                        node.parentNode.insertBefore(textNode, node);
                    } else if (chunks[k].type === 'text') {
                        var result = replace(chunks[k].value);
                        for (var i = 0; i < result.length; i++) {
                            node.parentNode.insertBefore(result[i], node);
                        }
                    }
                }
                node.parentNode.removeChild(node);
                break;
            }
            case Node.ELEMENT_NODE: {
                if (node.nodeName !== "A") {
                    for (var i = 0; i < node.childNodes.length; i++) {
                        traverse(node.childNodes[i]);
                    }
                }
                break;
            }
        }
    }

    function replace(text) {
        //as we got text and we want to append anchors to it, we need convert it to HTML
        var tempDiv = document.createElement('div');
        tempDiv.innerText = text;
        var escaped = tempDiv.innerHTML;
        // replace every link with id
        patterns.forEach(function (pattern) {
            escaped = escaped.replace(pattern.pattern, function (match, $1)  {
                if (pattern.isUrl && !validateUrl($1, pattern.withoutProtocol)) {
                    return $1;
                }
                var id = makeId();
                links.push({
                    template: pattern.template,
                    id: id,
                    // null is for matching indices with $ names
                    match: $1
                });
                return id;
            });
        });

        // replace link id with transformed link
        links.forEach(function (link) {
            var html = link.template
                .replace('$1', link.match)
                .replace('$1', link.match);
            escaped = escaped.replace(link.id, html);
        });
        tempDiv.innerHTML = escaped;
        var result = [];
        for (var i = 0; i < tempDiv.childNodes.length; i++) {
            result.push(tempDiv.childNodes[i]);
        }
        return result;
    }

    function validateUrl(url, withoutProtocol) {
        var tempAnchor = document.createElement('a');
        if (withoutProtocol) {
            tempAnchor.href = 'http://' + url;
        } else {
            tempAnchor.href = url;
        }
        return !!tempAnchor.host;
    }
};
var clientChatUiI18n = function () {

    var definition = widgetConfiguration.getDefinition();
    var chatWidgetStyling = definition ? definition.chatWidgetStyling : null;
    var defaultWidgetStyling = {
        inactivityTimeoutMessage: "Your session has expired due to inactivity.",
        inactivityWarningMessage: "We have not heard from you for some time. Please respond within the next few minutes to keep your chat session connected.",
        sessionEndedMessage: "Chat session has ended",
        internetConnectionError: "Internet connection error",
        internetConnectionEstablished: "Internet connection established",
        agentJoinedMessage: "has joined the chat",
        agentLeftMessage: "has left the chat",
        imageWasSent: "has sent you an image",
        fileWasSent: "has sent you an attachment",
        refersToRequiredFields: "* Refers to Required Fields",
        requiredField: "Please fill",
        invalidInputField: 'Invalid input',
        file: 'File',
        isNotAvailable: 'is not available',
        notificationsPrompt: 'When prompted, please allow notifications from this window, so you could see responses when this window is hidden.',
        allowMicroPrompt: 'When prompted, please allow access to your microphone.',
        allowMicroVideoPrompt: 'When prompted, please allow access to your camera and microphone.',
        cobrowsingDialogText: 'By clicking Accept, an agent will join you on the page you are currently viewing. The agent can view and help you as you browse the web in this tab. The agent will not see login details, passwords, other browser tabs or programs you have opened. You can stop co-browsing at any time, by clicking X in the menu or by closing this tab in your browser.',
        cobrowsingDialogHeader: 'Start co-browsing',
        cobrowsingDialogAcceptLabel: 'Accept',
        cobrowsingDialogCancelLabel: 'Cancel',
        sessionCompletedWidgetTitle: 'Session completed',
        agentTypingIndicator: '$(name) is typing',
        replyFromMessageText: 'Reply from',
        justNowMessageArrivalTimeIndicator: 'just now',
        minutesAgoMessageArrivalTimeIndicator: 'm ago',
        hoursAgoMessageArrivalTimeIndicator: 'h ago',
        daysAgoMessageArrivalTimeIndicator: 'd ago',
        someTimeAgoMessageArrivalTimeIndicator: 'Some time ago',
        hintMessageTextBox: 'Text...',
        showChatTooltip: 'Show chat',
        endChatTooltip: 'End chat',
        minimizeChatTooltip: 'Minimize chat',
        shareScreenTooltip: 'Share screen',
        webRtcCallTooltip: 'Call me',
        webRtcSwitchVideoTooltip: 'Switch video',
        webRtcEndCallTooltip: 'End call',
        emojiTooltip: 'Emoji',
        sendFileTooltip: 'Send file',
        minimizedDismissMessagesTooltip: 'Dismiss',
        screenSharingRequestedMessageText: 'Screen sharing request sent',
        screenSharingEndedMessageText: 'Screen sharing session ended',
        clickToStartCobrowsingPrompt: 'Click to start co-browsing session',
        cobrowsingRequestedMessageText: 'Co-browsing session requested',
        cobrowsingRejectedMessageText: 'Co-browsing session rejected',
        cobrowsingStartedMessageText: 'Co-browsing session started',
        cobrowsingEndedMessageText: 'Co-browsing session ended',
        cameraNotDetectedText: 'Web camera not detected',
        microNotDetectedText: 'Microphone not detected',
        surveyFormTitle: 'Please leave us feedback',
        surveyFormWasIssueResolvedQuestion: 'Did we provide the service you were looking for?',
        surveyFormWasIssueResolvedPositiveAnswer: 'yes',
        surveyFormWasIssueResolvedNegativeAnswer: 'no',
        surveyFormContactSatisfactionQuestion: 'How helpful was our representative?',
        surveyFormNetPromoterScoreQuestion: 'How likely are you to recommend our products and services in the future?',
        surveyFormSendChatTranscriptQuestion: 'Send me transcript of the chat by email?',
        surveyFormEmailFieldLabel: 'Your email*',
        surveyFormEmailValidationErrorText: 'Wrong value',
        fileUploadBlockedErrorText: 'File was blocked because its content presents a potential security issue',
    };

    function getTranslation(propName) {
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling[propName])) {
            return chatWidgetStyling[propName];
        }
        return defaultWidgetStyling[propName];
    }

    return {
        inactivityTimeoutMessage: getTranslation('inactivityTimeoutMessage'),
        inactivityWarningMessage: getTranslation('inactivityWarningMessage'),
        sessionEndedMessage: getTranslation('sessionEndedMessage'),
        internetConnectionError: getTranslation('internetConnectionError'),
        internetConnectionEstablished: getTranslation('internetConnectionEstablished'),
        agentJoinedMessage: getTranslation('agentJoinedMessage'),
        agentLeftMessage: getTranslation('agentLeftMessage'),
        refersToRequiredFields: getTranslation('refersToRequiredFields'),
        requiredField: getTranslation('requiredField'),
        imageWasSent: getTranslation('imageWasSent'),
        fileWasSent: getTranslation('fileWasSent'),
        invalidInputField: getTranslation('invalidInputField'),
        file: getTranslation('file'),
        isNotAvailable: getTranslation('isNotAvailable'),
        notificationsPrompt: getTranslation('notificationsPrompt'),
        allowMicroPrompt: getTranslation('allowMicroPrompt'),
        allowMicroVideoPrompt: getTranslation('allowMicroVideoPrompt'),
        cobrowsingDialogText: getTranslation('cobrowsingDialogText'),
        cobrowsingDialogHeader: getTranslation('cobrowsingDialogHeader'),
        cobrowsingDialogAcceptLabel: getTranslation('cobrowsingDialogAcceptLabel'),
        cobrowsingDialogCancelLabel: getTranslation('cobrowsingDialogCancelLabel'),
        sessionCompletedWidgetTitle: getTranslation('sessionCompletedWidgetTitle'),
        agentTypingIndicator: getTranslation('agentTypingIndicator'),
        replyFromMessageText: getTranslation('replyFromMessageText'),
        justNowMessageArrivalTimeIndicator: getTranslation('justNowMessageArrivalTimeIndicator'),
        minutesAgoMessageArrivalTimeIndicator: getTranslation('minutesAgoMessageArrivalTimeIndicator'),
        hoursAgoMessageArrivalTimeIndicator: getTranslation('hoursAgoMessageArrivalTimeIndicator'),
        daysAgoMessageArrivalTimeIndicator: getTranslation('daysAgoMessageArrivalTimeIndicator'),
        someTimeAgoMessageArrivalTimeIndicator: getTranslation('someTimeAgoMessageArrivalTimeIndicator'),
        hintMessageTextBox: getTranslation('hintMessageTextBox'),
        showChatTooltip: getTranslation('showChatTooltip'),
        endChatTooltip: getTranslation('endChatTooltip'),
        minimizeChatTooltip: getTranslation('minimizeChatTooltip'),
        shareScreenTooltip: getTranslation('shareScreenTooltip'),
        webRtcCallTooltip: getTranslation('webRtcCallTooltip'),
        webRtcSwitchVideoTooltip: getTranslation('webRtcSwitchVideoTooltip'),
        webRtcEndCallTooltip: getTranslation('webRtcEndCallTooltip'),
        emojiTooltip: getTranslation('emojiTooltip'),
        sendFileTooltip: getTranslation('sendFileTooltip'),
        minimizedDismissMessagesTooltip: getTranslation('minimizedDismissMessagesTooltip'),
        screenSharingRequestedMessageText: getTranslation('screenSharingRequestedMessageText'),
        screenSharingEndedMessageText: getTranslation('screenSharingEndedMessageText'),
        clickToStartCobrowsingPrompt: getTranslation('clickToStartCobrowsingPrompt'),
        cobrowsingRequestedMessageText: getTranslation('cobrowsingRequestedMessageText'),
        cobrowsingRejectedMessageText: getTranslation('cobrowsingRejectedMessageText'),
        cobrowsingStartedMessageText: getTranslation('cobrowsingStartedMessageText'),
        cobrowsingEndedMessageText: getTranslation('cobrowsingEndedMessageText'),
        cameraNotDetectedText: getTranslation('cameraNotDetectedText'),
        microNotDetectedText: getTranslation('microNotDetectedText'),
        surveyFormTitle: getTranslation('surveyFormTitle'),
        surveyFormWasIssueResolvedQuestion: getTranslation('surveyFormWasIssueResolvedQuestion'),
        surveyFormWasIssueResolvedPositiveAnswer: getTranslation('surveyFormWasIssueResolvedPositiveAnswer'),
        surveyFormWasIssueResolvedNegativeAnswer: getTranslation('surveyFormWasIssueResolvedNegativeAnswer'),
        surveyFormContactSatisfactionQuestion: getTranslation('surveyFormContactSatisfactionQuestion'),
        surveyFormNetPromoterScoreQuestion: getTranslation('surveyFormNetPromoterScoreQuestion'),
        surveyFormSendChatTranscriptQuestion: getTranslation('surveyFormSendChatTranscriptQuestion'),
        surveyFormEmailFieldLabel: getTranslation('surveyFormEmailFieldLabel'),
        surveyFormEmailValidationErrorText: getTranslation('surveyFormEmailValidationErrorText'),
        fileUploadBlockedErrorText: getTranslation('fileUploadBlockedErrorText')
    }
};
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
var clientChatUiPrepareEvent = function (event) {
    var i18n = clientChatUiI18n();

    function updateEventData(event, msg, originalMsg, fromClass) {
        event.msg = msg;
        event.originalMsg = originalMsg;
        if (!commonUtilService.isUndefined(fromClass)) {
            event.fromClass = fromClass
        }
    }

    switch (event.event) {
        case commonConstants.events.chat.session.PARTY_JOINED:
            updateEventData(event, i18n.agentJoinedMessage, event.msg);
            break;
        case commonConstants.events.chat.session.PARTY_LEFT:
            updateEventData(event, i18n.agentLeftMessage, event.msg);
            break;
        case commonConstants.events.chat.session.NETWORK_CONNECTION_ERROR:
            updateEventData(event, i18n.internetConnectionError, event.msg);
            break;
        case commonConstants.events.chat.session.NETWORK_CONNECTION_ESTABLISHED:
            updateEventData(event, i18n.internetConnectionEstablished, event.msg);
            break;
        case commonConstants.events.chat.session.ENDED:
            updateEventData(event, i18n.sessionEndedMessage, event.msg);
            break;
        case commonConstants.events.chat.session.TIMEOUT_WARNING:
            updateEventData(event, i18n.inactivityWarningMessage, event.msg);
            break;
        case commonConstants.events.chat.session.INACTIVITY_TIMEOUT:
            updateEventData(event, i18n.inactivityTimeoutMessage, event.msg);
            break;
        case commonConstants.events.chat.session.COBROWSING_REQUESTED:
            updateEventData(event, i18n.cobrowsingRequestedMessageText, event.msg);
            break;
        case commonConstants.events.chat.session.COBROWSING_REJECTED:
            updateEventData(event, i18n.cobrowsingRejectedMessageText, event.msg);
            break;
        case commonConstants.events.chat.session.COBROWSING_STARTED:
            updateEventData(event, i18n.cobrowsingStartedMessageText, event.msg);
            break;
        case commonConstants.events.chat.session.COBROWSING_ENDED:
            updateEventData(event, i18n.cobrowsingEndedMessageText, event.msg);
            break;
        case commonConstants.events.chat.session.DIRECTIVE_FILE_URL:
        case commonConstants.events.chat.session.FILE_URL:
        case commonConstants.events.chat.session.FILE: {
            var historyStyle = event.history ? 'style="display: none;"' : '';
            var content = '';
            var originalMsg, msg;
            if (event.file_type === 'image') {
                originalMsg = event.fromName + ' ' + i18n.imageWasSent;
                content = '<img class="thumb" style="vertical-align: top;" src="' + event.fileUrl + '" />';
            } else {
                originalMsg = event.fromName + ' ' + i18n.fileWasSent + ' "' + event.file_name + '"';
                content = "Download \"" + event.file_name + "\"";
            }
            msg = '<a download target="_blank" href="' + event.fileUrl + '" ' + historyStyle + ' class="msg-file-link">' + content + '</a>';
            if (event.history) {
                msg += (
                    '<span class="msg-file-stub">' +
                        i18n.file + ' "' + event.file_name + '" ' + i18n.isNotAvailable +
                    '</span>'
                );
            }
            updateEventData(event, msg, originalMsg);
            break;
        }
        case 'date-message': {
            var msg = dateFormat(parseInt(event.date), dateFormat.masks.mediumDate);
            updateEventData(event, msg, msg);
            break;
        }
        default : {
            var msg = event.msg ? clientChatUiEscapeHtml(event.msg, false) : undefined;
            updateEventData(event, msg, event.msg);
            break;
        }
    }
    return event;
};
var clientChatUiSendLocation = function (session) {
    navigator.geolocation.getCurrentPosition(function (position) {
            session.sendLocation(position.coords.latitude, position.coords.longitude);
        },
        function (failure) {
            alert(failure.message);
        });
};
var clientChatUiSendMessage = function(session) {
    var messageValue = $('.emoji-wysiwyg-editor').html();
    if (messageValue) {
        session.send(messageValue);
        $('#input-field').val('');
        $('.emoji-wysiwyg-editor').html('');
        clientChatUiNotTyping(session);
    }
};
var clientChatUiSendNavigation = function (session, href, title) {
    session.sendNavigation(href, title);
};
var clientChatUiVariables = {
    typingTimer: null,
    msgTypingInterval: null,
    notTypingTimeout: 30,
    msgTypingTimeout: 3,
    entityMap: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }
};
var callbackUtilService = (function () {

    var errorStyle = 'position: relative;\n' +
        'top: -39px;\n' +
        'background: #fbf0d1;\n' +
        'color: #434343;\n' +
        'padding: 4px;\n' +
        'float: right;\n' +
        'border: 1px solid #f7ecc5;\n' +
        'border-radius: 4px;\n';

    function removeElementByClassName(className) {
        var elements = document.getElementsByClassName(className);
        while(elements.length > 0){
            elements[0].parentNode.removeChild(elements[0]);
        }
    }

    function insertError(field, text) {
        var i18n = clientChatUiI18n();
        var fieldError = document.createElement('div');
        var message = text || i18n.requiredField;
        fieldError.setAttribute('id', 'error-' + field.id);
        fieldError.setAttribute('style', errorStyle);
        fieldError.classList.add('error-message');
        fieldError.innerText = message;
        field.parentNode.insertBefore(fieldError, field.nextSibling);
    }

    function loopFormFields(formId, callback) {
        var form = document.getElementById(formId);
        if (typeof form !== "undefined") {
            var fields = form.getElementsByTagName('input');
            if (typeof fields !== "undefined" && fields.length) {
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    callback(field);
                }
            }
        }
    }

    function getSnippetFormValues(formId) {
        var platform = window.platform;
        var resultConfig = {
            parameters: {
                user_platform: {
                    browser: platform.name + ' ' + platform.version,
                    os: platform.os.toString(),
                    description: platform.description
                }
            }
        };
        var spConf = SERVICE_PATTERN_CHAT_CONFIG;
        loopFormFields(formId, function (field) {
            var fieldId = field.id;
            var fieldValue = field.value;
            if (field.type === 'radio') {
                fieldId = field.name;
                if (!field.checked) {
                    return
                }
            }
            if (typeof fieldId !== "undefined" && typeof fieldValue !== "undefined") {
                fieldId = fieldId.split('sp-callback-').reverse().join('');
                if (!fieldValue && spConf[fieldId]) {
                    fieldValue = spConf[fieldId]
                }
                if (fieldId === 'phone_number' || fieldId === 'phone') {
                    resultConfig[fieldId] = fieldValue;
                }
                resultConfig.parameters[fieldId] = fieldValue;
            }
        });
        var spConfFields = ['email', 'last_name', 'first_name', 'account_number', 'logging', 'location', 'phone_number'];
        for (var i = 0; i < spConfFields.length; i++) {
            var key = spConfFields[i];
            if ((key === 'phone_number' || key === 'phone') && !resultConfig[key] && spConf[key]) {
                resultConfig[key] = spConf[key];
            }
            if (!resultConfig.parameters[key] && spConf[key]) {
                resultConfig.parameters[key] = spConf[key];
            }
        }
        if (spConf.parameters) {
            for (var key in spConf.parameters) {
                if (spConf.parameters.hasOwnProperty(key) && spConf.parameters[key] && !resultConfig.parameters[key]) {
                    resultConfig.parameters[key] = spConf.parameters[key];
                }
            }
        }
        return resultConfig;
    }

    function isCallbackFormValid(formId) {
        var isFormValid = true;
        var radioGroupValidated = [];
        removeElementByClassName('error-message');
        loopFormFields(formId, function (field) {
            var isFieldValid = true;
            var type = field.type;
            if (field && field.attributes && field.attributes.hasOwnProperty('required') && !field.value) {
                isFieldValid = false;
                insertError(field);
            }
            if (type === 'radio' && radioGroupValidated.indexOf(field.name) === -1) {
                var radioGroup = document.getElementsByName(field.name);
                var isRadioChecked = false;
                radioGroupValidated.push(field.name);
                for (var i = 0; i < radioGroup.length; i++) {
                    if (radioGroup[i].checked) {
                        isRadioChecked = true;
                    }
                }
                if (!isRadioChecked) {
                    insertError(radioGroup[radioGroup.length - 1]);
                }
                isFieldValid = isRadioChecked;
            }
            if (!isFieldValid) {
                isFormValid = false;
            }
        });
        return isFormValid;
    }

    return {
        isCallbackFormValid: isCallbackFormValid,
        getSnippetFormValues: getSnippetFormValues,
    }

})();
var commonUtilService = (function () {

    function isUndefined(item) {
        return typeof item === 'undefined'
    }

    function isDefined(item) {
        return typeof item !== 'undefined'
    }

    function isObject(item) {
        return typeof item === 'object'
    }

    function isString(item) {
        return typeof item === 'string'
    }

    function isNumber(item) {
        return typeof item !== 'number'
    }

    function stringIsTrue(str) {
        var result = false;
        try {
            var parsed = JSON.parse(str);
            result = parsed === true
        } catch (err) {}
        return result
    }

    function stringIsFalse(str) {
        var result = false;
        try {
            var parsed = JSON.parse(str);
            result = parsed === false
        } catch (err) {}
        return result
    }

    function includes(str1, str2) {
        return isString(str1) && isString(str1) && (str1.indexOf(str2) !== -1);
    }

    function forEach(array, callback) {
        if (Array.isArray(array)) {
            for (var i = 0; i < array.length; i++) {
                callback(array[i], i)
            }
        }
    }

    function merge(object1, object2) {
        var newObj = {};
        for (var key in object1) {
            newObj[key] = object1[key];
        }
        for (var key in object2) {
            newObj[key] = object2[key];
        }
        return newObj;
    }

    function startsWith(str, prefix) {
        if (typeof str !== 'string') {
            return false;
        }
        return str.substring(0, prefix.length) === prefix;
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function isServiceAvailable() {
        return sessionStorage.getItem('serviceAvailable') == 'true';
    }

    function isServiceNotAvailable() {
        return sessionStorage.getItem('serviceAvailable') == 'false';
    }

    function isEWTExceedThreshold(threshold) {
        var ewt = sessionStorage.getItem('ewt') || 0;
        console.log('EWT: ' + ewt);
        return ewt > threshold;
    }

    function isJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    function transformYear(year) {
        var currentYear = new Date().getFullYear();
        if (year.length === 2) {
            if (parseInt('20' + year) > currentYear) {
                year = '19' + year;
            } else {
                year = '20' + year;
            }
        }
        return year;
    }

    function hasAnsii(str) {
        var re = /[^\x00-\x7F]/g;
        return re.test(str)
    }

    function isLeapYear(year) {
        return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
    }

    // mm/dd/yyyy format
    function validateDate(dateString) {
        // First check for the pattern
        var pattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
        var matched = !!dateString.match(pattern);
        if (!matched) {
            return false;
        }

        // Parse the date parts to integers
        var parts = dateString.split("/");
        var day = parseInt(parts[1], 10);
        var month = parseInt(parts[0], 10);
        var year = parseInt(transformYear(parts[2]), 10);

        // Check the ranges of month and year
        if (year < 1000 || year > 3000 || month == 0 || month > 12) {
            return false;
        }

        var monthLength = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // Check the range of the day
        return day > 0 && day <= monthLength[month - 1];
    }

    function validatePhoneNumber(phone) {
        var maxLength = 30;
        var re = /^[0-9+().\/\\\-\s]*$/gm;
        if (phone.length <= maxLength) {
            var phoneArr = phone.split('');
            if (phoneArr.indexOf('+') !== -1) {
                if (phone.split('+').length - 1 > 1 || phoneArr.indexOf('+') !== 0) {
                    return false;
                }
            }
            return re.test(phone);
        }
        return false;
    }

    function validateEmail(email) {
        var maxLength = 255;
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return email.length <= maxLength && re.test(email) && !hasAnsii(email);
    }


    function isIE() {
        ua = navigator.userAgent;
        /* MSIE used to detect old browsers and Trident used to newer ones*/
        var is_ie = ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;
        return is_ie; 
    }

    function isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    /**
     * Return 'new' or 'old' or 'not-viewed'
     * @param {*} event 
     */
    function getIncomingEventStatus(event) {
        var eventId = event.msg_id ? Number(event.msg_id) : NaN;
        var latestSentMsgId = Number(localStorage.getItem('bp-sent-message-id'));
        if (!isNaN(eventId) && eventId < latestSentMsgId) {
            return 'old';
        }
        var bpLastMessageTimestampData = sessionStorage.getItem('bp-last-message-timestamp');
        if (!bpLastMessageTimestampData) {
            return 'new';
        }
        bpLastMessageTimestampData = JSON.parse(bpLastMessageTimestampData);
        if (isDefined(event.timestamp)) {
            if (!bpLastMessageTimestampData.timestamp) {
                return 'new';
            }
            try {
                var newTimestampNumber = Number(event.timestamp);
                var lastTimestampMinNumber = Number(bpLastMessageTimestampData.timestampMin);
                var lastTimestampNumber = Number(bpLastMessageTimestampData.timestamp);
                if (bpLastMessageTimestampData.timestampMin) {
                    if (newTimestampNumber > lastTimestampNumber) {
                        return 'new';
                    } else if (newTimestampNumber > lastTimestampMinNumber) {
                        return 'not-viewed';
                    } else {
                        return 'old';
                    }
                }
                return (newTimestampNumber > lastTimestampNumber ? 'new' : 'old');
            } catch (e) {}
        }
        return 'old';
    }

    function saveLastEventTimestamp(event) {
        if (getIncomingEventStatus(event) === 'new' && event.fromName !== 'me') {
            var bpLastMessageTimestampData = sessionStorage.getItem('bp-last-message-timestamp');
            if (bpLastMessageTimestampData) {
                bpLastMessageTimestampData = JSON.parse(bpLastMessageTimestampData);
            }
            var timestampMin = null;
            if (bpLastMessageTimestampData && sessionStorage.getItem('bp-minimized') === 'true') {
                if (bpLastMessageTimestampData.timestampMin) {
                    timestampMin = bpLastMessageTimestampData.timestampMin;
                } else {
                    timestampMin = bpLastMessageTimestampData.timestamp;
                }
            }
            var timestamp = event.timestamp ? event.timestamp : bpLastMessageTimestampData ? bpLastMessageTimestampData.timestamp : null;
            sessionStorage.setItem('bp-last-message-timestamp', JSON.stringify({
                timestamp: timestamp,
                timestampMin: timestampMin
            }));
        }
    }

    function getPassedTimeText(timestampInSeconds) {
        timestampInSeconds = parseInt(timestampInSeconds);
        var i18n = clientChatUiI18n();
        var secondsNow = Math.floor(Date.now() / 1000);
        var ret;
        var label = '';
        try {
            var minutes = Math.floor((secondsNow - timestampInSeconds) / 60);
            if (minutes <= 1) {
                return i18n.justNowMessageArrivalTimeIndicator;
            } else if (minutes < 60) {
                ret = minutes;
                label = i18n.minutesAgoMessageArrivalTimeIndicator;
            } else {
                var hours = Math.floor(minutes / 60);
                if (hours < 24) {
                    ret = hours;
                    label = i18n.hoursAgoMessageArrivalTimeIndicator;
                } else {
                    var days = Math.floor(hours / 24);
                    ret = days;
                    label = i18n.daysAgoMessageArrivalTimeIndicator;
                }
            }
        } catch (e) {}
        if (!ret || isNaN(ret)) {
            return i18n.someTimeAgoMessageArrivalTimeIndicator;
        }
        return ret + label;
    }

    var defaultData = {
        height: {
            value: undefined,
            auto: true
        },
        width: {
            value: undefined,
            auto: true
        }
    };
    function updateParentDimensions(data) {
        if (!data) {
            data = defaultData;
        }
        var iter = 0;
        (function updateCall() {
            if (iter > 20) {
                return;
            }
            iter++;
            var minInnerChat = document.getElementById('min_inner_chat');
            if (!minInnerChat) {
                return;
            }
            var cmpStyle = getComputedStyle(minInnerChat);
            var boundingRect = minInnerChat.getBoundingClientRect();
            if (cmpStyle.display === 'none' || cmpStyle.height === 'auto') {
                return setTimeout(updateCall, 50);
            }
            var currentMsgNumber = Number(sessionStorage.getItem('bp-min-message-counter'));
            parent.postMessage(JSON.stringify({
                type: 'bp-dimensions',
                data: {
                    height: ((data.height && data.height.value) ? data.height.value : (data.height && data.height.auto) ? currentMsgNumber > 0 ? boundingRect.height + 'px' : '0' : undefined),
                    width: ((data.width && data.width.value) ? data.width.value : (data.width && data.width.auto) ? (cmpStyle.width !== 'auto' ? boundingRect.width + 'px' : undefined) : undefined)
                }
            }), '*');
        })();
    }

    /**
     * Obfuscate a plaintext string with a simple rotation algorithm similar to the rot13 cipher.
     * @param  {String} str incoming string
     * @param  {Number} key rotation index between 0 and n
     * @param  {Number} n   maximum char that will be affected by the algorithm
     * @return {String}     obfuscated string
    */
    function obfuscate(str, key, n) {
        if (n === undefined) {
            n = 126;
        }
        if (!(typeof key === 'number' && key % 1 === 0) || !(typeof key === 'number' && key % 1 === 0)) {
            return str;
        }
        var chars = str.split('');
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i].charCodeAt(0);
            if (c <= n) {
                chars[i] = String.fromCharCode((chars[i].charCodeAt(0) + key) % n);
            }
        }
        return chars.join('');
    }

    function deobfuscate(str, key, n) {
        if (n === undefined) {
            n = 126;
        }
        // return String itself if the given parameters are invalid
        if (!(typeof key === 'number' && key % 1 === 0) || !(typeof key === 'number' && key % 1 === 0)) {
            return str;
        }
        return obfuscate(str, n - key);
    }

    function extractHostname(url) {
        var hostname;
        if (url.indexOf('//') > -1) {
            hostname = url.split('/')[2];
        }
        else {
            hostname = url.split('/')[0];
        }
        hostname = hostname.split(':')[0];
        hostname = hostname.split('?')[0];
        return hostname;
    }

    function areDatesEqual(date1, date2) {
        try {
            date1 = new Date(parseInt(date1));
            date2 = new Date(parseInt(date2));
            var result = (
                date1.getFullYear() === date2.getFullYear() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getDate() === date2.getDate()
            );
            return result;
        } catch (e) {
            console.error('Unable to parse date: ', date1, ' or ', date2);
        }
        return false;
    }

    function fixTimestamp(timestamp) {
        if (typeof timestamp === 'string') {
            return timestamp.length === 10 ? timestamp + '000' : timestamp;
        } else if (typeof timestamp === 'number') {
            return timestamp < 9999999999 ? timestamp * 1000 : timestamp;
        }
        return timestamp;
    }

    return {
        includes: includes,
        isUndefined: isUndefined,
        isDefined: isDefined,
        isObject: isObject,
        isString: isString,
        isNumber: isNumber,
        isJsonString: isJsonString,
        forEach: forEach,
        merge: merge,
        startsWith: startsWith,
        endsWith: endsWith,
        stringIsTrue: stringIsTrue,
        stringIsFalse: stringIsFalse,
        isServiceAvailable: isServiceAvailable,
        isServiceNotAvailable: isServiceNotAvailable,
        isEWTExceedThreshold: isEWTExceedThreshold,
        validateDate: validateDate,
        validateEmail: validateEmail,
        validatePhoneNumber: validatePhoneNumber,
        isIE: isIE,
        isSafari: isSafari,
        getIncomingEventStatus: getIncomingEventStatus,
        saveLastEventTimestamp: saveLastEventTimestamp,
        getPassedTimeText: getPassedTimeText,
        updateParentDimensions: updateParentDimensions,
        obfuscate: obfuscate,
        deobfuscate: deobfuscate,
        extractHostname: extractHostname,
        areDatesEqual: areDatesEqual,
        fixTimestamp: fixTimestamp
    };
})();
var commonConstants = {
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    events: {
        chat: {
            session: {
                NETWORK_CONNECTION_ERROR: 'network_connection_error',
                NETWORK_CONNECTION_ESTABLISHED: 'network_connection_established',
                SECURE_FORM_CANCEL: 'chat_session_secure_form_cancel',
                SECURE_FORM_SHOW: 'chat_session_secure_form_show',
                SECURE_FORM_DATA: 'chat_session_secure_form_data',
                FORM_DATA: 'chat_session_form_data',
                FORM_DATA_CANCEL: 'chat_form_data_cancel',
                INFO: 'chat_session_info',
                TYPING: 'chat_session_typing',
                NOT_TYPING: 'chat_session_not_typing',
                FORM_SHOW: 'chat_session_form_show',
                STATUS: 'chat_session_status',
                ENDED: 'chat_session_ended',
                PARTY_JOINED: 'chat_session_party_joined',
                PARTY_LEFT: 'chat_session_party_left',
                MESSAGE: 'chat_session_message',
                FILE: 'chat_session_file',
                TIMEOUT_WARNING: 'chat_session_timeout_warning',
                INACTIVITY_TIMEOUT: 'chat_session_inactivity_timeout',
                LOCATION: 'chat_session_location',
                NAVIGATION: 'chat_session_navigation',
                END: 'chat_session_end',
                DISCONNECT: 'chat_session_disconnect',
                SIGNALING: 'chat_session_signaling',
                COBROWSING_REQUESTED: 'chat_session_cobrowsing_requested',
                COBROWSING_REJECTED: 'chat_session_cobrowsing_rejected',
                COBROWSING_STARTED: 'chat_session_cobrowsing_started',
                COBROWSING_ENDED: 'chat_session_cobrowsing_ended',
                CASE_SET: 'chat_session_case_set',
                FILE_URL: 'chat_session_file_url',
                DIRECTIVE_FILE_URL: 'chat_session_directive_file_url',
                EDIT_MESSAGE: 'chat_session_message_edit',
                DELETE_MESSAGE: 'chat_session_message_delete'
            },
            actions: {
                HIDE: 'hide'
            }
        },
    }
};
var htmlUtilService = (function () {

    function wrapWithDiv(classWrapper, inner, id) {
        return '<div ' +
            (id ? ('id="' + id + '" ') : '') +
            (classWrapper ? ('class="' + classWrapper + '"') : '') + '>' + inner + '</div>'
    }

    function wrapWithLabel(classWrapper, inner, id, forAttr) {
        return '<label ' +
            (id ? ('id="' + id + '" ') : '') +
            (forAttr ? ('for="' + forAttr + '" ') : '') +
            (classWrapper ? ('class="' + classWrapper + '"') : '') + '>' + inner + '</label>'
    }

    function generateInput(type, id, value, validate, name, placeholder, isRequired, ariaRequired, className) {
        return '<input class="' + className + '" ' +
            'value="'+ value + '" ' +
            'type="' + type + '" ' +
            'id="' + id + '" ' +
            'name="' + name + '" ' +
            'placeholder="' + placeholder + '" ' +
            (validate ? ('data-validate="' + validate + '" ') : '') +
            (isRequired === 'true' ? ('required="' + isRequired + '" ') : '') +
            (ariaRequired ? ('aria-required="' + ariaRequired + '"') : '') + ' />';
    }

    function generateTextArea(id, name, value, placeholder, rows, isRequired, ariaRequired, className) {
        return '<textarea class="' + className + '" ' +
            'id="' + id + '" ' +
            'name="' + name + '" ' +
            'placeholder="' + placeholder + '" ' +
            (isRequired === 'true' ? ('required="' + isRequired + '" ') : '') +
            ((rows !== '') ? ('rows="' + rows + '" ') : ('height="80px" ')) +
            (ariaRequired ? ('aria-required="' + ariaRequired + '"') : '') + '>'+ value + '</textarea>'
    }

    function insertStyles(target, position, pathArray) {
        if (Array.isArray(pathArray)) {
            commonUtilService.forEach(pathArray, function(path) {
                target.insertAdjacentHTML(position, '<link href="' + path + '" type="text/css" rel="stylesheet" />');
            });
        }
    }

    function displayNone(element) {
        if (element && element.css) {
            element.css('display', 'none')
        }
    }

    function displayBlock(element) {
        if (element && element.css) {
            element.css('display', 'block')
        }
    }

    function displayInlineBlock(element) {
        if (element && element.css) {
            element.css('display', 'inline-block')
        }
    }

    function displayFlex(element) {
        if (element && element.css) {
            element.css('display', 'flex')
        }
    }

    function hasElementRequiredFields(elementSelector) {
        var items = $(elementSelector + ' *[required="true"]');
        return items.length > 0;
    }

    function setDivHoverById(elementId, title) {
        if (document && elementId && title) {
            var element = document.getElementById(elementId);
            if (element) {
                element.setAttribute('title', title)
            }
        }
    }

    // Converts html entities to characters safely: '&amp;' --> '&'
    function htmlDecode(input) {
        // IE9-
        if (typeof DOMParser !== 'function') return input;

        var doc = new DOMParser().parseFromString(input, "text/html");
        return doc.documentElement.textContent;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function unescapeHtml(safe) {
        return safe
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, '\'');
    }

    return {
        wrapWithDiv: wrapWithDiv,
        wrapWithLabel: wrapWithLabel,
        generateInput: generateInput,
        generateTextArea: generateTextArea,
        insertStyles: insertStyles,
        displayNone: displayNone,
        displayBlock: displayBlock,
        displayInlineBlock: displayInlineBlock,
        displayFlex: displayFlex,
        hasElementRequiredFields: hasElementRequiredFields,
        setDivHoverById: setDivHoverById,
        htmlDecode: htmlDecode,
        escapeHtml: escapeHtml,
        unescapeHtml: unescapeHtml
    }

})();
var buildProactiveOfferPreview = function () {
    var config = widgetConfiguration.getObject();
    var styling = config.styling;
    var properties = config.properties;
    var $offer = $('.proactive-offer'),
        $content = $offer.find('.proactive-offer__content');

    if (config.widgetType === 'proactive_offer') {

        var paAnimationIn = styling.animationIn,
            paAnimationOut = styling.animationOut,
            paPosition = styling.location || 'center',
            paAnimationInAttr = (commonUtilService.includes(paAnimationIn, 'slide')) ? paPosition + '_' + paAnimationIn : paAnimationIn,
            paAnimationOutAttr = (commonUtilService.includes(paAnimationOut, 'slide')) ? paPosition + '_' + paAnimationOut : paAnimationOut;

        var $body = $offer.find('.proactive-offer__body'),
            $callButton = $offer.find('.proactive-offer__button_type_call'),
            $chatButton = $offer.find('.proactive-offer__button_type_chat'),
            $closeButton = $offer.find('.proactive-offer__close.proactive-offer__button'),
            $close = $offer.find('.proactive-offer__close.close-icon');

        $callButton.toggleClass('proactive-offer__button_hide_yes', !properties.callButtonEnabled);
        $chatButton.toggleClass('proactive-offer__button_hide_yes', !properties.chatButtonEnabled);

        $callButton.text(properties.callButtonText);
        $chatButton.text(properties.chatButtonText);
        $closeButton.text(properties.cancelButtonText);

        $close.toggleClass('proactive-offer__close_hide_yes', !properties.closeButtonEnabled);

        $content.html(properties.htmlContent);

        $body.width(styling.width)
            .height(styling.height);
    }
    if (widgetConfiguration.isPreviewMode()) {
        $offer.removeClass();
        $offer.addClass('widget-background proactive-offer base-font');
        if ($offer) {
            $offer.removeAttr('data-animationIn');
            $offer.attr('data-animationIn', paAnimationInAttr);
            $offer.removeClass('position_center');
            $offer.addClass('position_' + paPosition);

            if (styling && sessionStorage.getItem('data-animationOut') != paAnimationOutAttr) {
                sessionStorage.setItem('runOutAnimation', true);
                setTimeout(function () {
                    sessionStorage.removeItem('runOutAnimation');
                }, 1000);
            }
        }

        if (sessionStorage.getItem('runOutAnimation')) {
            $offer.removeAttr('data-animationIn').removeAttr('data-animationOut').removeClass('removing');
            $offer.attr('data-animationOut', paAnimationOutAttr);
            $offer.addClass('removing');
            setTimeout(function () {
                $offer.removeAttr('data-animationOut').removeClass('removing');
                sessionStorage.removeItem('runOutAnimation');
            }, 700);
        }

        if (styling) {
            sessionStorage.setItem('data-animationOut', paAnimationOutAttr);
        }
    }
};
var proactiveChatStarter = function (chatCb) {

    var poConfig = widgetConfiguration.getProactiveOffer();

    if (!poConfig || !poConfig.conditions) {
        return;
    }

    var conf = {
        proactiveOfferCondition: poConfig.conditions,
        proactiveOfferStyling: poConfig.styling
    };

    var proactiveChatRuleMatcher = {
        "days_of_week": {
            days: ["SU", "MO", "TU", "WE", "TH", "FR", "SA"],

            fnCheck: function (args) {
                var d = new Date();
                var day = this.days[d.getDay()];
                return !!this.values[day];
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.values = {};

                for (var i = 0; i < confObj.values.length; ++i)
                    rtObj.values[confObj.values[i]] = true;

                rtObj.days = this.days;

                checker.timerCbMin = true;

                return rtObj;
            }
        }, "days_of_month": {
            fnCheck: function (args) {
                var d = new Date();
                var day = d.getDate();
                return !!this.values[day];
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.values = [];

                for (var i = 0; i < confObj.values.length; ++i)
                    rtObj.values[parseInt(confObj.values[i])] = true;

                checker.timerCbMin = true;

                return rtObj;
            }
        }, "time_of_day": {
            fnCheck: function (args) {
                var d = new Date();
                var sec = d.getHours() * (60 * 60) + d.getMinutes() * 60 + d.getSeconds();
                return this.from <= sec && this.to > sec;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.from = confObj.from;
                rtObj.to = confObj.to;

                checker.timerCbSec = true;

                return rtObj;
            }
        }, "months": {
            months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],

            fnCheck: function (args) {
                var d = new Date();
                var mon = this.month[d.getMonth()];
                return !!this.values[mon];
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.values = {};

                for (var i = 0; i < confObj.values.length; ++i)
                    rtObj.values[confObj.values[i]] = true;

                rtObj.month = this.months;

                checker.timerCbMin = true;

                return rtObj;
            }
        }, "referring_url": {
            fnCopyConf: function (confObj, rtObj, checker) {
                var re = new RegEx(confObj.value, "i");

                if (re.test(document.referrer))
                    rtObj.fnCheck = function () {
                        return true;
                    };
                else
                    checker.noCheck = true;

                return rtObj;
            }
        }, "language": {
            fnCopyConf: function (confObj, rtObj, checker) {
                if (navigator.language == confObj.value || navigator.language == confObj.value.substr(0, 2))
                    rtObj.fnCheck = function () {
                        return true;
                    }
                else
                    checker.noCheck = true;

                return rtObj;
            }
        }, "mobile": {
            fnCopyConf: function (confObj, rtObj, checker) {
                if (widgetConfiguration.isMobile())
                    rtObj.fnCheck = function () {
                        return true;
                    };
                else
                    checker.noCheck = true;

                return rtObj;
            }
        }, "nonmobile_browser": {
            fnCopyConf: function (confObj, rtObj, checker) {
                if (widgetConfiguration.isMobile()) {
                    checker.noCheck = true;
                } else {
                    rtObj.fnCheck = function () {
                        return true;
                    };
                }
                return rtObj;
            }
        }, "js_variable": {
            fnCheck: function (args) {
                var ret = false;
                try {
                    ret = !!eval(this.value);
                } catch (e) {}
                return ret;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                var v = confObj.value.toString();
                if (/[$a-zA-Z_][$a-zA-Z0-9_]*/.exec(v) == v) {
                    rtObj.fnCheck = this.fnCheck;
                    rtObj.value = "!!" + v;
                }
                else {
                    checker.noCheck = true;
                    return rtObj;
                }

                checker.timerCbSec = true;

                return rtObj;
            }
        }, "number_of_clicks": {
            fnCheck: function (args) {
                return false;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;

                var nc = parseInt(confObj.value);
                if (nc < 1) {
                    checker.noCheck = true;
                    return rtObj;
                }

                rtObj.clicksLeft = nc;

                var cb =
                    {
                        ev: "click",
                        el: document,
                        fn: function () {
                            if (--rtObj.clicksLeft <= 0)
                                rtObj.fnCheck = function () {
                                    return true;
                                }
                        }
                    };

                checker.eventCb.push(cb);

                return rtObj;
            }
        }, "cookie": {
            fnCopyConf: function (confObj, rtObj, checker) {

                var name = confObj.value;
                // var name = confObj.value + "=";
                var decodedCookie = decodeURIComponent(document.cookie);
                var ca = decodedCookie.split(';');

                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ') {
                        c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                        rtObj.fnCheck = function () {
                            return true;
                        };
                        return rtObj;
                    }
                }

                checker.noCheck = true;

                return rtObj;
            }
        }, "page_url": {
            fnCopyConf: function (confObj, rtObj, checker) {
                var uri = document.baseURI;
                var re = new RegExp(confObj.value, "i");
                if (re.test(uri)) {
                    rtObj.fnCheck = function () {
                        return true;
                    };
                    return rtObj;
                }

                checker.noCheck = true;

                return rtObj;
            }
        }, "about_to_exit": {
            fnCheck: function (args) {
                return false;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                var cb = {
                    // isJqueryEvent: true,
                    // ev: "mouseleave",
                    ev: "mouseout",
                    el: document,
                    fn: function (e) {
                        e = e || window.event;
                        if (e.pageY <= 10) {
                            rtObj.fnCheck = function () {
                                return true;
                            }
                        }
                    }
                };
                checker.eventCb.push(cb);
                return rtObj;
            }
        }, "url_in_history": {
            fnCopyConf: function (confObj, rtObj, checker) {
                var uri = document.baseURI;
                var history = window.localStorage.getItem('pagesVisitedUrls').split(',');

                for (var i = 0; i < history.length; i++) {
                    var re = new RegExp(history[i], "i");
                    if (re.test(uri)) {
                        rtObj.fnCheck = function () {
                            return true;
                        };
                        return rtObj;
                    }
                }

                checker.noCheck = true;

                return rtObj;
            }
        }, "first_visit": {
            fnCopyConf: function (confObj, rtObj, checker) {
                if (checker.visitStat.firstVisit) {
                    rtObj.fnCheck = function () {
                        return true;
                    };
                    return rtObj;
                }

                checker.noCheck = true;
                return rtObj;
            }
        }, "pages_visited_n": {
            fnCopyConf: function (confObj, rtObj, checker) {
                if (checker.visitStat.pagesVisited >= parseInt(confObj.value)) {
                    rtObj.fnCheck = function () {
                        return true;
                    };
                    return rtObj;
                }

                checker.noCheck = true;
                return rtObj;
            }
        }, "visit_duration": {
            fnCheck: function (args) {
                var n = Date.now() / 1000;
                if (n >= this.visitStop)
                    return true;
                return false;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.visitStop = Date.now() / 1000 + parseInt(confObj.value);
                checker.timerCbSec = true;
                return rtObj;
            }
        }, "max_wait_time": {
            fnCheck: function (args) {
                var ewt = parseInt(sessionStorage.getItem('ewt'));
                var mwt = parseInt(this.visitStop);
                if (mwt >= ewt)
                    return true;
                return false;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.visitStop = parseInt(confObj.value);
                checker.timerCbSec = true;
                return rtObj;
            }
        }, "estimated_wait_time": {
            fnCheck: function (args) {
                var ewt = parseInt(sessionStorage.getItem('ewt'));
                var mwt = parseInt(this.visitStop);
                if (mwt >= ewt)
                    return true;
                return false;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.visitStop = parseInt(confObj.value);
                checker.timerCbSec = true;
                return rtObj;
            }
        }, "chatted_before": {
            fnCopyConf: function (confObj, rtObj, checker) {
                if (window.localStorage.getItem('chattedBefore') == 'true') {
                    window.localStorage.removeItem('chattedBefore');
                    rtObj.fnCheck = function () {
                        return true;
                    };
                    return rtObj;
                }

                checker.noCheck = true;
                return rtObj;
            }
        }, "scrolls_to_depth": {
            fnCheck: function (args) {
                return false;
            },

            fnCopyConf: function (confObj, rtObj, checker) {
                rtObj.fnCheck = this.fnCheck;
                rtObj.value = parseInt(confObj.value);

                var cb =
                    {
                        ev: "scroll",
                        el: window,
                        fn: function () {
                            var box = document.getElementsByTagName("HTML")[0];
                            var h = box.offsetHeight;
                            var s = window.pageYOffset;
                            var w = window.innerHeight;
                            if (w >= h)
                                return;
                            var s100 = h - w;
                            var t = (s * 100 + s100 - 1) / s100;
                            if (t >= rtObj.value)
                                rtObj.fnCheck = function () {
                                    return true;
                                }
                        }
                    };

                checker.eventCb.push(cb);

                return rtObj;
            }
        }
    };

    if (commonUtilService.isUndefined(conf) || commonUtilService.isUndefined(chatCb) || conf == null || chatCb == null)
        return;

    var conditions = conf.proactiveOfferCondition;
    if (!conditions)
        return;

    var ruleChecker = {
        callBack: chatCb,
        ruleSets: [],
        timerCbMin: false,
        timerCbSec: false,
        eventCb: [],

        clean: function () {
            // clear timers
            if (this.timerCbMin) {
                window.clearInterval(this.timerCbMin);
                this.timerCbMin = null;
            }

            if (this.timerCbSec) {
                window.clearInterval(this.timerCbSec);
                this.timerCbSec = null;
            }

            // clear event callbacks
            // we have
            // events:
            // {
            //   id1: {
            //         el: <element ref>,
            //         events: {
            //           click: {
            //              fn: <callback fn>,
            //              cb: [ fn1, fn2, fn3 ]
            //           },
            //           keydown: {
            //              fn: <callback fn>,
            //              cb: [ fn1, fn2, fn3 ]
            //           }
            //         }
            //   },
            //   id2: {
            //         el: <element ref>,
            //         events: {
            //           click: {
            //              fn: <callback fn>,
            //              cb: [ fn1, fn2, fn3 ]
            //           },
            //           keydown: {
            //              fn: <callback fn>,
            //              cb: [ fn1, fn2, fn3 ]
            //           }
            //         }
            //   }
            // }
            //
            if (this.events) {
                for (var elName in this.events) {
                    var el = this.events[elName];

                    if (this.events.hasOwnProperty(elName) && typeof(el) === "object" && el.events) {
                        for (var ev in el.events) {
                            var evt = el.events[ev];
                            if (el.events.hasOwnProperty(ev) && evt.fn)
                                el.el.removeEventListener(ev, evt.fn);
                        }
                    }
                }

                this.events = null;
            }

        },

        check: function () {
            if (this.ruleSets.length == 0)
                return;

            for (var s = 0; s < this.ruleSets.length; ++s) {
                var rules = this.ruleSets[s];
                var bSatisfy = true;
                for (var i = 0; i < rules.length; ++i) {
                    if (!rules[i].fnCheck()) {
                        bSatisfy = false;
                        break;
                    }
                }
                if (bSatisfy) {

                    this.clean();
                    this.callBack();
                    break;
                }
            }
        }
    };


    // initialize local store vars
    var storage = window.localStorage;
    var ls = {
        firstVisit: true,
        pagesVisited: 0,
        lastVisit: Date.now() / 1000
    };


    if (typeof(storage) !== "undefined") {
        if (typeof(storage.proactiveVisitCount) === "undefined" || !storage.proactiveVisitCount || storage.proactiveVisitCount === "") {
            ls.firstVisit = true;
            ls.pagesVisited = 0;

            storage.proactiveVisitCount = 1;
        }
        else {
            ls.firstVisit = false;
            ls.pagesVisited = parseInt(storage.proactiveVisitCount);
            storage.proactiveVisitCount = ls.pagesVisited + 1;

        }

        if (typeof(storage.pagesVisitedUrls) === "undefined" || !storage.pagesVisitedUrls || storage.pagesVisitedUrls === "") {
            storage.pagesVisitedUrls = window.location.pathname;
        }
        else {
            if (storage.pagesVisitedUrls.indexOf(window.location.pathname) == -1) {
                storage.pagesVisitedUrls += ',' + window.location.pathname;
            }
        }

        if (typeof(storage.proactiveVisitTime) === "undefined" || storage.proactiveVisitTime === "") {
            storage.proactiveVisitTime = ls.lastVisit;
            storage.proactiveVisitCount = 1;
            ls.pagesVisited = 0;
        }
        else {
            var lv = parseInt(storage.proactiveVisitTime);
            storage.proactiveVisitTime = ls.lastVisit;

            if (ls.lastVisit - lv > 60 * 60) // new session
            {
                storage.proactiveVisitCount = 1;
                ls.pagesVisited = 0;
            }

            ls.lastVisit = lv;
        }
    }

    // iterate through condition sets
    for (var j = 0; j < conditions.length; ++j) {
        var condition = conditions[j];
        var rules = condition.rules;
        if (!rules)
            continue;

        if (typeof(rules) !== "object")
            continue;

        var set = [];

        // local checker for particular condition set
        var checker = {
            timerCbMin: null,
            timerCbSec: null,
            eventCb: [],
            visitStat: ls
        };


        // iterate through AND conditions in the set
        for (var i = 0; i < rules.length; ++i) {
            var rule = rules[i];
            if (typeof(rule) !== "object")
                continue;

            var ruleType = rule.ruleType;
            var ruleCheck = proactiveChatRuleMatcher[ruleType];

            if (typeof(ruleCheck) !== "object")
                continue;

            set.push(ruleCheck.fnCopyConf(rule, {}, checker));

            if (checker.noCheck)
                break;
        }

        // check if the set is not empty and it is not permanently false
        if (!checker.noCheck && set.length > 0) {
            // aggregate event callbacks
            if (checker.eventCb.length > 0)
                ruleChecker.eventCb = ruleChecker.eventCb.concat(checker.eventCb);

            // check if the set is permanently true
            var bDone = true;

            for (var r = 0; r < set.length; ++r) {
                if (!set[r].fnCheck()) {
                    bDone = false;
                    break;
                }
            }

            if (bDone) {
                // if true - call callback and return
                chatCb();
                return;
            }

            // aggregate timer requests and add the the set to rules
            if (checker.timerCbMin)
                ruleChecker.timerCbMin = true;

            if (checker.timerCbSec)
                ruleChecker.timerCbSec = true;


            ruleChecker.ruleSets.push(set);
        }
    }


    // install event callbacks
    var cbs = {};

    var pseudoId = "#$%876adr_0_";

    for (var i = 0; i < ruleChecker.eventCb.length; ++i) {
        var ecb = ruleChecker.eventCb[i];
        var eid;

        // if element does not have id - set temporary one
        if (ecb.el === window) {
            eid = "thisBrowserWindow";
        } else if (ecb.el === document) {
            eid = "thisDocument";
        } else if (!(eid = ecb.el.getAttribute("id"))) {
            eid = pseudoId + i;
            ecb.el.setAttribute("id", eid);
        }

        // if we don't have callbacks for the element - initialize it
        if (!cbs[eid])
            cbs[eid] = {el: ecb.el, events: {}};

        var evts = cbs[eid].events;

        if (!evts[ecb.ev]) {
            // if we don't have the event callback for the element - initialize it
            var obj = evts[ecb.ev] = {cb: [ecb.fn]};
            obj.fn = function (evt) {
                for (var e = 0; e < obj.cb.length; ++e) {
                    obj.cb[e](evt);
                }

                ruleChecker.check();
            };

            if (!ecb.isJqueryEvent) {
                ecb.el.addEventListener(ecb.ev, obj.fn, false);
            } else {
                $(ecb.el).on(ecb.ev, obj.fn);
            }
        }
        else {
            // if we have callback for the event - add callback function to array
            evts[ecb.ev].cb.push(ecb.fn);
        }
    }

    // clear temporarily set ids
    for (var eid in cbs) {
        if (cbs.hasOwnProperty(eid) && eid.indexOf(pseudoId) == 0) {
            var els = cbs[eid];
            els.el.removeAttribute("id");
        }
    }

    this.eventCb = [];
    ruleChecker.events = cbs;

    // install timers
    if (ruleChecker.timerCbMin) {
        if (ruleChecker.timerCbSec)
            ruleChecker.timerCbMin = false;
        else
            ruleChecker.timerCbMin = window.setInterval(function () {
                ruleChecker.check()
            }, 60 * 1000);
    }

    if (ruleChecker.timerCbSec)
        ruleChecker.timerCbSec = window.setInterval(function () {
            ruleChecker.check()
        }, 1000);

};
var proactiveOfferService = (function () {

    var animationIn, animationOut;

    function loadProactiveOfferStyles() {
        var chatPath = widgetConfiguration.getChatPath();
        document.querySelector('head').insertAdjacentHTML('beforeend', "<link href='" + chatPath + "css/proactive-offer.css' type='text/css' rel='stylesheet' />");
    }

    function createButton(className, innerText, dataTab) {
        if (dataTab) {
            return '<button class="' + className + '" data-tab="' + dataTab + '">' + innerText + '</button>'
        } else {
            return '<button class="' + className + '">' + innerText + '</button>'
        }
    }

    function getProactiveOfferButtons() {
        var poConfig = widgetConfiguration.getProactiveOffer();
        var commonClass = 'button-primary proactive-offer__button main-background-color second-color',
            callBtnClass = commonClass + ' ' + 'proactive-offer__button_type_call',
            chatBtnClass = commonClass + ' ' + 'proactive-offer__button_type_chat',
            emailBtnClass = commonClass + ' ' + 'proactive-offer__button_type_email',
            closeBtnClass = commonClass + ' ' + 'proactive-offer__close',
            paLeaveMessage = '',
            paCloseButton = '',
            paCallButton = '',
            paChatButton = '',
            paCloseButtonText = '';
        if (poConfig && poConfig.properties) {
            var properties = poConfig.properties;
            if (properties.callButtonEnabled) {
                paCallButton = createButton(callBtnClass, properties.callButtonText, 'call');
            }
            if (properties.chatButtonEnabled) {
                paChatButton = createButton(chatBtnClass, properties.chatButtonText, 'chat');
            }
            if (properties.cancelButtonText) {
                paCloseButtonText = properties.cancelButtonText
            }
        }
        paCloseButton = createButton(closeBtnClass, paCloseButtonText);
        paLeaveMessage = createButton(emailBtnClass, 'Leave message');
        return commonUtilService.isServiceAvailable() ? paCloseButton + paChatButton + paCallButton : paCloseButton + paLeaveMessage;
    }

    function getProactiveOfferHtml() {
        var width = '',
            height = '',
            content = '',
            position = 'center',
            buttons = getProactiveOfferButtons(),
            properties = null,
            styling = null,
            closeIcon = '',
            poConfig = widgetConfiguration.getProactiveOffer();
        animationIn = '';
        animationOut = '';
        if (poConfig) {
            styling = poConfig.styling;
            properties = poConfig.properties;
            if (styling) {
                position = styling.location;
                animationIn = styling.animationIn;
                animationOut = styling.animationOut;
                width = styling.width;
                height = styling.height;
            }
            if (properties) {
                content = properties.htmlContent;
                closeIcon = properties.closeButtonEnabled ? '<div class="proactive-offer__close-wrapper"><svg class="proactive-offer__close close-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path clip-rule="evenodd" d="M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z" /></svg></div>' : '';
            }
        }
        animationIn = (commonUtilService.includes(animationIn, 'slide')) ? position + '_' + animationIn : animationIn;
        animationOut = (commonUtilService.includes(animationOut, 'slide')) ? position + '_' + animationOut : animationOut;
        return '<div class="proactive-offer base-font position_' + position + '" data-animationIn="' + animationIn + '" >' +
                    '<div class="widget-border widget-border-radius">'+
                        '<div style="width:' + width + 'px;height:' + height + 'px;" class="proactive-offer__body widget-background">' +
                            '<div class="proactive-offer__content-wrapper">' +
                                closeIcon +
                                '<div class="proactive-offer__content">' + content + '</div>' +
                                '<div class="proactive-offer__button-wrapper">' + buttons + '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
    }

    function updateProactiveOfferStyles() {
        var poConfig = widgetConfiguration.getProactiveOffer();
        var proactiveOffer = document.querySelector('.proactive-offer');
        var poContent = document.querySelector('.proactive-offer__content');
        var poBtnWrapper = document.querySelector('.proactive-offer__button-wrapper');
        var contentHeight = poContent ? poContent.offsetHeight : 0,
            contentWidth = poContent ? poContent.offsetWidth : 0,
            buttonsHeight = poBtnWrapper ? poBtnWrapper.offsetHeight : 0,
            buttonsWidth = 30,
            screenWidth = proactiveOffer ? proactiveOffer.offsetWidth : 0,
            screenHeight = proactiveOffer ? proactiveOffer.offsetHeight : 0;

        var buttons = document.querySelectorAll('.proactive-offer__button-wrapper > *');
        [].forEach.call(buttons, function (button) {
            buttonsWidth += button.offsetWidth - 30;
        });

        var POheight = contentHeight + buttonsHeight,
            POwidth = Math.max.apply(Math, [contentWidth, buttonsWidth]);

        if (POwidth > screenWidth) {
            var coefX = screenWidth / POwidth;
        }
        if (POheight > screenHeight) {
            var coefY = screenHeight / POheight;
        }
        if (coefX || coefY) {
            var coef = Math.max.apply(Math, [coefX, coefY]),
                scale = 100 / coef;
            document.querySelector('.proactive-offer__content-wrapper>div').setAttribute("style", "transform:scale(' + coef + ');");
            document.querySelector('.proactive-offer__content').style.width = scale + '%';
        }
        var paButtonsEl = document.querySelector('.proactive-offer__button_type_chat');
        if (paButtonsEl !== null) {
            var paBody = document.querySelector('.proactive-offer__body');
            var isMobile = widgetConfiguration.isMobile();
            var availableHeight = (isMobile && window.screen) ? window.screen.availHeight : window.innerHeight;
            var availableWidth = (isMobile && window.screen) ? window.screen.availWidth : window.innerWidth;

            var calculatedHeight = Math.min(poConfig.styling.height, availableHeight);
            var calculatedWidth = Math.min(poConfig.styling.width, availableWidth);

            if (paBody && paBody.style) {
              paBody.style.width = calculatedWidth + 'px';
              paBody.style.height = calculatedHeight + 'px';
            }
        }
    }

    function setButtonsListeners(openChat, eventsCallback) {

        function loopButtons(e, buttons, isClose) {
            var helper = snippetHelperFunctions();
            [].forEach.call(buttons, function (button) {
                if (e.target === button){
                    if (!isClose) {
                        document.querySelector('.proactive-offer').setAttribute("data-animationOut", animationOut);
                        helper.addClass(document.querySelector('.proactive-offer'), 'removing');
                        setTimeout(function() {
                            removeProactiveOffer();
                        }, 500);
                        if (eventsCallback && eventsCallback.proactiveYes) {
                            eventsCallback.proactiveYes();
                        }
                        sessionStorage.setItem("tab", button.getAttribute('data-tab'));
                        openChat();
                        snippetOpenChat(true);
                        sessionStorage.setItem("source", 'proactive');
                    } else {
                        document.querySelector('.proactive-offer').setAttribute("data-animationOut", animationOut);
                        helper.addClass(document.querySelector('.proactive-offer'), 'removing');
                        setTimeout(function() {
                            removeProactiveOffer();
                        }, 500);
                        if (eventsCallback && eventsCallback.proactiveNo) {
                            eventsCallback.proactiveNo();
                        }
                    }
                }
            });
        }

        document.addEventListener('click', function (e) {
            var poButtons = document.querySelectorAll('.proactive-offer__button:not(.proactive-offer__close)');
            var poCloses = document.querySelectorAll('.proactive-offer__close');
            loopButtons(e, poButtons, false);
            loopButtons(e, poCloses, true);
        });
    }

    function isOpened() {
        return document.getElementsByClassName('proactive-offer').length > 0;
    }

    function build() {
        if (!isOpened()) {
            var iframe = document.querySelector('#sp-chat-iframe');
            if (!iframe) {
                var paCode = getProactiveOfferHtml();
                var body = document.querySelector('body');
                body.insertAdjacentHTML('beforeend', paCode);
                var offers = document.querySelectorAll('.proactive-offer.base-font');
                [].forEach.call(offers, function (offer) {
                    offer.setAttribute("style", "display:block")
                });
            }
            setTimeout(function () {
                updateProactiveOfferStyles();
            });
        }
    }

    function isAllowedToShow() {
        var allowed = true;
        var isMobile = widgetConfiguration.isMobile();
        var conditions = widgetConfiguration.getProactiveOfferConditions();
        if (isMobile) {
            conditions.forEach(function (condition) {
                if (condition && Array.isArray(condition.rules) && condition.rules.length) {
                    condition.rules.forEach(function (rule) {
                        if (rule && rule.ruleType === "nonmobile_browser") {
                            allowed =  false;
                        }
                    })
                }
            });
        } else {
            allowed = true;
        }
        return allowed;
    }

    function windowResizeListener() {
        if (isAllowedToShow()) {
            updateProactiveOfferStyles();
        } else {
            removeProactiveOffer();
            window.removeEventListener("resize", windowResizeListener, false);
        }
    }

    function isEnabled() {
        var poConfig = widgetConfiguration.getProactiveOffer();
        if (poConfig && poConfig.properties) {
            return !!poConfig.properties.enabled;
        }
        return false;
    }

    function buildProactiveOffer(openChat) {
        var eventsCallback = SERVICE_PATTERN_CHAT_CONFIG.callbacks;
        if (isAllowedToShow() && isEnabled()) {
            window.addEventListener("resize", windowResizeListener, false);
            loadProactiveOfferStyles();
            if (!commonUtilService.isServiceNotAvailable()) {
                proactiveChatStarter(build);
                setButtonsListeners(openChat, eventsCallback);
                if (eventsCallback && eventsCallback.proactiveChatOffered) {
                    eventsCallback.proactiveChatOffered();
                }
            }
        }
    }

    function resetProactiveOffer() {
        proactiveChatStarter(build);
    }

    function removeProactiveOffer() {
        var offer = document.querySelector('.proactive-offer');
        if(offer) {
            offer.parentNode.removeChild(offer);
        }
    }

    return {
        buildProactiveOffer: buildProactiveOffer,
        removeProactiveOffer: removeProactiveOffer,
        resetProactiveOffer: resetProactiveOffer
    }
})();
var scaleProactiveOffer = function () {
    var offer = $('.proactive-offer');
    if (offer) {
        var content = offer.find('.proactive-offer__content');
        if (content) {
            var contentHeight = content.outerHeight(),
                contentWidth = content.outerWidth(),
                buttonsHeight = $('.proactive-offer__button-wrapper').outerHeight(),
                buttonsWidth = 0,
                screenWidth = offer.width(),
                screenHeight = offer.height(),
                scaled = 1;
            $('.proactive-offer__button-wrapper > *').each(function () {
                buttonsWidth += $(this).width() + 10;
            });
            var POheight = contentHeight + buttonsHeight,
                POwidth = Math.max.apply(Math, [contentWidth, buttonsWidth]);

            if (POwidth > screenWidth) {
                var coefX = screenWidth / POwidth;
            }
            if (POheight > screenHeight) {
                var coefY = screenHeight / POheight;
            }
            if (coefX || coefY) {
                var coef = Math.max.apply(Math, [coefX, coefY]),
                    scale = 100 / coef;

                $('.proactive-offer__content-wrapper>div').attr('style', 'transform:scale(' + coef + ');');
                content.css('width', scale + '%');
                setTimeout(function () {
                    scaled = 0;
                }, 3000);
            }
        }
    }
};
var widgetConfiguration = (function () {

    function isMobile() {
        var agent = navigator.userAgent || navigator.vendor || window.opera;
        var check1 = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|iP(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(agent) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(agent.substr(0, 4));
        var check2 = /iP(ad|hone|od).+Version\/[\d\.]+.*Safari/i.test(navigator.userAgent);
        return check2 ? check2 : check1;
    }

    function getParams() {
        return sessionStorage.getItem("confParams");
    }

    function getFullConfiguration() {
        return sessionStorage.getItem("fullConf");
    }

    function getFullConfigurationObject() {
        return JSON.parse(getFullConfiguration());
    }

    function getObject() {
        return JSON.parse(getParams());
    }

    function getTarget() {
        return getChatConfiguration(getObject());
    }

    function getDefinition() {
        var object = getObject();
        return object ? object.definition : null;
    }

    function getStyles() {
        var object = getObject();
        return object ? object.styles : null;
    }

    function getCobrowsing() {
        var object = getObject();
        return object ? object.cobrowsing : null;
    }

    function getSurflyWidgetKey() {
        var cobrowsing = getCobrowsing();
        if (cobrowsing && cobrowsing.provider === "SURFLY") {
            return cobrowsing.widget_key;
        }
        return null;
    }

    function getItem(itemName, indexName) {
        var definition = getDefinition();
        var index = getItemIndex(indexName);
        if (definition && definition[itemName] && commonUtilService.isDefined(index)) {
            return definition[itemName][index];
        }
        return null;
    }

    function getItemIndex(propName) {
        var target = getTarget();
        if (target && target[propName]) {
            return target[propName].widgetIndex;
        }
        return null;
    }

    function getSnippetIndex() {
        return getItemIndex('chatInitiation');
    }

    function getSnippet() {
        return getItem('chatInitiations', 'chatInitiation');
    }

    function getProactiveOfferIndex() {
        return getItemIndex('proactiveOffer');
    }

    function getProactiveOffer() {
        return getItem('proactiveOffers', 'proactiveOffer');
    }

    function getProactiveOfferConditions() {
        var conditions = [];
        var po = getProactiveOffer();
        if (po && po.conditions) {
            conditions = po.conditions;
        }
        return conditions;
    }

    function getFormIndex() {
        return getItemIndex('form');
    }

    function getForm() {
        return getItem('forms', 'form');
    }

    function getOrientation() {
        var snippet = getSnippet();
        var util = commonUtilService;
        if (snippet && snippet.contactTab && snippet.contactTab.location) {
            return (util.includes(snippet.contactTab.location, 'right_') || util.includes(snippet.contactTab.location, 'left_')) ? 'vertical' : 'horizontal';
        }
    }

    function isPreviewMode() {
        var urlVars = clientChatPageGetUrlVars(window.location.href);
        if (urlVars && commonUtilService.isDefined(urlVars.brightpattern)) {
            return urlVars.brightpattern === 'previewmode';
        }
        return false;
    }

    function getChatPath() {
        if (SERVICE_PATTERN_CHAT_CONFIG && SERVICE_PATTERN_CHAT_CONFIG.chatPath) {
            var path = SERVICE_PATTERN_CHAT_CONFIG.chatPath;
            return (path.substr(path.length - 1) === "/") ? path : path + "/";
        }
        return '';
    }

    function getServicePatternChatConfig() {
        var deferred = jQuery.Deferred();
        window.addEventListener('message', function(event) {
            if(event && event.data && event.data.eventName === 'setServicePatternChatConfig'){
                deferred.resolve(event.data.params.servicePatternChatConfig);
                window.removeEventListener('message', null, false);
            }
        });
        window.parent.postMessage("getServicePatternChatConfig", "*");
        return deferred.promise();
    }

    function getPreChat() {
        var snippet = getSnippet();
        if (snippet && snippet.preChat) {
            return snippet.preChat;
        }
        return null;
    }

    function getChatConfiguration (data) {

        var obj = (data && data.widget) ? data.widget : data;
        var output = {};

        function findUrls(section, item, weight) {
            var result = {};
            if (section) {
                for (var i = 0; i < section.data.length; i++) {
                    for (var key in section.data[i].urls) {
                        if (section.data[i].urls.hasOwnProperty(key)) {
                            var comparedUrl = section.data[i].urls[key];
                            var compareResult = chatCompareUrl(comparedUrl)
                            if (compareResult.check) {
                                if (compareResult.weight > weight) {
                                    weight = compareResult.weight;
                                    result.widgetIndex = i;
                                    result.url = comparedUrl;
                                }
                            }
                        }
                    }
                }
            }
            return result;
        }

        function getDefaultData(data) {
            if (data) {
                return {data: data, widgetIndex: -1, target: {}}
            }
            return {}
        }

        function getWidgetOutput(targetSection, widgetType) {
            var widgetOutput = {data: {}, styles: data.styles};
            var sourceId = data.id;
            for (var key in targetSection) {
                if (targetSection.hasOwnProperty(key) && sourceId === targetSection[key].id) {
                    widgetOutput.index = key;
                    widgetOutput.data = targetSection[key];
                    if (widgetType) {
                        widgetOutput.data.widgetType = widgetType
                    }
                }
            }
            return widgetOutput
        }

        if (data) {
            if (widgetConfiguration.isPreviewMode()) {

                output = {data: {}, styles: data.styles};

                switch (data.section) {
                    case "chat_initiation":
                        output = getWidgetOutput(obj.chatInitiations);
                        break;
                    case "proactive_offer":
                        output = getWidgetOutput(obj.proactiveOffers, 'proactive_offer');
                        break;
                    case "form":
                        output = getWidgetOutput(obj.forms, 'form');
                        break;
                    case "on_page_form":
                        output = getWidgetOutput(obj.onPageForms, 'onPageForm');
                        break;
                    case "chat_styling":
                        output.data = obj.chatWidgetStyling;
                        output.data.widgetType = 'chat_styling';
                        var chatInit = obj.chatInitiations[0];
                        if (chatInit) {
                            output.data.contactTab = chatInit.contactTab;
                        }
                        break;
                }

            } else {
                var temporaryWeight = 0;
                var chatInitiations = data.definition ? getDefaultData(data.definition.chatInitiations) : {};
                var proactiveOffers = data.definition ? getDefaultData(data.definition.proactiveOffers) : {};
                var forms = data.definition ? getDefaultData(data.definition.forms) : {};
                output['chatInitiation'] = (findUrls(chatInitiations, 'chatInitiation', temporaryWeight));
                output['proactiveOffer'] = (findUrls(proactiveOffers, 'proactiveOffer', temporaryWeight));
                output['form'] = (findUrls(forms, 'form', temporaryWeight));
            }
        }

        return output;
    }

    function getDefinitionStyling() {
        var definition = getDefinition();
        if (definition && definition.chatWidgetStyling) {
            return definition.chatWidgetStyling
        }
    }

    function isCobrowsingTogetherJS() {
        var enabled = false;
        // var chatWidgetStyling = getDefinitionStyling();
        var cobrowsing = getCobrowsing();
        var spConfig = SERVICE_PATTERN_CHAT_CONFIG;
        var forceTogetherJSEnabled = spConfig ? spConfig.togetherJS_enabled : undefined;

        enabled = cobrowsing && cobrowsing.provider === 'TOGETHERJS';
        if (commonUtilService.isDefined(forceTogetherJSEnabled)) {
            enabled = commonUtilService.stringIsTrue(forceTogetherJSEnabled) || forceTogetherJSEnabled === true;
        }
        // if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.cobrowsing)) {
        //     enabled = chatWidgetStyling.cobrowsing === true;
        // }
        // var surflyIsHere = getSurflyWidgetKey();
        // if (surflyIsHere) {
        //     enabled = false;
        // }
        return enabled;
    }

    function isCobrowsingEditEnabled() {
        var enabled = true;
        var chatWidgetStyling = getDefinitionStyling();
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.remoteEditing)) {
            enabled = !!chatWidgetStyling.remoteEditing;
        }
        return enabled;
    }

    function isFileAttachEnabled() {
        var enabled = true;
        var chatWidgetStyling = getDefinitionStyling();
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.fileUploadEnabled)) {
            enabled = !!chatWidgetStyling.fileUploadEnabled;
        }
        return enabled;
    }

    function isEmojiPickerEnabled() {
        var enabled = true;
        var chatWidgetStyling = getDefinitionStyling();
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.emojiSelector)) {
            enabled = !!chatWidgetStyling.emojiSelector;
        }
        return enabled;
    }

    function isVisitorVideoEnabled() {
        var chatWidgetStyling = getDefinitionStyling();
        return !!chatWidgetStyling && chatWidgetStyling.visitorVideoEnabled !== false;
    }

    return {
        getSnippetIndex: getSnippetIndex,
        getProactiveOfferIndex: getProactiveOfferIndex,
        getFormIndex: getFormIndex,
        isMobile: isMobile,
        getDefinition: getDefinition,
        getDefinitionStyling: getDefinitionStyling,
        getStyles: getStyles,
        getCobrowsing: getCobrowsing,
        getSurflyWidgetKey: getSurflyWidgetKey,
        getSnippet: getSnippet,
        getProactiveOffer: getProactiveOffer,
        getProactiveOfferConditions: getProactiveOfferConditions,
        getForm: getForm,
        getOrientation: getOrientation,
        getPreChat: getPreChat,
        getChatPath: getChatPath,
        isPreviewMode: isPreviewMode,
        getParams: getParams,
        getObject: getObject,
        getTarget: getTarget,
        getFullConfiguration: getFullConfiguration,
        getFullConfigurationObject: getFullConfigurationObject,
        getChatConfiguration: getChatConfiguration,
        getServicePatternChatConfig: getServicePatternChatConfig,
        isCobrowsingTogetherJS: isCobrowsingTogetherJS,
        isCobrowsingEditEnabled: isCobrowsingEditEnabled,
        isFileAttachEnabled: isFileAttachEnabled,
        isEmojiPickerEnabled: isEmojiPickerEnabled,
        isVisitorVideoEnabled: isVisitorVideoEnabled,
    };
})();
var chatCompareUrl = function (comparedUrl) {

    var parentHost = sessionStorage.getItem('parentHost')

    var sourceRelativeUrl = (parentHost) ? sessionStorage.getItem('parentPath') : window.location.pathname.split('#')[0],
        sourceAbsoluteUrl = (parentHost) ? sessionStorage.getItem('parentHost') + sessionStorage.getItem('parentPath') : window.location.host + window.location.pathname.split('#')[0],
        sourceRelativeUrlSegments = sourceRelativeUrl.split('#')[0].split('/');
    var sourceAbsoluteUrlSegments = sourceAbsoluteUrl.split('#')[0].split('/');
    var comparedUrlSegments = comparedUrl.split('#')[0].split('/');
    var check = false,
        urlItemType = {
            path: (comparedUrl.substring(0, 1) === '/') ? 'relative' : 'absolute',
            object: (comparedUrl.substring(comparedUrl.length - 1, comparedUrl.length) === '/') ? 'folder' : 'file'
        };

    var weight = 0;

    function updateWeight(sourceUrlSegments) {
        for (var i = 0; i < comparedUrlSegments.length - 1; i++) {
            var current = i + 1;
            if (comparedUrlSegments[i] === sourceUrlSegments[i]) {
                weight++
            }
            check = (current === weight);
        }
    }

    if (urlItemType.object === 'file') {
        if (comparedUrl === sourceAbsoluteUrl && urlItemType.path === 'absolute') weight = 999;
        if (comparedUrl === sourceRelativeUrl && urlItemType.path === 'relative') weight = 998;
        check = true;
    }

    if (urlItemType.object === 'folder') {
        if (urlItemType.path === 'relative') updateWeight(sourceRelativeUrlSegments);
        if (urlItemType.path === 'absolute') updateWeight(sourceAbsoluteUrlSegments);
    }

    return {check: check, weight: weight};
};
var constructorConfigurationPreview = function (data, styles) {
    var helper = snippetHelperFunctions();
    var conf = widgetConfiguration.getObject();
    var fullConf = widgetConfiguration.getFullConfigurationObject();;
    var frameHeight = Math.min.apply(Math, [fullConf.widget.chatWidgetStyling.height, window.innerHeight - 20]);
    var widget = document.querySelector('#sp-chat-widget'),
        frame = document.querySelector('#sp-chat-frame'),
        body = document.querySelector('body'),
        labelText = document.querySelector('#sp-chat-label-text'),
        labelIcon = document.querySelector('#sp-chat-label-icon'),
        avatarImageWrapper = document.querySelector('.avatar-image-wrapper'),
        avatar = document.querySelector('.avatar-image'),
        messagesDiv = document.querySelector('#messages-div'),
        previewAgentImage = document.querySelector('.previewAgentImage'),
        preChatForm = document.querySelector('.pre_chat_form #preChatForm'),
        preChatFrame = document.querySelector('.pre_chat_form #sp-chat-frame'),
        agentName = document.querySelector('.pre_chat_form #agent-name'),
        screenTitle = document.querySelector('#screen-title'),
        questionFormInner = document.querySelector('.questionFormInner'),
        offlineFields = document.querySelector('.offlineFields'),
        customFormFields = document.querySelector('.custom-form-fields'),
        messagesDivOuter = document.querySelector('#messages-div-outer');

    if (frame) {
        frame.offsetHeight = frameHeight;
        frame.offsetWidth = fullConf.widget.chatWidgetStyling.width;
    }

    helper.addClass(body, 'preview_body');

    if (conf.contactTab) {

        var icon = conf.contactTab.iconUrl || '';
        if (icon.length == 0) {
            if (labelIcon) helper.addClass(labelIcon, 'collapse');
        } else {
            if (labelIcon) helper.removeClass(labelIcon, 'collapse');
        }
        labelIcon.style.cssText = (icon.length > 0) ? 'width: 28px;margin: 6px 10px;background:url("' + icon + '") center center no-repeat/contain' : '';
        if (labelText) labelText.innerHTML = conf.contactTab.agentsAvailableMsg || '';

        if (conf.contactTab.enabled == false) {
            if (widget) helper.hide(widget);
        } else {
            if (widget) helper.show(widget);
        }

    }

    if (fullConf && fullConf.widget.chatInitiations[0]) {
        var src = fullConf.widget.chatInitiations[0].contactTab.iconUrl ? fullConf.widget.chatInitiations[0].contactTab.iconUrl : '';
        if (src.length == 0) {
            if (avatarImageWrapper) helper.addClass(avatarImageWrapper, 'collapse');
            if (messagesDiv) helper.addClass(messagesDiv, 'noAgentImage');
        } else {
            if (avatarImageWrapper) helper.removeClass(avatarImageWrapper, 'collapse');
            if (messagesDiv) helper.removeClass(messagesDiv, 'noAgentImage');
        }
        if (avatar) avatar.style.cssText = "background-image:url('" + src + "')";
        if (previewAgentImage) previewAgentImage.style.cssText = 'background:url(' + src + ') center center no-repeat;background-size:contain!important;border-radius:0';
        sessionStorage.setItem('logoUrl', src)
    }

    if (conf.preChat) {

        var pcConfig = conf.preChat;

        if (pcConfig.enabled == false) {
            if (preChatForm) helper.hide(preChatForm);
            if (preChatFrame) helper.hide(preChatFrame);
            if (frame) frame.style.display = "";
        } else {
            if (preChatForm) preChatForm.style.display = "";
            if (preChatFrame) preChatFrame.style.display = "";
        }

        if (agentName) agentName.innerHTML = pcConfig.title;

    }

    if (conf.leaveMessage) {
        var lmConfig = conf.leaveMessage;
        if (screenTitle) screenTitle.innerHTML = lmConfig.title;
    }

};
var constructorHelpers = function () {
    var helper = snippetHelperFunctions();

    var helpers = {
        listener: function (event) {
            var preview = document.querySelector('#preview');
            if (commonUtilService.isJsonString(event.data)) {
                sessionStorage.setItem('fullConf', event.data);
                var config = JSON.parse(event.data);
                var target = widgetConfiguration.getChatConfiguration(config);

                if (config.screen) {
                    if (preview) {
                        preview.setAttribute('class', '');
                        helper.addClass(preview, config.screen);
                    }
                    sessionStorage.setItem('confParams', JSON.stringify(target.data));
                    sessionStorage.setItem('styles', JSON.stringify(config.styles));
                    helpers.applyConfiguration(target.data, target.styles);
                }
            }
        },

        applyConfiguration: function (data, styles) {
            snippetConfigurationSnippet(data, styles);
            constructorConfigurationPreview(data, styles);
            if (widgetConfiguration.isPreviewMode()) {
                loadScripts([
                    "js/libraries/jquery/jquery-3.2.1.min.js",
                    "js/libraries/perfect-scrollbar/perfect-scrollbar.min.js"
                ], function () {
                    clientChatPageConfigurationChat();
                    buildProactiveOfferPreview();
                    scaleProactiveOffer();
                });
            }
        },

        showChat: function () {
            var content = document.querySelector('.chat-preview-content');
            if (content) helper.show(content);
        }
    };

    return helpers;
};
var constructorPreviewCode = function () {
    var variables = snippetVariables();
    var chatPath = widgetConfiguration.getChatPath();
    var fullConf = JSON.parse(sessionStorage.getItem("fullConf"));
    var isRoundButton = false;
    var i18n = clientChatUiI18n();
    if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling) {
        isRoundButton = fullConf.widget.chatWidgetStyling.tabStyle === 'round';
    }
    return (
        '<div id="preview">'+
            '<div class="chat-preview-content">'+
                '<div id="sp-chat-widget">'+
                    '<div class="sp-round-button main-background-color second-fill-color" style="' + (isRoundButton ? '' : 'display:none') + '">'+
                        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 74 74"><path transform="scale(1.3) translate(15 15)" d="M14,2C7.458,2,2,6.769,2,12.8S7.458,23.6,14,23.6c.415,0,.8-.083,1.2-.122v3.834l1.849-1.186c2.595-1.665,8.213-5.988,8.883-12.192A9.906,9.906,0,0,0,26,12.8C26,6.769,20.542,2,14,2Zm0,2.4c5.389,0,9.6,3.828,9.6,8.4a7.5,7.5,0,0,1-.052.867v0l0,0c-.415,3.841-3.489,6.857-5.946,8.824V20.687l-1.437.291A10.918,10.918,0,0,1,14,21.2c-5.389,0-9.6-3.828-9.6-8.4S8.611,4.4,14,4.4Z"/></svg>'+
                    '</div>'+
                    '<div class="sp-chat-widget__content main-background-color contact-tab-border" style="' + (isRoundButton ? 'display:none' : '') + '">'+
                        '<div id="sp-chat-label-icon"></div>'+
                        '<div id="sp-chat-label-text" class="base-font contact-tab-font second-color">text</div>'+
                    '</div>'+
                '</div>'+
                '<div class="proactive-offer base-font position_center">'+
                    '<div class="widget-border widget-border-radius">'+
                        '<div class="proactive-offer__body widget-background">'+
                            '<div class="proactive-offer__close-wrapper"><svg class="proactive-offer__close close-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path clip-rule="evenodd" d="M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z" /></svg></div>'+
                            '<div class="proactive-offer__content-wrapper">'+
                                '<div class="proactive-offer__content"></div>'+
                                '<div class="proactive-offer__button-wrapper">'+
                                    '<button class="button-primary proactive-offer__button proactive-offer__close main-background-color second-color"></button>' +
                                    '<button class="button-primary proactive-offer__button proactive-offer__button_type_chat main-background-color second-color"></button>'+
                                    '<button class="button-primary proactive-offer__button proactive-offer__button_type_call main-background-color second-color"></button>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
                '<div id="sp-chat-frame" class="base-font">'+
                    '<div id="sp-drag-handle"></div>'+
                    '<div id="sp-side-bar">'+
                        '<div id="sp-close-frame" class="close-icon">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" class="main-path-color" width="15" height="15"><path clip-rule="evenodd" d="M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z" /></svg>' +
                        '</div>'+
                    '</div>'+
                    '<div id="sp-iframe-container">'+
                        '<div id="sp-chat-iframe2" class="widget-border-radius dialog-shadow">'+
                            '<div id="inner-chat" class="widget-border widget-border-radius base-font">'+
                                '<div id="servicepatternsite-iframe-chat">'+
                                    '<div id="header-avatar" class="main-background-color">'+
                                        '<div id="header-avatar-container">'+
                                            '<div class="has-avatar">'+
                                                '<div class="avatar">'+
                                                    '<div class="avatar-image-wrapper">'+
                                                        '<div class="avatar-image" style="background-image:url(' + variables.SP.chatPath + '/images/logo-big.png)"></div>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="info second-color title-font">'+
                                                    '<div id="agent-name" class="agent-name"></div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div class="clear"></div>'+
                                        '<div class="sound_player"></div>'+
                                        '<div class="conversationOptions">' +
                                            '<div id="callMe" class="main-path-color">'+
                                                '<svg class="startCall" xmlns="http://www.w3.org/2000/svg" width="20" height="19.001"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.246 14.774l-.258.119.012.108c0 1.656-1.343 3-3 3h-2.101c-.208.58-.748 1-1.399 1s-1.191-.42-1.399-1h-.101v-1h.101c.208-.58.748-1 1.399-1s1.191.42 1.399 1h1.101c1.36 0 2.496-.912 2.863-2.153-.507-.24-.863-.748-.863-1.347v-5c0-.829.672-1.5 1.5-1.5.277 0 .523.096.746.228 1.594.526 2.754 2.002 2.754 3.772s-1.16 3.247-2.754 3.773zm-.246-6.273c0-.276-.224-.5-.5-.5s-.5.225-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5v-5zm1 .315v4.371c.602-.545 1-1.309 1-2.186 0-.876-.398-1.64-1-2.185zm-8-7.816c-3.313 0-6 2.688-6 6.001h-1c0-3.866 3.134-7.001 7-7.001s7 3.135 7 7.001h-1c0-3.313-2.687-6.001-6-6.001zm-5 7.501v5c0 .828-.672 1.5-1.5 1.5-.277 0-.523-.096-.746-.228-1.594-.525-2.754-2.002-2.754-3.772s1.16-3.247 2.754-3.772c.223-.132.469-.228.746-.228.828 0 1.5.672 1.5 1.5zm-3 .315c-.602.545-1 1.309-1 2.185 0 .877.398 1.641 1 2.186v-4.371zm2-.315c0-.276-.224-.5-.5-.5s-.5.225-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5v-5z"/></svg>'+
                                            '</div>'+
                                            '<div id="minimizeChat" class="main-stroke-color" style="display: none;">'+
                                                '<svg class="minimizeChat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><line x1="0" y1="30" x2="32" y2="30" stroke-width="2"></line></svg>'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>'+
                                    '<form id="content-form" method="POST"></form>'+
                                    '<div id="offline-form">'+
                                        '<div id="offline-form-inner">'+
                                            '<div id="preChatForm" class="question__chat-tab_active agent-message">'+
                                                '<div class="tabs">'+
                                                    '<div class="tab tab_active tabChat main-color widget-background"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="17"><path clip-rule="evenodd" d="M15.001 12.001h-3.601l-6.4 5v-5h-1c-.552 0-1-.447-1-1v-7c0-.552.448-1 1-1h11c.552 0 1 .448 1 1v7c.001.553-.447 1-.999 1zm-1-7h-9.001v5h2v3.391l3.827-3.391h3.174v-5zm-12.001 3.999h-1c-.552 0-1-.448-1-1v-7c0-.553.448-1 1-1h9c.552 0 1 .447 1 1v1h-9v7z" fill="none"/></svg><span>Chat</span></div>'+
                                                    '<div class="tab tabChat"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="17"><path clip-rule="evenodd" d="M15.001 12.001h-3.601l-6.4 5v-5h-1c-.552 0-1-.447-1-1v-7c0-.552.448-1 1-1h11c.552 0 1 .448 1 1v7c.001.553-.447 1-.999 1zm-1-7h-9.001v5h2v3.391l3.827-3.391h3.174v-5zm-12.001 3.999h-1c-.552 0-1-.448-1-1v-7c0-.553.448-1 1-1h9c.552 0 1 .447 1 1v1h-9v7z" fill="none"/></svg><span>Chat</span></div>'+

                                                    '<div class="tab tab_active tabPhone main-color widget-background"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17"><path clip-rule="evenodd" d="M12.492 17c-.444 0-.883-.075-1.302-.224-5.191-1.836-9.303-6.056-11.001-11.289-.509-1.573.032-3.302 1.346-4.305l.838-.639c.465-.355 1.022-.543 1.609-.543 1 0 1.905.553 2.363 1.444l1.417 2.751c.134.262.206.555.206.848 0 .466-.174.912-.49 1.256l-.295.321c-.293.318-.357.791-.159 1.175.484.937 1.235 1.688 2.174 2.171.377.196.864.129 1.175-.157l.321-.295c.56-.514 1.432-.632 2.105-.285l2.754 1.415c.893.458 1.447 1.362 1.447 2.362 0 .701-.271 1.363-.768 1.865l-.958.969c-.728.738-1.742 1.16-2.782 1.16zm-8.51-15.407c-.235 0-.457.075-.642.216l-.838.639c-.777.594-1.097 1.618-.796 2.549 1.545 4.765 5.289 8.607 10.017 10.279.828.293 1.803.068 2.418-.555l.958-.97c.198-.201.308-.466.308-.745 0-.399-.223-.762-.58-.945l-2.754-1.415c-.111-.057-.246-.007-.299.041l-.321.295c-.793.728-2.025.895-2.983.4-1.235-.636-2.226-1.624-2.861-2.858-.503-.976-.342-2.173.4-2.981l.294-.32c.032-.035.07-.094.07-.179l-.029-.12-1.416-2.752c-.183-.358-.546-.579-.946-.579z" /></svg><span>Phone</span></div>'+
                                                    '<div class="tab tabPhone"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17"><path clip-rule="evenodd" d="M12.492 17c-.444 0-.883-.075-1.302-.224-5.191-1.836-9.303-6.056-11.001-11.289-.509-1.573.032-3.302 1.346-4.305l.838-.639c.465-.355 1.022-.543 1.609-.543 1 0 1.905.553 2.363 1.444l1.417 2.751c.134.262.206.555.206.848 0 .466-.174.912-.49 1.256l-.295.321c-.293.318-.357.791-.159 1.175.484.937 1.235 1.688 2.174 2.171.377.196.864.129 1.175-.157l.321-.295c.56-.514 1.432-.632 2.105-.285l2.754 1.415c.893.458 1.447 1.362 1.447 2.362 0 .701-.271 1.363-.768 1.865l-.958.969c-.728.738-1.742 1.16-2.782 1.16zm-8.51-15.407c-.235 0-.457.075-.642.216l-.838.639c-.777.594-1.097 1.618-.796 2.549 1.545 4.765 5.289 8.607 10.017 10.279.828.293 1.803.068 2.418-.555l.958-.97c.198-.201.308-.466.308-.745 0-.399-.223-.762-.58-.945l-2.754-1.415c-.111-.057-.246-.007-.299.041l-.321.295c-.793.728-2.025.895-2.983.4-1.235-.636-2.226-1.624-2.861-2.858-.503-.976-.342-2.173.4-2.981l.294-.32c.032-.035.07-.094.07-.179l-.029-.12-1.416-2.752c-.183-.358-.546-.579-.946-.579z" /></svg><span>Phone</span></div>'+
                                                '</div>'+
                                                '<div class="questionFormInner ps-container widget-background">'+
                                                    '<div class="fieldsWrapper">'+
                                                        '<div class="commonFields"></div>'+
                                                        '<div class="chatFields"></div>'+
                                                        '<div class="phoneFields"></div>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="prechat__action-buttons base-font">'+
                                                    '<input id="cancelPreChatForm" type="button" value="Cancel" class="button-primary cancel main-background-color second-color preview">'+
                                                    '<input id="submitChat" type="button" value="Call tab" class="button-primary accept main-background-color second-color">'+
                                                    '<input id="submitPhone" type="button" value="Phone tab" class="button-primary phone main-background-color second-color">'+
                                                '</div>'+
                                            '</div>'+
                                            '<div id="unavailableForm">'+
                                                '<div id="offline-form-fields" class="ps-container">'+
                                                    '<div class="offlineFields"></div>'+
                                                    '<div class="buttons">'+
                                                        '<div id="uncancelWrapper" class="left-button preview">'+
                                                            '<button id="uncancel" class="servicepatternBtn cancel main-background-color second-color">Cancel</button>'+
                                                        '</div>'+
                                                        '<div>'+
                                                            '<input id="unsubmit" type="button" value="Send" class="servicepatternBtn main-background-color second-color">'+
                                                        '</div>'+
                                                    '</div>'+
                                                    '<div class="clear"></div>'+
                                                    '<div class="ps-scrollbar-x-rail" style="left: 0px; bottom: 3px;"><div class="ps-scrollbar-x" style="left: 0px; width: 0px;"></div></div><div class="ps-scrollbar-y-rail" style="top: 0px; right: 3px;"><div class="ps-scrollbar-y" style="top: 0px; height: 0px;"></div></div></div>'+
                                            '</div>'+
                                            '<div id="surveyForm" style="display: none;">'+
                                                '<div class="field-wrapper serviceSurvey">'+
                                                    '<div class="description">Did we provide the service you were looking for?</div>'+
                                                    '<input type="radio" name="service" id="service-1" value="1" checked="checked">'+
                                                    '<label for="service-1">yes</label>'+
                                                    '<input type="radio" name="service" id="service-0" value="0">'+
                                                    '<label for="service-0">no</label>'+
                                                '</div>'+
                                                '<div class="field-wrapper helpfulSurvey radioStars">'+
                                                    '<div class="description">How helpful was our representative?</div>'+
                                                    '<div class="stars">'+
                                                        '<input type="radio" name="helpful" id="helpful-1" value="2"><label for="helpful-1"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-2" value="4"><label for="helpful-2"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-3" value="6"><label for="helpful-3"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-4" value="8"><label for="helpful-4"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-5" value="10"><label for="helpful-5"></label>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="field-wrapper recommendSurvey radioStars">'+
                                                    '<div class="description">How likely are you to recommend our products and services in the future?</div>'+
                                                    '<div class="stars">'+
                                                        '<input type="radio" name="recommend" id="recommend-1" value="2"><label for="recommend-1"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-2" value="4"><label for="recommend-2"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-3" value="6"><label for="recommend-3"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-4" value="8"><label for="recommend-4"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-5" value="10"><label for="recommend-5"></label>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="field-wrapper transcriptSurvey">'+
                                                    '<input type="checkbox" name="transcript" id="transcript" value="1">'+
                                                    '<label for="transcript" class="description small">Send me transcript of the chat by email?</label>'+
                                                '</div>'+
                                                '<div class="field-wrapper emailSurvey">'+
                                                    '<div class="description">Your email*</div>'+
                                                    '<input type="text" name="transcriptEmail" id="transcriptEmail"/>'+
                                                '</div>'+
                                                '<div class="buttons" style="margin-top: -10px;">'+
                                                    '<div>'+
                                                        '<input id="submitSurvey" type="button" value="Submit" class="servicepatternBtn main-background-color second-color">'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                            '<div id="customForm">'+
                                                '<div class="custom-form-fields ps-container widget-background">'+
                                                    '<div class="customFormFields">'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="buttons">'+
                                                    '<div class="left-button">'+
                                                        '<button id="custom_cancel" class="servicepatternBtn cancel main-background-color second-color">Cancel</button>'+
                                                    '</div>'+
                                                    '<div>'+
                                                        '<input id="custom_submit" type="button" value="Send" class="servicepatternBtn main-background-color second-color">'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>'+
                                    '<div id="chat-body" class="widget-background">'+
                                        '<div class="chat-body__content">'+
                                            '<video id="video" style="display: none; height: 100px; width: 100%" autoplay=""></video>'+
                                            '<div id="notification-prompt" style="display: none;" class="promptMessage">When'+
                                                'prompted, please'+
                                                'allow notifications from this window, so you could see responses when this window is'+
                                                'hidden.'+
                                            '</div>'+
                                            '<div id="call-controls" class="widget-background" style="display: none;">'+
                                                '<div id="call-controls_before-call" style="display: none;">'+
                                                    '<p class="second-color">Accept <span>video</span> call from <span class="agent-name">[Agent name]</span></p>'+
                                                    '<button id="call-controls_accept" class="servicepatternBtn second-color">Accept</button>'+
                                                    '<button id="call-controls_reject" class="servicepatternBtn second-color">Reject</button>'+
                                                '</div>'+
                                                '<div id="call-controls_in-call" style="display: none;">'+
                                                    '<button id="call-controls_mute-audio" class="servicepatternBtn second-color">'+
                                                        '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><path fill="#fff" d="M11.615 26.764a.373.373 0 110-.745h3.522v-3.963a6.18 6.18 0 01-5.927-6.048v-3.717a.381.381 0 01.388-.37.381.381 0 01.392.37v3.714a5.44 5.44 0 005.54 5.322 5.683 5.683 0 002.606-.628l.385.635a6.476 6.476 0 01-2.6.719v3.963h3.524a.373.373 0 110 .745zM9.19 4.003l.776-.512 13.77 22.636-.776.606zm2.505 12.2v-6.124l5.66 9.342a3.913 3.913 0 01-1.829.465 3.758 3.758 0 01-3.831-3.68zm8.627 2.455a5.135 5.135 0 00.744-2.653v-3.714a.388.388 0 01.776 0v3.713a5.851 5.851 0 01-1.079 3.378zM12.458 5.733a3.862 3.862 0 013.068-1.496 3.756 3.756 0 013.83 3.679v8.291a3.593 3.593 0 01-.078.74z"/></svg>'+
                                                    '</button>'+
                                                    '<button id="call-controls_mute-video" class="servicepatternBtn second-color">'+
                                                        '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><path d="M7.169 22.681a1.364 1.364 0 01-1.358-1.37v-9.594a1.36 1.36 0 011.263-1.361L19.2 22.587a1.33 1.33 0 01-.482.093zm1.817-12.334h9.731a1.364 1.364 0 011.358 1.37v9.594a1.348 1.348 0 01-.02.2zM25.04 21.12l-3.605-3.236v-1.371h4.755v4.112a.683.683 0 01-.68.685.674.674 0 01-.47-.19zm-3.605-4.607v-1.366l3.626-3.255a.673.673 0 01.449-.171.683.683 0 01.68.685v4.111z" fill="#fff"/><path d="M6.829 7.264l17.322 17.473" stroke-miterlimit="10" fill="none" stroke="#fff"/></svg>'+
                                                    '</button>'+
                                                    '<button id="call-controls_end-call" class="servicepatternBtn second-color">'+
                                                        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="#db2828" d="M31.161 16.019A15.144 15.144 0 1116.02.875 15.144 15.144 0 0131.16 16.019"/><path fill="#fff" d="M17.548 13.267h-2.05c-.984 0-8.44.823-8.44 3.818 0 0 .16 2.29 1.1 2.29a14.105 14.105 0 003.316-.762c.683-.22.944-.503 1.125-1.548a1.65 1.65 0 011.733-1.448c.55-.026 1.438-.026 1.97-.024h.44c.53 0 1.42 0 1.968.024a1.65 1.65 0 011.729 1.447c.18 1.045.44 1.326 1.125 1.547a14.105 14.105 0 003.315.764c.945 0 1.1-2.292 1.1-2.292.009-2.993-7.447-3.816-8.431-3.816"/></svg>'+
                                                    '</button>'+
                                                '</div>'+
                                            '</div>'+
                                            '<div id="call-prompt" style="display: none;" class="promptMessage agent-message">When prompted, please'+
                                                'allow'+
                                                'access to your camera and microphone.'+
                                            '</div>'+
                                            '<div id="servicepattern-chat">'+
                                                '<div id="scrollbar-container">'+
                                                    '<div id="messages-div" class="viewport">'+
                                                        '<div id="messages-div-outer" class="ps-container">'+
                                                            '<div id="messages-div-inner" class="overview messages-div-inner"'+
                                                                 'style="bottom: 0px; top: auto;">'+
                                                                '<div class="new-msg-container agentMessage new-msg-animate agent-message">'+
                                                                    '<div class="pip agent-message base-font"></div>'+
                                                                    '<div class="new-msg-body agentMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text" style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner base-font">Please wait while we'+
                                                                                    ' are '+
                                                                                    'looking for an available representative...'+
                                                                                '</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div id=""'+
                                                                     'class="new-msg-container agentMessage new-msg-animate agent-message">'+
                                                                    '<div class="new-msg-body agentMessage">'+
                                                                        '<div class="pip agent-message base-font"></div>'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner base-font">Representative found. Connecting...'+
                                                                                '</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner agentJoinedMessage"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span>'+
                                                                                '</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container clientMessage new-msg-animate main-background-color">'+
                                                                    '<div class="pip main-background-color second-color"></div>'+
                                                                    '<div class="new-msg-body clientMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner second-color">User message</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container agentMessage new-msg-animate agent-message">'+
                                                                    '<div class="pip agent-message base-font"></div>'+
                                                                    '<div class="new-msg-body agentMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="agent-image-wrapper">' +
                                                                                    '<div class="agent-image-background-filler main-background-color"></div>'+
                                                                                    '<div class="agentImage previewAgentImage" style="background:url(' + chatPath + 'images/man-with-glasses.jpg) center center no-repeat/contain"></div>'+
                                                                                '</div>'+
                                                                                '<div class="new-msg-text-inner base-font">Agent message</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner inactivityWarningText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner inactivityTimeoutText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner agentLeftText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner sessionEndedText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div id="messages-div-inner-clear"></div>'+
                                                            '</div>'+
                                                            '<div class="ps-scrollbar-x-rail" style="left: 0px; bottom: 3px;">'+
                                                                '<div class="ps-scrollbar-x" style="left: 0px; width: 0px;"></div>'+
                                                            '</div>'+
                                                            '<div class="ps-scrollbar-y-rail" style="top: 0px; right: 0px;">'+
                                                                '<div class="ps-scrollbar-y" style="top: 0px; height: 0px;"></div>'+
                                                            '</div>'+
                                                        '</div>'+
                                                        '<div id="agent-typing" style="display: none;">'+
                                                            '<div class="agent-typing-wrapper"></div>'+
                                                        '</div>'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div id="input-div" class="chat-body__input agent-message">'+
                                            '<div class="input-div-table">'+
                                                '<div class="td-textarea">'+
                                                    '<textarea id="input-field" data-emoji-input="unicode" data-emojiable="true" rows="1" name="input-field" maxlength="1000" placeholder="' + i18n.hintMessageTextBox + '" autocomplete="off" style="resize: none;"></textarea>'+
                                                '</div>'+
                                                '<i class="emoji-picker-icon emoji-picker fa fa-smile-o" data-type="picker"></i>'+
                                                '<div id="attachFile" class="preview"></div>'+
                                                '<div class="td-button">'+
                                                    '<input id="input-button" type="button" value="Send" class="servicepatternBtn accept">'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                                '<form name="file-upload-form" id="file-upload-form" target="_blank" method="post" enctype="multipart/form-data" style="display:none;"></form>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
                '<div class="sp-callback-form" id="sp-callback-form" class="sp-callback-form">'+
                   '<div class="fields">'+
                       '<label>Request a callback</label>'+
                       '<input type="text" id="sp-callback-test" placeholder="test" />'+
                       '<label>test</label>'+
                   '</div>'+
                   '<button id="sp-callback-submit">Chat</button>'+
                   '<button id="sp-callback-submit">Call</button>'+
                '</div>'+
            '</div>'+
        '</div>'
    );
};
var chatPreview = function () {
    var helpers = constructorHelpers();

    if (window.addEventListener) {
        window.addEventListener("message", helpers.listener);
    } else {
        window.attachEvent("onmessage", helpers.listener);
    }

    (function() {
        helpers.showChat();
    })();
};
var chatSnippet = function () {
    setTimeout(function() {
        if(widgetConfiguration.isPreviewMode()) {
            chatPreview();
        }
        snippetBuild();
    });
};
var snippetBuild = function () {
    if (widgetConfiguration.isPreviewMode()) {
        snippetOnInitialize();
    } else {
        var config = snippetVariables();
        if (config.SP.tenantUrl && config.SP.appId) {
            // $ = jQuery.noConflict(true);
            // config.SP.$ = $;
            // $.support.cors = true;
            config.SP.cp = {
                url: config.SP.apiUrl,
                crossDomain: true,
                tenantUrl: config.SP.tenantUrl,
                appId: config.SP.appId,
                clientId: 'WebChat',
                phoneNumber: config.SP.phoneNumber,
                parameters: config.SP.parameters,
                onFormShow: config.SP.onFormShow,
                onAddStream: config.SP.onAddStream,
                onAddLocalStream: config.SP.onAddLocalStream
            };
            snippetOnInitialize();
        }
    }
};
var snippetChatUrl = function (f, l, p, e) {
    var config = snippetVariables();
    var first = f ? f : encodeURIComponent(config.SP.first_name || '');
    var last = l ? l : encodeURIComponent(config.SP.last_name || '');
    var phone = p ? p : encodeURIComponent(config.SP.phone_number || '');
    var email = e ? e : encodeURIComponent(config.SP.email || '');
    var location = '';
    if (config.SP.location) {
        location += "&latitude=" + encodeURIComponent(config.SP.location.latitude + '');
        location += "&longitude=" + encodeURIComponent(config.SP.location.longitude + '');
    }
    var chatPath = widgetConfiguration.getChatPath();
    var chatHtmlName = config.SP.chatHtmlName;
    var isCobrowsingTogetherJS = widgetConfiguration.isCobrowsingTogetherJS();
    chatPath += chatHtmlName + "?"
        + "tenantUrl=" + encodeURIComponent(config.SP.tenantUrl)
        + "&appId=" + config.SP.appId
        + "&referrer=" + encodeURIComponent(window.location.href)
        + "&referrerTitle=" + encodeURIComponent(window.document.title)
        + "&webServer=" + encodeURIComponent(config.SP.apiUrl)
        + "&logging=" + encodeURIComponent(config.SP.logging || '')
        + location
        + "&phone_number=" + phone
        + "&from=" + encodeURIComponent(config.SP.from || '')
        + "&email=" + email
        + "&account_number=" + encodeURIComponent(config.SP.account_number || '')
        + "&first_name=" + first
        + "&last_name=" + last
        + "&togetherjs_enabled=" + encodeURIComponent(isCobrowsingTogetherJS || '')
        + "&autostartVideocall=" + encodeURIComponent(config.SP.autostartVideocall || '');
    if (config.SP.parameters) {
        for (var property1 in config.SP.parameters) {
            if (config.SP.parameters.hasOwnProperty(property1)) {
                chatPath += "&custom_" + property1 + "=" + encodeURIComponent(config.SP.parameters[property1] || '')
            }
        }
    }
    return chatPath;
};
var snippetCheckAddFrame = function (startSession) {
    var config = snippetVariables();

    if (!document.querySelector('#sp-chat-iframe')) {
        if (config.SP.sound_notification) {
            config.audioElement.setAttribute('src', config.SP.sound_notification_file);
            config.audioElement.load();
        }

        var definition = widgetConfiguration.getDefinition();
        var chatWidgetConfig = definition ? definition.chatWidgetStyling : {};
        var frame = document.querySelector('#sp-chat-frame');

        var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
        if (!widgetConfiguration.isMobile()) {
            if (!isChatMinimized) {
                var frameHeight = Math.min.apply(Math, [chatWidgetConfig.height, window.innerHeight - 20]);
                frame.style.height = frameHeight + 'px';
                frame.style.width = chatWidgetConfig.width + 'px';
            }
            try {
                window.parent.addEventListener('resize', go);
            } catch (e) {
                console.warn('Snippet parent page is on a different domain');
            }

            function go() {
                if (!isChatMinimized) {
                    var frameHeight = Math.min.apply(Math, [chatWidgetConfig.height, window.innerHeight - 20]);
                    frame.style.height = frameHeight + 'px';
                }
            }

        } else if (!isChatMinimized) {
            frame.style.height = '100%';
            frame.style.width = '100%';
        }

        var url = startSession ? snippetChatUrl(startSession.session.cp.parameters.first_name, startSession.session.cp.parameters.last_name, startSession.session.cp.phone_number, startSession.session.cp.parameters.email) : snippetChatUrl();

        var start = startSession ? '&start=' + startSession.session.sessionId : '';
        var chatMinimized = sessionStorage.getItem('bp-minimized');
        var styles = '';
        if (chatMinimized === 'true') {
            styles = ' style="box-shadow:none;background:none;" ';
        }
        var html = "<iframe lang='en-US' title='Chat widget' id='sp-chat-iframe' " + styles + 
            "allow='camera; microphone' class='widget-border-radius dialog-shadow' frameborder='0' scrolling='no' src=" + url + start + "></iframe>";
        var container = document.querySelector('#sp-iframe-container');
        container.insertAdjacentHTML('beforeend', html);
    }
};

var snippetCheckAvailability = function (needToHandleAvailability) {

    var cachedConfUrl = sessionStorage.getItem('cachedConfUrl');
    var cachedConf = widgetConfiguration.getParams();

    function whenConfigLoaded() {
        showSnippet();
        loadCobrowsingSolution();
        availabilityRequest();
    }

    if (cachedConfUrl && chatCompareUrl(cachedConfUrl) && cachedConf) {
        whenConfigLoaded();
    } else {
        return sendRequestToClientWebserver('configuration', function (xmlhttp) {
            sessionStorage.setItem('confParams', xmlhttp.responseText);
            whenConfigLoaded();
        });
    }

    function availabilityRequest() {
        return sendRequestToClientWebserver('availability', function (xmlhttp) {
            var available = JSON.parse(xmlhttp.responseText).chat === 'available';
            var ewt = JSON.parse(xmlhttp.responseText).ewt || "0";
            sessionStorage.setItem('serviceAvailable', available);
            sessionStorage.setItem('ewt', ewt);
            needToHandleAvailability && snippetHandleAvailability(available);
        });
    }

    function showSnippet() {
        var styling = widgetConfiguration.getDefinitionStyling();
        var isRoundButton = styling.tabStyle === 'round';
        if (isRoundButton) {
            document.querySelector('#sp-chat-widget .sp-round-button').style.display = '';
        } else {
            document.querySelector('#sp-chat-widget .sp-chat-widget__content').style.display = '';
        }
    }

    function sendRequestToClientWebserver(resource, callback) {
        var url = SERVICE_PATTERN_CHAT_CONFIG.apiUrl + '/' + resource
            + '?tenantUrl=' + encodeURIComponent(SERVICE_PATTERN_CHAT_CONFIG.tenantUrl)
            + '&domain=' + encodeURIComponent(window.location.host)
            + '&appId=' + encodeURIComponent(SERVICE_PATTERN_CHAT_CONFIG.appId);

        // Special case for TTEC customer
        if (window._bpattern_domainParam) {
            url += '&domain=' + encodeURIComponent(window.location.host);
        }

        var xmlhttp;
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                callback(xmlhttp);
            }
        };

        xmlhttp.withCredentials = true;
        xmlhttp.crossDomain = true;
        xmlhttp.open("GET", url, true);
        xmlhttp.setRequestHeader('Authorization', 'MOBILE-API-140-327-PLAIN appId="' + SERVICE_PATTERN_CHAT_CONFIG.appId + '", clientId="' + SERVICE_PATTERN_CHAT_CONFIG.clientId + '"');

        xmlhttp.send();
        return xmlhttp.onreadystatechange();
    }

};
var snippetCheckDeviceSupport = function () {
    navigator.enumerateDevices = (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) ? function(cb) {navigator.mediaDevices.enumerateDevices().then(cb)} : navigator.enumerateDevices;

    var f = (typeof MediaStreamTrack !== 'undefined' && 'getSources' in MediaStreamTrack) ? true : (navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices) ? true : false;

    var handleErrors = function(cam, mic) {
        if(!cam){ $('#call-prompt .error.camera').show() } else { $('#call-prompt .error.camera').hide() }
        if(!mic){ $('#call-prompt .error.microphone').show() } else { $('#call-prompt .error.microphone').hide() }
        return;
    }

    var dev = new Array(), mic = false, micFlag = false, speaker = false, speakerFlag = false, cam = false, camFlag = false;

    if (!f) { return }

    if (!navigator.enumerateDevices) {
        handleErrors (cam, mic);
    } else {
        navigator.enumerateDevices = (!navigator.enumerateDevices && window.MediaStreamTrack && window.MediaStreamTrack.getSources) ?
            navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(window.MediaStreamTrack) :
            (!navigator.enumerateDevices && navigator.enumerateDevices) ?
                navigator.enumerateDevices = navigator.enumerateDevices.bind(navigator) :
                navigator.enumerateDevices;
    }

    navigator.enumerateDevices(function(elements) {
        elements.forEach(function(props) {

            dev.forEach(function(d) {
                if (d.id === props.id && d.kind === props.kind) { return }
            });

            props.deviceId = (!props.deviceId) ? props.id : props.deviceId;
            props.id = (!props.id) ? props.deviceId : props.id;

            switch (props.kind) {
                case 'audio':
                    props.kind = 'audioinput';
                case 'video':
                    props.kind = 'videoinput';
                case 'videoinput':
                    cam = true;
                    camFlag = (!camFlag) ? true : false;
                    break;
                case 'audioinput':
                    mic = true;
                    micFlag = (!micFlag) ? true : false;
                    break;
                case 'audiooutput':
                    speaker = true;
                    break;
            }

            dev.push(props);
        });

        handleErrors(cam, mic);
    });
};

window.cobrowsingSolution = null;

var loadCobrowsingSolution = function () {

    var surflyWidgetKey = widgetConfiguration.getSurflyWidgetKey();
    if (surflyWidgetKey) {
        // Surfly is active
        var surflySnippetScript = document.createElement('script');
        surflySnippetScript.innerHTML = "(function(s,u,r,f,l,y){s[f]=s[f]||{init:function(){s[f].q=arguments}};" +
            "l=u.createElement(r);y=u.getElementsByTagName(r)[0];l.async=1;" +
            "l.src='https://surfly.com/surfly.js';y.parentNode.insertBefore(l,y);})" +
            "(window,document,'script','Surfly');";
        document.body.appendChild(surflySnippetScript);
        window.cobrowsingSolution = snippetSurfly;
        window.cobrowsingSolution.init(surflyWidgetKey, function() {
            if (sessionStorage.getItem('bp-cobrowsing-dialog')) {
                window.cobrowsingSolution.askToStart();
            }
        });

    } else if (widgetConfiguration.isCobrowsingTogetherJS()) {
        // TogetherJS is active
        loadScripts([
            'build/togetherjs/togetherjs.js'
        ], function () {
            window.cobrowsingSolution = snippetTogetherJs;
            window.cobrowsingSolution.init();
        });
    }

};

var removeCobrowsingPopup = function () {
    var bgOverlay = document.getElementById('bp_surfly_overlay');
    if (bgOverlay) {
        document.body.removeChild(bgOverlay);
    }
    sessionStorage.removeItem('bp-cobrowsing-dialog');
}

var showCobrowsingStartPopup = function (onAccept, onReject) {

    var i18n = clientChatUiI18n();
    var title = i18n.cobrowsingDialogHeader;
    var content = i18n.cobrowsingDialogText;
    var accept = i18n.cobrowsingDialogAcceptLabel;
    var cancel = i18n.cobrowsingDialogCancelLabel;

    if (content === 'disable' && onAccept) {
        onAccept();
    }

    var popupHtml = '<div id="bp_surfly_overlay" class="bp-surfly-overlay">' +
        '<div class="bp-surfly-popup" >' +
            '<div class="bp-surfly-title">' + title + '</div>' +
            '<div class="bp-surfly-body">' +
                '<p class="bp-surfly-content">' + content + '</p>' +
                '<div class="bp-surfly-buttons">' +
                    '<button id="bp_surfly_cancel" class="bp-surfly-cancel">' + cancel + '</button>' +
                    '<button id="bp_surfly_accept" class="bp-surfly-accept">' + accept + '</button>' + 
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';

    var bgOverlay = document.getElementById('bp_surfly_overlay');
    if (bgOverlay) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', popupHtml);
    sessionStorage.setItem('bp-cobrowsing-dialog', 'true');

    setTimeout(function setHandlers() {
        var cancelButton = document.getElementById('bp_surfly_cancel');
        var acceptButton = document.getElementById('bp_surfly_accept');

        cancelButton.onclick = function() {
            removeCobrowsingPopup();
            if (onReject) {
                onReject();
            }
        };
        acceptButton.onclick = function() {
            removeCobrowsingPopup();
            if (onAccept) {
                onAccept();
            }
        };
    });
}
var snippetConfigurationSnippet = function (config, styles) {
    var previewMode = widgetConfiguration.isPreviewMode();
    var helper = snippetHelperFunctions();

    updateChatStyles(config, styles);

    var container = document.querySelector('#sp-root-container'),
        widget = document.querySelector('#sp-chat-widget'),
        fake = document.querySelector('#sp-chat-fake'),
        frame = document.querySelector('#sp-chat-frame'),
        proactiveOffers = document.querySelectorAll('.proactive-offer'),
        labelText = document.querySelector('#sp-chat-label-text'),
        roundButton = document.querySelector('.sp-round-button'),
        labelIcon = document.querySelector('#sp-chat-label-icon'),
        closeIcon = document.querySelector('#sp-close-frame'),
        dragHandle = document.querySelector('#sp-drag-handle'),
        minTab = document.querySelector('#sp-min-tab-wrapper'),
        definition = widgetConfiguration.getDefinition();

    function addElementClasses(element, orientation) {
        element.removeAttribute('class');
        helper.addClass(element, 'position_' + config.contactTab.location);
        if (commonUtilService.isDefined(orientation)) {
            helper.addClass(element, orientation);
        }
    }

    if (definition && definition.chatWidgetStyling && definition.chatWidgetStyling.showAgentPic === 'none') {
        helper.addClass(closeIcon, 'narrow');
        helper.addClass(dragHandle, 'narrow');
    }

    if (container) helper.show(container);

    if (config && config.contactTab) {
        var text;
        var icon = config.contactTab.iconUrl || '';
        var isChatStyling = previewMode && (config.widgetType === "chat_styling");
        var orientation = widgetConfiguration.getOrientation();
        if (widget) addElementClasses(widget, orientation);
        if (fake) addElementClasses(fake, orientation);
        if (!isChatStyling && frame) addElementClasses(frame, orientation);
        if (minTab) addElementClasses(minTab, orientation);
        config.contactTab.location.split('_').forEach(function (item, i) {
            if (widget) helper.addClass(widget, item + "_" + i);
            if (fake) helper.addClass(fake, item + "_" + i);
            if (!isChatStyling && frame) helper.addClass(frame, item + "_" + i);
            if (minTab) helper.addClass(minTab, item + "_" + i);
        });

        if (commonUtilService.isServiceAvailable()) {
            text = config.contactTab.agentsAvailableMsg ? config.contactTab.agentsAvailableMsg : "";
            if (!previewMode) {
                [].forEach.call(proactiveOffers, function (proactiveOffer) {
                    proactiveOffer.setAttribute("style", "display:block")
                });
            }
        } else {
            text = config.contactTab.outOfHoursMsg ? config.contactTab.outOfHoursMsg : "";
        }

        if (definition && definition.chatWidgetStyling) {
            if (definition.chatWidgetStyling.tabStyle === 'round') {
                helper.addClass(minTab, 'use-round-button');
            } else {
                helper.addClass(minTab, 'use-default-styling');
            }
        }

        if (labelText) {
            labelText.innerHTML = text || '';
            roundButton.setAttribute('title', text || '');
        }

        if (!labelIcon) {
            helper.addClass(labelIcon, 'collapse');
        } else {
            labelIcon.style.cssText = (icon.length > 0) ? 'width: 28px;margin: 6px 10px;background:url("' + icon + '") center center no-repeat' : '';
        }
    } else {
        if (widget) helper.hide(widget);
    }

};
var snippetDraggable = function () {
    var selected = null,
        x_pos = 0, y_pos = 0,
        x_elem = 0, y_elem = 0;

    function _drag_init(elem, handler) {
        selected = elem;
        x_elem = x_pos - selected.offsetLeft;
        y_elem = y_pos - selected.offsetTop;
    }

    function _move_elem(e) {
        x_pos = document.all ? window.event.clientX : e.pageX;
        y_pos = document.all ? window.event.clientY : e.pageY;
        w = window.innerWidth;
        h = window.innerHeight;
        if (selected !== null) {
            ew = selected.offsetWidth;
            eh = handler.offsetHeight;
            var eLeft = x_pos - x_elem,
                eTop = y_pos - y_elem,
                leftBorder = 1,
                topBorder = 1,
                bottomBorder = h - eh,
                rightBorder = w - ew;

            eTop = (eTop > bottomBorder) ? bottomBorder : eTop;
            eTop = (eTop < topBorder) ? topBorder: eTop;
            eLeft = (eLeft > rightBorder) ? rightBorder : eLeft;
            eLeft = (eLeft < leftBorder) ? leftBorder : eLeft;

            eLeft = eLeft + 'px';
            eTop = eTop + 'px';

            selected.style.left = eLeft;
            selected.style.top = eTop;
            sessionStorage.setItem('chatLeft', eLeft);
            sessionStorage.setItem('chatTop', eTop);
        }
    }

    function _destroy() {
        selected = null;
    }

    var target = document.querySelector('[data-draggable]');
    var handler = document.getElementById(target.getAttribute('data-draggable'));

    handler.onmousedown = function () {
        _drag_init(target, handler);
        return false;
    };

    document.onmousemove = _move_elem;
    document.onmouseup = _destroy;
};
var snippetHandleAvailability = function (available) {
    var spChatWidget = document.querySelector('#sp-chat-widget');
    var spCallbackForm = document.querySelector('#sp-callback-form');
    var spConf = SERVICE_PATTERN_CHAT_CONFIG;

    window.addEventListener("message", function (event) {
        var data = event.data;
        if (data === 'getTabName') {
            openPreChatTab();
        }
        if (data === 'getServicePatternChatConfig') {
            postServicePatternChatConfig();
        }
    }, false);

    function postServicePatternChatConfig() {
        var chatFrame = document.getElementById('sp-chat-iframe');
        if (chatFrame) {
            // NOTE: All callbacks will be removed here from SERVICE_PATTERN_CHAT_CONFIG. Do not use them inside an iframe.
            chatFrame.contentWindow.postMessage({
                eventName: 'setServicePatternChatConfig',
                params: {servicePatternChatConfig: JSON.parse(JSON.stringify(SERVICE_PATTERN_CHAT_CONFIG))}
            }, "*");
        }
    }

    function openPreChatTab() {
        var chatFrame = document.getElementById('sp-chat-iframe');
        var ev = (sessionStorage.getItem("tab") === 'call') ? 'showCallTab' : 'showChatTab';
        var sessionTab = sessionStorage.getItem("tab");
        if (sessionTab === 'call') {
            ev = 'showCallTab'
        } else if (sessionTab === 'chat') {
            ev = 'showChatTab'
        } else {
            ev = 'showDefaultTab'
        }
        if (chatFrame) {
            chatFrame.contentWindow.postMessage(ev, '*');
        }
    }

    function showWarning(definition, itemProp, targetProp) {
        if (definition && definition[itemProp].length === 0) {
            console.warn('No contact tab configuration for: ' + itemProp);
        } else if (commonUtilService.isUndefined(target[targetProp].widgetIndex)) {
            console.warn('No contact tab configuration assigned for the current URL');
        }
    }

    function updateContactTabVisibility() {
        var contactTab = snippetConfig.contactTab;
        var threshold = contactTab.ewtThreshold;
        if (contactTab.enabled
            && (!contactTab.doNotShowAfterHours || commonUtilService.isServiceAvailable())
            && (!contactTab.doNotShowAfterEWTThreshold || !commonUtilService.isEWTExceedThreshold(threshold))
        ) {
            spChatWidget.removeAttribute('data-hidden');
        }
    }

    function updateChatOnlineState() {
        var eventsCallback = spConf.callbacks;
        var isAvailable = commonUtilService.isServiceAvailable();
        var isNotAvailable = commonUtilService.isServiceNotAvailable();
        if (eventsCallback && eventsCallback.weAreOnline) {
            if (isAvailable === 'true') eventsCallback.weAreOnline();
            if (isNotAvailable === 'false') eventsCallback.weAreOffline();
        }
    }

    if (!widgetConfiguration.isPreviewMode()) {

        var confObj = widgetConfiguration.getObject(),
            target = widgetConfiguration.getTarget(),
            definition = widgetConfiguration.getDefinition(),
            snippetConfig = widgetConfiguration.getSnippet(),
            snippetIndex = widgetConfiguration.getSnippetIndex(),
            offerIndex = widgetConfiguration.getProactiveOfferIndex(),
            eventsCallback = spConf.callbacks,
            util = commonUtilService;

        if (document.querySelectorAll('#sp-callback-form.sp-callback-form').length === 0 && definition) {
            showWarning(definition, 'chatInitiations', 'chatInitiation');
        }

        if (util.isDefined(snippetIndex) || util.isDefined(offerIndex)) {

            snippetConfig && updateContactTabVisibility();
            updateChatOnlineState();

            if (definition && definition.chatWidgetStyling.webNotificationsEnabled === false) {
                window.localStorage.setItem('doNotShowNotifications', 'true');
            } else {
                window.localStorage.removeItem('doNotShowNotifications');
            }

            proactiveOfferService.buildProactiveOffer(openPreChatTab);

            if (spConf.hidden && !sessionStorage.getItem("sp-chat-snippet")) {
                return;
            }

            snippetConfigurationSnippet(snippetConfig, confObj.styles);

            if (snippetConfig) {
                spChatWidget.style.display = "block";
                spChatWidget.style.cursor = "pointer";
                if (spConf.autostartChat && !sessionStorage.getItem("sp-chat-snippet")) {
                    setTimeout(function () {
                        sessionStorage.setItem('source', 'widget');
                        snippetOpenChat(true);
                        proactiveOfferService.removeProactiveOffer();
                    }, 500);
                }
            }

            spChatWidget.addEventListener('click', function () {
                sessionStorage.setItem('source', 'widget');
                var chatIframe = document.getElementById('sp-chat-iframe');
                if (chatIframe && chatIframe.contentWindow) {
                    chatIframe.contentWindow.postMessage('bp-request-minimize-off', '*');
                }
                snippetOpenChat(true);
                proactiveOfferService.removeProactiveOffer();
                if (eventsCallback && eventsCallback.reactiveChatButtonClicked) {
                    eventsCallback.reactiveChatButtonClicked();
                }
            });
        }

        if (spCallbackForm) {
            spCallbackForm.style.display = "inline-block";
        }

        var spOfflineLabel = document.querySelector('#sp-offline-label');
        var spOnlineLabel = document.querySelector('#sp-online-label');
        if (spOfflineLabel) spOfflineLabel.style.display = available ? "none" : "block";
        if (spOnlineLabel) spOnlineLabel.style.display = available ? "block" : "none";

        if (sessionStorage.getItem("sp-chat-snippet")) {
            snippetOpenChat(true);
        }
    }
};
var snippetHelperFunctions = function () {
    return {

        hasClass: function(el, className) {
            if (el.classList)
                return el.classList.contains(className)
            else
                return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
        },

        addClass: function(el, className) {
            if (el.classList)
                el.classList.add(className)
            else if (!hasClass(el, className)) el.className += " " + className
        },

        removeClass: function(el, className) {
            if (el.classList)
                el.classList.remove(className)
            else if (hasClass(el, className)) {
                var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
                el.className = el.className.replace(reg, ' ')
            }
        },

        getRealDisplay: function(elem) {
            if (elem.currentStyle) {
                return elem.currentStyle.display
            } else if (window.getComputedStyle) {
                var computedStyle = window.getComputedStyle(elem, null)
                return computedStyle.getPropertyValue('display')
            }
        },

        hide: function(el) {
            if (!el.getAttribute('displayOld')) {
                el.setAttribute("displayOld", el.style.display)
            }
            el.style.display = "none"
        },

        isHidden: function(el) {
            var width = el.offsetWidth,
                height = el.offsetHeight,
                tr = el.nodeName.toLowerCase() === "tr"
            return width === 0 && height === 0 && !tr ?
                true : width > 0 && height > 0 && !tr ? false : this.getRealDisplay(el)
        },

        toggle: function(el) {
            this.isHidden(el) ? this.show(el) : this.hide(el)
        },

        show: function(el) {
            var displayCache = {}
            if (this.getRealDisplay(el) != 'none') return
            var old = el.getAttribute("displayOld");
            el.style.display = old || "";
            if (this.getRealDisplay(el) === "none") {
                var nodeName = el.nodeName,
                    body = document.body,
                    display
                if (displayCache[nodeName]) {
                    display = displayCache[nodeName]
                } else {
                    var testElem = document.createElement(nodeName)
                    body.appendChild(testElem)
                    display = this.getRealDisplay(testElem)
                    if (display === "none") {
                        display = "block"
                    }
                    body.removeChild(testElem)
                    displayCache[nodeName] = display
                }
                el.setAttribute('displayOld', display)
                el.style.display = display
            }
        },

    }
};
var snippetKeepOpenedState = function (opened) {
    if (opened) {
        sessionStorage.setItem("sp-chat-snippet", "true");
    } else {
        sessionStorage.removeItem("sp-chat-snippet");
    }
};
var snippetOnInitialize = function () {
    var variables = snippetVariables();
    var helper = snippetHelperFunctions();
    var head = document.querySelector('head');
    var body = document.querySelector('body');
    var spConfig = SERVICE_PATTERN_CHAT_CONFIG;
    var i18n = clientChatUiI18n();

    function loadCss(target, fileNames) {
        var chatPath = widgetConfiguration.getChatPath();
        if (Array.isArray(fileNames)) {
            fileNames.forEach(function (fileName) {
                target.insertAdjacentHTML('beforeend', "<link href='" + chatPath + "css/" + fileName + ".css' type='text/css' rel='stylesheet' />");
            });
        }
    }

    function initializePreview() {
        window.parent.postMessage("initialization", "*");
        var code = constructorPreviewCode();
        var spChatWidget = document.getElementById('sp-chat-widget');
        loadCss(head, ['wrong', 'override', 'preview', 'proactive-offer', 'snippet']);
        body.insertAdjacentHTML('beforeend', code);
        if (spChatWidget) {
            spChatWidget.setAttribute("style", "");
        }
    }

    function startMinimized() {
        sessionStorage.setItem('bp-minimized', true);
        var spChatIframe = document.getElementById('sp-chat-iframe'),
            spDragHandle = document.getElementById('sp-drag-handle'),
            spSideBar = document.getElementById('sp-side-bar'),
            spChatFrame = document.getElementById('sp-chat-frame');
        if (spChatIframe) {
            spChatIframe.style.boxShadow = 'none';
            spChatIframe.style.background = 'none';
        }
        spDragHandle.style.display = 'none';
        spSideBar.style.display = 'none';
        spChatFrame.style.removeProperty('left');
        spChatFrame.style.removeProperty('top');
    }

    function stopMinimized() {
        sessionStorage.removeItem('bp-minimized');
        var spChatIframe = document.getElementById('sp-chat-iframe'),
            spIframeContainer = document.getElementById('sp-iframe-container'),
            spDragHandle = document.getElementById('sp-drag-handle'),
            spSideBar = document.getElementById('sp-side-bar'),
            spChatFrame = document.getElementById('sp-chat-frame'),
            spMinTab = document.getElementById('sp-min-tab-wrapper'),
            chatWidgetStyling = widgetConfiguration.getDefinitionStyling();

        if (spMinTab) {
            helper.removeClass(spMinTab, 'show');
        }

        if (spIframeContainer) {
            for (var i = 0; i < spIframeContainer.classList.length; ++i) {
                if (spIframeContainer.classList[i].substr(0, 4) === 'min-') {
                    spIframeContainer.classList.remove(spIframeContainer.classList[i]);
                    break;
                }
            }
        }
        if (spChatIframe) {
            spChatIframe.style.removeProperty('box-shadow');
            spChatIframe.style.removeProperty('background');
        }
        if (spDragHandle) {
            spDragHandle.style.removeProperty('display');
        }
        if (spSideBar) {
            spSideBar.style.removeProperty('display');
        }
        if (spChatFrame) {
            spChatFrame.style.left = sessionStorage.getItem('chatLeft');
            spChatFrame.style.top = sessionStorage.getItem('chatTop');
            if (widgetConfiguration.isMobile()) {
                spChatFrame.style.height = '100%';
                spChatFrame.style.width = '100%';
            } else {
                var frameHeight = Math.min.apply(Math, [chatWidgetStyling.height, window.innerHeight - 20]);
                spChatFrame.style.height = frameHeight + 'px';
                spChatFrame.style.width = chatWidgetStyling.width + 'px';
            }
        }
    }

    function setSnippetHtml() {
        loadCss(head, ['snippet']);
        body.insertAdjacentHTML('beforeend', getSnippetHtml());
    }

    function areWeOnSharedDomain() {
        var sharedDomains = spConfig.sharedDomains || spConfig.sharedHistoryDomains;
        var currentDomainIsFromShared = false;
        if (sharedDomains && sharedDomains.length) {
            for (var i = 0; i < sharedDomains.length; ++i) {
                var domainSuffix = (
                        (sharedDomains[i].length && (sharedDomains[i][0] === '.' || sharedDomains[i] === location.hostname)) ? '' : '.'
                    ) + sharedDomains[i];
                if (
                    location.hostname.length >= domainSuffix.length &&
                    location.hostname.substring(location.hostname.length - domainSuffix.length) === domainSuffix
                ) {
                    currentDomainIsFromShared = true;
                    break;
                }
            }
        }
        return currentDomainIsFromShared
    }

    function initializeSnippet() {
        window.addEventListener("message", receiveMessage, false);
        snippetDraggable();
        var chatMinimized = sessionStorage.getItem('bp-minimized');
        if (chatMinimized === 'true') {
            startMinimized();
        } else {
            var spChatFrame = document.querySelector('#sp-chat-frame');
            if (sessionStorage.getItem('chatLeft')) {
                spChatFrame.style.left = sessionStorage.getItem('chatLeft');
            }
            if (sessionStorage.getItem('chatTop')) {
                spChatFrame.style.top = sessionStorage.getItem('chatTop');
            }
        }
        setVisibilityListener(onVisibilityChange, safeWrap);
        // set the initial state (but only if browser supports the Page Visibility API)
        if (commonUtilService.isDefined(document["hidden"])) {
            onVisibilityChange({ type: document["hidden"] ? "blur" : "focus" });
        }
        spConfig.hidden = spConfig.hidden || window.localStorage.getItem("bp-bc") != null;

        function then() {
            snippetCheckAvailability(true);
            setCloseFrameListeners();
            setMinimizedTabListeners();
            var closeButton = document.getElementById('sp-close-frame');
            closeButton.setAttribute('title', i18n.endChatTooltip);
        }
        if (areWeOnSharedDomain()) {
            restoreSessionIfItExists(then);
        } else {
            then();
        }
    }

    function getSnippetHtml() {
        var isMobile = (widgetConfiguration.isMobile()) ? 'mobile-version' : 'desktop-version';
        return (
            "<div style='display:none' id='sp-root-container' class='" + isMobile + "'>" +
                "<div id='sp-chat-widget' data-hidden='hidden'> " +
                    "<div class='sp-round-button main-background-color second-fill-color' style='display:none' tabindex='100'>" +
                        "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 74 74'><path transform='scale(1.3) translate(15 15)' d='M14,2C7.458,2,2,6.769,2,12.8S7.458,23.6,14,23.6c.415,0,.8-.083,1.2-.122v3.834l1.849-1.186c2.595-1.665,8.213-5.988,8.883-12.192A9.906,9.906,0,0,0,26,12.8C26,6.769,20.542,2,14,2Zm0,2.4c5.389,0,9.6,3.828,9.6,8.4a7.5,7.5,0,0,1-.052.867v0l0,0c-.415,3.841-3.489,6.857-5.946,8.824V20.687l-1.437.291A10.918,10.918,0,0,1,14,21.2c-5.389,0-9.6-3.828-9.6-8.4S8.611,4.4,14,4.4Z'/></svg>" +
                    "</div>" +
                    "<div class='sp-chat-widget__content main-background-color contact-tab-border' style='display:none' tabindex='100'>" +
                        "<div id='sp-chat-label-icon'></div>" +
                        "<div id='sp-chat-label-text' class='base-font contact-tab-font second-color'></div>" +
                    "</div>" +
                "</div>" +
                "<div id='sp-chat-fake'></div>" +
                "<div id='sp-chat-frame' data-draggable='sp-drag-handle'>" +
                    "<div id='sp-drag-handle'></div>" +
                    "<div id='sp-side-bar'>" +
                        "<div id='sp-close-frame' role='button' aria-label='Close' tabindex='2' class='close-icon'><svg class='main-path-color' xmlns='http://www.w3.org/2000/svg' width='15' height='15'><path clip-rule='evenodd' d='M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z' /></svg></div>" +
                    "</div>" +
                    "<div id='sp-iframe-container'></div>" +
                "</div>" +
                "<div id='sp-min-tab-wrapper'>" +
                    "<div class='sp-min-tab sp-round-button main-background-color second-fill-color' title='Show chat'>" +
                        "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 74 74'><path transform='scale(1.3) translate(15 15)' d='M14,2C7.458,2,2,6.769,2,12.8S7.458,23.6,14,23.6c.415,0,.8-.083,1.2-.122v3.834l1.849-1.186c2.595-1.665,8.213-5.988,8.883-12.192A9.906,9.906,0,0,0,26,12.8C26,6.769,20.542,2,14,2Zm0,2.4c5.389,0,9.6,3.828,9.6,8.4a7.5,7.5,0,0,1-.052.867v0l0,0c-.415,3.841-3.489,6.857-5.946,8.824V20.687l-1.437.291A10.918,10.918,0,0,1,14,21.2c-5.389,0-9.6-3.828-9.6-8.4S8.611,4.4,14,4.4Z'/></svg>" +
                    "</div>" +
                    "<div class='sp-min-tab min-chat-tab main-background-color'>" +
                        "<div class='min-tab-content' title='Show chat'>" +
                            "<div id='min_agent_image' class='min-agent-image'></div>" +
                            "<div id='min_agent_name' class='min-agent-name second-color title-font'></div>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
            "</div>"
        );
    }

    function safeWrap(func, callback) {
        if (func) {
            if (commonUtilService.isDefined(console))
                console.log('Snippet will wrap the site function %o', func);
            func();
        }
        callback();
    }

    function onVisibilityChange(evt) {
        var h = "sp-hidden";
        var evtMap = {
            blur: h,
            focusout: h,
            pagehide: h
        };
        evt = evt || window.event;
        var spRoot = document.getElementById('sp-root-container');
        helper.removeClass(spRoot, h);
        if (evt.type in evtMap)
            helper.addClass(spRoot, evtMap[evt.type]);
        else if (this["hidden"]) {
            helper.addClass(spRoot, h);
        }
        if (helper.hasClass(spRoot, h)) {
            var arrayLength = variables.notifications.length;
            for (var i = 0; i < arrayLength; i++) {
                variables.notifications[i].close();
            }
        }
    }

    function setVisibilityListener(callback, wrapperCallback) {
        // Standards:
        var hidden = "hidden";
        if (commonUtilService.isDefined(callback)) {
            if (hidden in document)
                document.addEventListener("visibilitychange", callback);
            else if ((hidden = "mozHidden") in document)
                document.addEventListener("mozvisibilitychange", callback);
            else if ((hidden = "webkitHidden") in document)
                document.addEventListener("webkitvisibilitychange", callback);
            else if ((hidden = "msHidden") in document)
                document.addEventListener("msvisibilitychange", callback);
            else if ("onfocusin" in document) {
                // IE 9 and lower:
                document.onfocusin = wrapperCallback(document.onfocusin, callback);
                document.onfocusout = wrapperCallback(document.onfocusout, callback);
            } else {
                // All others:
                window.onpageshow = wrapperCallback(window.onpageshow, callback);
                window.onpagehide = wrapperCallback(window.onpagehide, callback);
                window.onfocus = wrapperCallback(window.onfocus, callback);
                window.onblur = wrapperCallback(window.onblur, callback);
            }
        }
    }

    function closeFrame() {
        if (spConfig.callbacks && spConfig.callbacks.windowCloseIconClicked) {
            spConfig.callbacks.windowCloseIconClicked();
        }
        document.getElementById('sp-chat-iframe').contentWindow.postMessage("sp-disconnect", "*");
    }

    function setCloseFrameListeners() {
        var spCloseFrame = document.getElementById('sp-close-frame');
        if (spCloseFrame) {
            spCloseFrame.addEventListener("click", function () {
                closeFrame();
            });
            spCloseFrame.addEventListener("keyup", function (event) {
                if (event.keyCode === 13)
                    closeFrame();
            });
        }
    }

    function setMinimizedTabListeners() {
        var spMinTabs = document.querySelectorAll('.sp-min-tab');
        if (spMinTabs) {
            [].forEach.call(spMinTabs, function (tab) {
                if (tab) {
                    tab.addEventListener('click', function () {
                        var spChatIframe = document.getElementById('sp-chat-iframe');
                        spChatIframe.contentWindow.postMessage('bp-request-minimize-off', '*');
                    });
                    tab.addEventListener('keyup', function (event) {
                        var spChatIframe = document.getElementById('sp-chat-iframe');
                        if (event.keyCode === 13) {
                            spChatIframe.contentWindow.postMessage('bp-request-minimize-off', '*');
                        }
                    });
                }
            });
        }
    }

    function receiveMessage(event) {
        var spChatIframe = document.getElementById('sp-chat-iframe');
        var spChatFrame = document.getElementById('sp-chat-frame');
        var spMinTab = document.getElementById('sp-min-tab-wrapper');
        var data = event.data;
        if (!commonUtilService.isString(data)) return;
        var conf = widgetConfiguration.getParams(),
            snippetConfig = widgetConfiguration.getSnippet(),
            definition = widgetConfiguration.getDefinition(),
            chatWidgetStyling = widgetConfiguration.getDefinitionStyling();
        var width = 320;
        var height = 720;
        if (definition && chatWidgetStyling) {
            width = chatWidgetStyling.width;
            height = undefined;
            try {
                height = Math.min.apply(Math, [parseInt(chatWidgetStyling.height) - 10, window.parent.innerHeight - 20]);
            } catch (e) {
                height = parseInt(chatWidgetStyling.height) - 10;
            }
        }
        if (event.data == 'ready') {
            spChatIframe.contentWindow.postMessage("[parentPath]=" + window.location.pathname, "*");
            spChatIframe.contentWindow.postMessage("[parentHost]=" + window.location.host, "*");
            spChatIframe.contentWindow.postMessage("[serviceAvailable]=" + sessionStorage.getItem("serviceAvailable"), "*");
            spChatIframe.contentWindow.postMessage("[source]=" + sessionStorage.getItem("source"), "*");
            spChatIframe.contentWindow.postMessage(conf, "*");
        } else if (event.data == 'formsGenerated') {
            //***
            //***Cross-domain policy should be taken in account
            //***

            // var frame = spChatIframe.contentWindow.document.getElementById('inner-chat');
            // var getArrayFromTag = function(tagname) {
            //     return Array.prototype.slice.call(frame.getElementsByTagName(tagname));
            // }
            // var child_inputs = getArrayFromTag('input');
            // var child_textareas = getArrayFromTag ('textarea');
            // var child_selects = getArrayFromTag ('select');
            // var child_selects = getArrayFromTag ('a');
            // var field_elements = child_inputs.concat(child_textareas, child_selects);
            // var firstFocusableEl = field_elements[0];
            // var lastFocusableEl = field_elements.slice(-1)[0];
            // var KEYCODE_TAB = 9;
            //
            // window.addEventListener('keydown', function(e) {
            //     if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
            //         var isOpen = sessionStorage.getItem('sp-chat-snippet');
            //         if (e.srcElement.id!=='sp-close-frame' && isOpen){
            //             e.preventDefault();
            //             firstFocusableEl.focus();
            //         }
            //     }
            // });
            // firstFocusableEl.addEventListener('keydown', function(e) {
            //     if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
            //         if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
            //         if ( e.shiftKey ) {
            //             lastFocusableEl.focus();
            //             e.preventDefault();
            //         }
            //     }
            //     }
            // });
        } else if (data === 'sp-session-end') {
            window.setTimeout(function () {
                snippetOpenChat(false, true);
                if (window.cobrowsingSolution && window.cobrowsingSolution.isRunning()) {
                    window.cobrowsingSolution.stop();
                }
            }, 500);
            if (spConfig.returnUrl) {
                window.location.replace(spConfig.returnUrl);
            }
            if (removeCobrowsingPopup) {
                removeCobrowsingPopup();
            }
        } else if (data == 'sp-chat-init') {
            document.getElementById('sp-drag-handle').style.height = "0px";
            var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
            if (!widgetConfiguration.isMobile() && !isChatMinimized) {
                spChatFrame.style.height = height + "px";
                spChatFrame.style.width = width + "px";
            }
        } else if (data == 'sp-chat-maximize-on') {
            helper.addClass(spChatFrame, "sp-chat-frame-maximize");
        } else if (data == 'sp-chat-maximize-off') {
            helper.removeClass(spChatFrame, "sp-chat-frame-maximize");
        } else if (data == 'sp-chat-drag' && snippetConfig) {
            var location = snippetConfig.contactTab.location;
            if (location.indexOf('_top') === -1
                && location.indexOf('left_middle') === -1
                && location.indexOf('left_bottom') === -1
                && location.indexOf('right_') === -1
                && location.indexOf('top_right') === -1) {
                // $("#sp-chat-frame").css("top", Math.max(0, $(window).height() - height) + "px");
            }
        } else if (data == 'sp-session-start') {
            if (window.Notification && window.Notification.permission !== 'denied') {
                spChatIframe.contentWindow.postMessage("sp-req-notification", "*");
                window.Notification.requestPermission(function (permission) {
                    spChatIframe.contentWindow.postMessage("sp-req-notification-end", "*");
                });
            }
        } else if (data.indexOf('sp-notification') > 0) {
            var parse = JSON.parse(data);
            snippetShowNotification(parse.name, parse.msg, parse.photo);
        } else if (data.indexOf('sp-storage') > 0) {
            var store = JSON.parse(data);
            window.localStorage.setItem(store.key, store.value);
        } else if (data === 'sp-get-status-together') {
            if (window.cobrowsingSolution) {
                if (window.cobrowsingSolution.isRunning()) {
                    spChatIframe.contentWindow.postMessage("sp-started-together", "*");
                } else {
                    spChatIframe.contentWindow.postMessage("sp-stopped-together", "*");
                }
            }
        } else if (data === 'sp-pre-chat-form-cancel-button-clicked') {
            if (spConfig.callbacks && spConfig.callbacks.preChatWindowCancelButtonClicked) {
                spConfig.callbacks.preChatWindowCancelButtonClicked();
            }
        } else if (data === 'sp-pre-chat-form-phone-button-clicked') {
            if (spConfig.callbacks && spConfig.callbacks.preChatWindowPhoneButtonClicked) {
                spConfig.callbacks.preChatWindowPhoneButtonClicked();
            }
        } else if (data === 'sp-pre-chat-form-chat-button-clicked') {
            if (spConfig.callbacks && spConfig.callbacks.preChatWindowChatButtonClicked) {
                spConfig.callbacks.preChatWindowChatButtonClicked();
            }
        } else if (data === 'bp-cobrowsing-requested') {
            if (window.cobrowsingSolution) {
                window.cobrowsingSolution.askToStart();
            }
        } else if (data === 'bp-stop-cobrowsing') {
            if (window.cobrowsingSolution && window.cobrowsingSolution.isRunning()) {
                window.cobrowsingSolution.stop();
            } else if (removeCobrowsingPopup) {
                removeCobrowsingPopup();
            }
        } else if (data === 'bp-stop-cobrowsing-and-close-chat') {
            if (window.cobrowsingSolution && window.cobrowsingSolution.isRunning()) {
                snippetKeepOpenedState(false);
                window.cobrowsingSolution.stop();
            } else if (removeCobrowsingPopup) {
                removeCobrowsingPopup();
            }
        } else if (data === 'bp-start-cobrowsing' && window.cobrowsingSolution) {
            if (window.cobrowsingSolution) {
                window.cobrowsingSolution.start();
            }
        } else if (data === 'bp-start-minimized') {
            startMinimized();
        } else if (data === 'bp-stop-minimized') {
            stopMinimized();
        } else if (data === 'bp-request-max-height') {
            var frameMaxHeight = Math.min.apply(Math, [chatWidgetStyling.height, window.innerHeight - 20]);
            spChatIframe.contentWindow.postMessage(
                JSON.stringify({
                    message: 'bp-max-height',
                    height: frameMaxHeight
                }),
                '*'
            );
        } else {
            try {
                var parsed = JSON.parse(data);
                if (parsed.type === 'bp-dimensions' && !window.__bpap) {
                    if (sessionStorage.getItem('bp-minimized')) {
                        if (parsed.data.height) {
                            /** special case for min snippet without unread messages */
                            if (parsed.data.height === '0px' || parsed.data.height === '0') {
                                helper.addClass(spMinTab, 'show');
                            } else {
                                helper.removeClass(spMinTab, 'show');
                            }
                            spChatFrame.style.height = parsed.data.height;
                        }
                        if (parsed.data.width && !widgetConfiguration.isMobile()) {
                            spChatFrame.style.width = parsed.data.width;
                        }
                    }
                } else if (parsed.type === 'bp-update-agent-data') {
                    var minAgentName = document.getElementById('min_agent_name');
                    var minAgentImage = document.getElementById('min_agent_image');
                    if (parsed.data.name && minAgentName && minAgentImage) {
                        minAgentName.textContent = parsed.data.name;
                        if (parsed.data.url) {
                            minAgentImage.style.display = 'block';
                            minAgentImage.style.background = 'url(' + parsed.data.url + ') center center no-repeat';
                        } else {
                            minAgentImage.style.display = 'none';
                        }
                    }
                } else if (parsed.message === 'bp-show-close-chat-dialog') {
                    var confirm = window.confirm(parsed.text)
                    if (confirm) {
                        spChatIframe.contentWindow.postMessage('bp-close-chat-confirmed', '*');
                    }
                }
            } catch (e) { }
        }
    }

    function restoreSessionIfItExists(thenCallback) {
        var thenWasCalled = false;
        setTimeout(function () {
            if (!thenWasCalled) {
                thenCallback();
                thenWasCalled = true;
            }
        }, 1000);
        window.addEventListener('message', function tmpListener(event) {
            var data = event.data;
            var checkSessionIframe = document.getElementById('check-session-iframe');
            if (data === 'bpc-session-exists') {
                sessionStorage.setItem('sp-chat-snippet', true);
                if (checkSessionIframe) {
                    checkSessionIframe.parentElement.removeChild(checkSessionIframe);
                }
                window.removeEventListener('mesage', tmpListener);
                thenCallback();
                thenWasCalled = true;
            } else if (data === 'bpc-no-session') {
                if (checkSessionIframe) {
                    checkSessionIframe.parentElement.removeChild(checkSessionIframe);
                }
                window.removeEventListener('mesage', tmpListener);
                if (!thenWasCalled) {
                    thenCallback();
                    thenWasCalled = true;
                }
            }
        });
        var style = 'position:absolute;left:-1000px;top:-1000px;width:0;height:0;border:none';
        var url = widgetConfiguration.getChatPath() + 'check-session.html?' +
            'tenantUrl=' + encodeURIComponent(variables.SP.cp.tenantUrl) +
            '&url=' + encodeURIComponent(variables.SP.cp.url) +
            '&appId=' + encodeURIComponent(variables.SP.cp.appId) +
            '&clientId=' + encodeURIComponent(variables.SP.cp.clientId) +
            '&crossDomain=' + encodeURIComponent(variables.SP.cp.crossDomain);
        body.insertAdjacentHTML('beforeend', '' +
            '<iframe id="check-session-iframe" style="' + style + '" frameborder="0" src=' + url + '>' +
            '</iframe>'
        );
    }

    if (widgetConfiguration.isPreviewMode()) {
        initializePreview();
    } else {
        setSnippetHtml();
        initializeSnippet();
        setTimeout(function () {
            htmlUtilService.setDivHoverById('sp-close-frame', i18n.endChatTooltip);
        }, 1000);
    }
};
var snippetOpenChat = function (open, deleteIframe, startSession) {
    var variables = snippetVariables();
    var helper = snippetHelperFunctions();
    var source = sessionStorage.getItem('source');
    var spChatIframe = document.querySelector('#sp-chat-iframe');

    function updateOffset(target, width, height) {
        target.offsetWidth = width;
        target.offsetHeight = height;
    }

    if (widgetConfiguration.isMobile()) {
        var viewport = document.querySelectorAll('head meta[name="viewport"]');
        var head=document.querySelector('head');

        if(!deleteIframe) {
            if (viewport.length > 0 ){
                sessionStorage.setItem('initialViewport', viewport[0].getAttribute('content'));
                viewport[0].parentNode.removeChild(viewport[0]);
            } else {
                sessionStorage.removeItem('initialViewport');
            }
            head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=320, initial-scale=1, maximum-scale=1, user-scalable=no" />');
        } else {
            var initialViewport = sessionStorage.getItem('initialViewport')
            if(viewport.length > 0){
                viewport[0].parentNode.removeChild(viewport[0]);
            }
            if(initialViewport){
                head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="' + initialViewport + '" />');
            } else {
                head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width, initial-scale=0" />');
            }
        }
    }

    var fr=document.querySelector('#sp-chat-frame'),
        wi = document.querySelector('#sp-chat-widget'),
        fakeTo = open ? fr : wi,
        fakeFrom = open ? wi : fr,
        snippetConfig = widgetConfiguration.getSnippet();

    snippetKeepOpenedState(open);

    if (!helper.isHidden(fakeTo)) {
        if (deleteIframe) {
            spChatIframe.parentNode.removeChild(spChatIframe);
        }
        return;
    }

    if (window.localStorage.getItem("bp-bc") !== null) {
        fr.parentNode.removeChild(fr);
        return;
    }
    snippetCheckAddFrame(startSession);

    var location = 'bottom_left';
    var direction = 'horizontal';

    if (snippetConfig && snippetConfig.contactTab.location) {
        location = snippetConfig.contactTab.location;
        direction = (location.indexOf('right_') !== -1 || location.indexOf('left_') !== -1) ? "vertical" : "horizontal";
    }
    helper.toggle(fakeTo);
    helper.toggle(fakeTo);

    var fake = document.querySelector('#sp-chat-fake');

    // In order to fix Trac #30629
    var w = 0; // fakeTo.offsetWidth;
    var h = 0; // fakeTo.offsetHeight;
    if (direction === "vertical") {
        open ? updateOffset(fake, h, w) : updateOffset(fake, w, h);
    } else {
        updateOffset(fake, w, h);
    }

    if(source !== 'callbackFormCall'){
        helper.hide(fakeFrom);
    }
    helper.toggle(fake);

    // easing function
    function easeInOutExpo(x, t, b, c, d){
        if (t==0) return b;
        if (t==d) return b+c;
        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }

    // setup
    var start = new Date().getTime();
    var fromWidth = fake.offsetWidth;
    var toWidth = w;
    var fromHeight = fake.offsetHeight;
    var toHeight = h;
    var duration = 1000;

    // animation
    (function animate(){
        var now = (new Date().getTime() - start);
        var ease = easeInOutExpo(0, now, 0, 1, duration);
        fake.style.width = (fromWidth + (toWidth - fromWidth) * ease)+'px';
        fake.style.height = (fromHeight + (toHeight - fromHeight) * ease)+'px';
        if(now < duration){
            setTimeout(animate, 1000/60);
        }
    })();

    setTimeout(function(){
        if((fakeTo === wi && snippetConfig && snippetConfig.contactTab.enabled === false) || (fakeTo === wi && sessionStorage.getItem("confFromOtherPage"))) {} else {
            if(source !== 'callbackFormCall'){
                helper.toggle(fakeTo);
            }
        }
        helper.toggle(fake);
        variables.init = true;
        if (deleteIframe) {

            if(spChatIframe && spChatIframe.parentNode) {
                spChatIframe.parentNode.removeChild(spChatIframe);
            }
            sessionStorage.removeItem('source');

        } else {
            //document.getElementById('sp-chat-iframe').contentWindow.postMessage("sp-dragged", "*");
        }
    }, 400)

};
var snippetShowNotification = function (title, body, icon) {
    var config = snippetVariables();
    var doNotShowNotifications = window.localStorage.getItem('doNotShowNotifications');
    var helper = snippetHelperFunctions();

    if (doNotShowNotifications !== 'true') {
        if (window.Notification
            && window.Notification.permission === 'granted'
            && helper.hasClass(document.querySelector('#sp-root-container'), 'sp-hidden')) {
            var options = {
                body: htmlUtilService.htmlDecode(body),
                icon: icon
            };

            var n = new window.Notification(title, options);
            config.notifications.push(n);

            if (config.SP.sound_notification) {
                config.audioElement.pause();
                config.audioElement.currentTime = 0;
                config.audioElement.play().then(function () {}, function (error) {
                    console.warn(error);
                });
            }

            n.onclose = function () {
                var index = config.notifications.indexOf(n);
                if (index > -1) {
                    config.notifications.splice(index, 1);
                }
            };

            n.onclick = function (e) {
                window.focus();
            };
        }
    }
};
var snippetSurfly = (function () {

    function postMessage(text) {
        var spChatIframeElement = document.getElementById('sp-chat-iframe');
        if (spChatIframeElement) {
            spChatIframeElement.contentWindow.postMessage(text, '*');
        }
    }

    function onSessionPreEnd(session) {
        postMessage('bp-cobrowsing-ended-message');
        postMessage('bp-cobrowsing-ended');
        setTimeout(function () {
            session.end();
        }, 100);
    }

    function init(widgetKey, onInit) {
        Surfly.init(commonUtilService.merge(
            {
                widget_key: widgetKey,
                confirm_session_start: false
            },
            SERVICE_PATTERN_CHAT_CONFIG.surflySettings || {}
        ), function(initResult) {
            if (initResult.success) {
                if (!Surfly.isInsideSession) {
                    var sessionList = Surfly.listSessions();
                    for (var i = 0; i < sessionList.length; ++i) {
                        sessionList[i].on('session_pre_end', onSessionPreEnd);
                    }
                    if (onInit) {
                        onInit();
                    }
                }
            } else {
                console.error('#Origin: Surfly was unable to initialize properly.');
            }
        });
    }

    function start() {
        try {
            if (!Surfly.isInsideSession) {
                var variables = snippetVariables();
                if (!variables.TogetherJSUrlWasSent) {
                    Surfly.session()
                    .on('session_loaded', function (session) {
                        postMessage(JSON.stringify({
                            message: 'bp-cobrowsing-started',
                            provider: 'SURFLY',
                            url: session.followerLink,
                            sessionId: session._sessionId
                        }));
                    })
                    .on('session_pre_end', onSessionPreEnd)
                    .startLeader(null, {name: 'Customer'});
                }
            }
        } catch (e) {
            console.error('Surfly error: ', e);
        }
    }

    function isRunning() {
        try {
            if (!Surfly.listSessions) {
                return false;
            }

            var sessionList = Surfly.listSessions();
            var sessionStarted = false;
            for (var i = 0; i < sessionList.length; ++i) {
                if (sessionList[i].started) {
                    sessionStarted = true;
                    break;
                }
            }
            return sessionStarted;
        } catch (e) {
            console.error('Surfly error: ', e);
        }
        return false;
    }

    function stop() {
        try {
            var sessionList = Surfly.listSessions();
            for (var i = 0; i < sessionList.length; ++i) {
                if (sessionList[i].started) {
                    postMessage('bp-cobrowsing-ended');
                    var sesionToEnd = sessionList[i];
                    setTimeout(function () {
                        sesionToEnd.end();
                    }, 100);
                }
            }
        } catch (e) {
            console.error('Surfly error: ', e);
        }
    }

    function askToStart() {
        try {
            var sessionList = Surfly.listSessions();
            var sessionStarted = false;
            for (var i = 0; i < sessionList.length; ++i) {
                if (sessionList[i].started) {
                    sessionStarted = true;
                    break;
                }
            }
            if (!sessionStarted) {
                showCobrowsingStartPopup(
                    function onAccept() {
                        start();
                    },
                    function onReject() {
                        postMessage('bp-cobrowsing-rejected');
                    }
                );
            }
        } catch (e) {
            console.error('Surfly error: ', e);
        }
    }

    return {
        init: init,
        start: start,
        stop: stop,
        isRunning: isRunning,
        askToStart: askToStart
    };

})();
var snippetTogetherJs = (function () {

    function postMessage(url, togetherJSUrlWasSent) {
        var variables = snippetVariables();
        var spChatIframeElement = document.getElementById('sp-chat-iframe');
        spChatIframeElement.contentWindow.postMessage(url, "*");
        if (!commonUtilService.isUndefined(togetherJSUrlWasSent)) {
            variables.TogetherJSUrlWasSent = togetherJSUrlWasSent;
        }
    }

    function followPeers() {
        if (TogetherJS.running) {
            TogetherJS
                .require("peers")
                .getAllPeers()
                .forEach(function (p) {
                    if (!p.following) {
                        p.follow();
                    }
                });
        }
    }

    function init() {
        TogetherJSConfig_suppressJoinConfirmation = true;
        TogetherJSConfig_suppressInvite = true;
        TogetherJSConfig_disableWebRTC = true;
        sessionStorage.setItem('togetherjs.settings.seenIntroDialog', true);
        TogetherJSConfig_getUserName = function() {
            return 'Viewer';
        };
        TogetherJSConfig_on_ready = function() {
            if (TogetherJS.running && !TogetherJS.require('peers').Self.isCreator) {
                setInterval(followPeers, 5 * 1000);
            }
        };

        // Wait until togetherJs loaded it's inner scripts
        setTimeout(function () {
            if (typeof TogetherJS !== 'undefined' && !widgetConfiguration.isCobrowsingEditEnabled()) {
                TogetherJS.config('ignoreForms', true);
            }
            if (typeof TogetherJS !== 'undefined' && TogetherJS.startup && TogetherJS.startup.reason === "joined") {
                $('#sp-root-container').remove();
                $('.proactive-offer').remove();
            }
        }, 100);
    }

    function start() {
        var variables = snippetVariables();
        var url = null;
        if (!TogetherJS.running) {
            TogetherJS();
            if (!variables.TogetherJSUrlWasSent) {
                try {
                    url = TogetherJS.shareUrl();
                } catch (e) {}
                if (url === null) {
                    TogetherJS.on("ready", function onReady() {
                        url = TogetherJS.shareUrl();
                        postMessage("sp-together-url" + url, true);
                        TogetherJS.off("ready", onReady);
                    });
                } else {
                    postMessage("sp-together-url" + url, true);
                }
            }
            postMessage("sp-started-together");
        }
    }

    function isRunning() {
        return TogetherJS.running;
    }

    function stop() {
        if (TogetherJS.running) {
            TogetherJS();
            postMessage("sp-together-stop", false);
            postMessage("sp-stopped-together", false);
        }
    }

    return {
        init: init,
        start: start,
        stop: stop,
        isRunning: isRunning,
        askToStart: function () {}
    }

})();
var snippetVariables = function () {
    return {
        SP: SERVICE_PATTERN_CHAT_CONFIG || {},
        init: false,
        notifications: [],
        TogetherJSUrlWasSent: false,
        audioElement: document.createElement('audio')
    };
};
var updateChatStyles = function (currentWidget, styles) {

    function applyStyle(prefix, style, hasBase) {

        var appliedStyles = [];
        if (hasBase) {
            appliedStyles.push({name: 'baseFont', className: 'base-font'});
        }

        appliedStyles = appliedStyles.concat([
            {
                name: 'clientMessage',
                className: 'clientMessage'
            },
            {
                name: 'agentMessage',
                className: 'agent-message'
            },
            {
                name: 'contactTabBorder',
                className: 'contact-tab-border'
            }, {
                name: 'contactTabFont',
                className: 'contact-tab-font '
            }, {
                name: 'contentMargin',
                className: 'content-margin'
            }, {
                name: 'dialogShadow',
                className: 'dialog-shadow'
            }, {
                name: 'systemMessage',
                className: 'system-message'
            }, {
                name: 'titleFont',
                className: 'title-font'
            }, {
                name: 'widgetBackground',
                className: 'widget-background'
            }, {
                name: 'widgetBorder',
                className: 'widget-border'
            }, {
                name: 'baseFont',
                className: 'base-font'
            }, {
                name: 'widgetBorderRadius',
                className: 'widget-border-radius'
            }]);

        return appliedStyles.map(function (part) {
            return [
                prefix,
                '.' + part.className + '{',
                toCssStyle(style[part.name]),
                '}'
            ].join(' ');
        }).join(' ');
    }

    function writeStyleSheet(styles) {
        var dynamicStyle = document.querySelector('#dynamicStyle');
        if(dynamicStyle) dynamicStyle.parentNode.removeChild(dynamicStyle);

        var sheet = document.createElement('style');
        sheet.id = 'dynamicStyle';
        sheet.innerHTML = styles;
        document.body.appendChild(sheet);
    }

    function toCssStyle(style) {
        return (style) ? Object
            .keys(style)
            .map(function (key) {
                var value = style[key];
                return [
                    key,
                    ':',
                    value,
                    ';'
                ].join('');
            })
            .join(''): "";
    }

    function parseHexRGBToDec(hexRgb) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexRgb);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    if (styles){
        var key = Object.keys(styles)[0];

        var css = applyStyle('', styles[key]);

        var highlightsColor = (currentWidget && currentWidget.color) ? currentWidget.color : "2db2dd";
        var highlightsTextColor = (currentWidget && currentWidget.textColor) ? currentWidget.textColor : "fff";
        var videoCallEnabled = 'flex';
        var widgetMinimizationEnabled = 'flex';

        var fullConf = JSON.parse(sessionStorage.getItem("fullConf"));
        var definition = widgetConfiguration.getDefinition();
        if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling){
            highlightsColor = fullConf.widget.chatWidgetStyling.color;
            highlightsTextColor = fullConf.widget.chatWidgetStyling.textColor;
            videoCallEnabled = fullConf.widget.chatWidgetStyling.videoCallEnabled ? 'flex' : 'none';
            widgetMinimizationEnabled = fullConf.widget.chatWidgetStyling.widgetMinimizationEnabled === false ? 'none' : 'flex';
        }

        if (definition && definition.chatWidgetStyling) {
            highlightsColor = definition.chatWidgetStyling.color;
            highlightsTextColor = definition.chatWidgetStyling.textColor;
            videoCallEnabled = definition.chatWidgetStyling.videoCallEnabled ? 'flex' : 'none';
            widgetMinimizationEnabled = definition.chatWidgetStyling.widgetMinimizationEnabled === false ? 'none' : 'flex';
        }

        var hlColor = parseHexRGBToDec(highlightsColor);

        var highlightsStyle = [
            '.main-background-color {',
            'background:#' + highlightsColor,
            '}',

            '.main-background-color-important {',
                'background:#' + highlightsColor + ' !important',
            '}',

            '.tab_active path {',
            'fill:#' + highlightsColor,
            '}',

            '.main-path-color path {',
            'fill:#' + highlightsTextColor,
            '}',

            '.main-stroke-color line {',
            'stroke:#' + highlightsTextColor,
            '}',

            '.main-fill-color {',
            'fill:#' + highlightsColor,
            '}',

            '.main-color {',
            'color:#' + highlightsColor,
            '}',

            '.widget-border {',
            'border-color:#' + highlightsColor + '!important;',
            'background:#ffffff',
            '}',

            '.second-background-color {',
            'background:#' + highlightsTextColor,
            '}',

            '.second-fill-color {',
            'fill:#' + highlightsTextColor,
            '}',

            '.second-color {',
            'color:#' + highlightsTextColor + '!important',
            '}',

            '.second-color a, .second-color a:link, .second-color a:visited, .second-color a:active {',
            'color:#' + highlightsTextColor + '!important',
            '}',

            '#preview #callMe {',
            'display:' + videoCallEnabled,
            '}',
            
            '#preview #minimizeChat {',
            'display:' + widgetMinimizationEnabled,
            '}',

            // for buttons /choice
            '.btns.choice button:hover {',
                'background-color: rgba(' + hlColor.r + ',' + hlColor.g + ',' + hlColor.b + ',.7)',
            '}'

        ].join(' ');



        writeStyleSheet([highlightsStyle, css].join(' '));
    }
};
