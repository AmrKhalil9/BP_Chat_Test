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
