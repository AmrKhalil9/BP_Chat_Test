
function notifyNoSession() {
    parent.postMessage('bpc-no-session', '*');
}

function notifySessionExists() {
    parent.postMessage('bpc-session-exists', '*');
}

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

var cp = getUrlVars(window.location.href);

function chatApiSessionCheckSessionExists(sessionId, onSuccess, onError) {
    var historyEndpoint = 'chats/' + sessionId + '/history?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
    var url = cp.url + '/' + historyEndpoint + '&timestamp=' + (new Date().getTime());
    var authHeader = 'MOBILE-API-140-327-PLAIN appId="' + cp.appId + '", clientId="' + cp.clientId + '"';

    var xhr = new XMLHttpRequest();
    if (cp.crossDomain) {
        xhr.withCredentials = true
    }

    xhr.open('GET', url)
    xhr.setRequestHeader('Authorization', authHeader);

    xhr.onload = function() {
        if (xhr.status === 200) {
            onSuccess();
        } else {
            onError();
        }
    }
    xhr.onerror = onError;

    xhr.send();
}

var sessionId = sessionStorage.getItem('sp-chat-session');
if (sessionId) {
    chatApiSessionCheckSessionExists(
        sessionId,
        function() { notifySessionExists(); },
        function() { notifyNoSession(); }
    );
} else {
    notifyNoSession();
}
