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
