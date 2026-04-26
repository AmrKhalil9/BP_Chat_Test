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

                if (window.bpWidgetMain && window.bpWidgetMain.onCallEnded) {
                    window.bpWidgetMain.onCallEnded();
                }
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

            var replaceOutgoingVideoTrack = function (newVideoTrack) {
                if (!newVideoTrack || !pc || !pc.getSenders) {
                    return;
                }

                var senders = pc.getSenders();
                var videoSender = null;

                senders.forEach(function (sender) {
                    if (sender && sender.track && sender.track.kind === 'video') {
                        videoSender = sender;
                    }
                });

                if (videoSender && videoSender.replaceTrack) {
                    videoSender.replaceTrack(newVideoTrack);

                    if (localStream) {
                        localStream.getVideoTracks().forEach(function (track) {
                            if (track.id !== newVideoTrack.id) {
                                track.stop();
                                localStream.removeTrack(track);
                            }
                        });
                        localStream.addTrack(newVideoTrack);
                    } else {
                        localStream = new MediaStream([newVideoTrack]);
                    }
                }
            };

            var setLocalPreviewStream = function (stream) {
                if (stream) {
                    o.uiCallbacks.onAddLocalStream(stream);
                }
            };

            var getLocalStream = function () {
                return localStream;
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
                replaceOutgoingVideoTrack: replaceOutgoingVideoTrack,
                setLocalPreviewStream: setLocalPreviewStream,
                getLocalStream: getLocalStream,
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
