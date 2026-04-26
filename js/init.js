
function getThisScriptObject() {
    if (window.document.currentScript) {
        return window.document.currentScript;
    } else {
        var scripts = document.querySelectorAll('script[src$="js/init.js"]');
        return scripts[scripts.length - 1];
    }
}

var selfScriptTag = getThisScriptObject();
if (!selfScriptTag) {
    throw Error('Bright Pattern chat widget unable to extract chatPath from the script url!');
}

function extractOriginFromUrl(url) {
    var match = url.match(/((?:https|http)?.*\/)js\/init(?:.\d+)?.js/);
    if (match && match.length === 2) {
        return match[1];
    }
}

var chatPath = extractOriginFromUrl(selfScriptTag.src || selfScriptTag.getAttribute('src'));
chatPath = (chatPath.substr(chatPath.length - 1) === "/") ? chatPath : chatPath + "/";
if (chatPath) {
    SERVICE_PATTERN_CHAT_CONFIG.chatPath = chatPath;
}

var loadScripts = function (scripts, onSuccess) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      onSuccess && onSuccess();
      return;
    }

    var count = scripts.length;
    var loadedCount = 0;
    var firstScript = document.getElementsByTagName('script')[0];

    var addElement = function (e) {
        e.onload = e.onreadystatechange = function () {
            if (e.readyState && e.readyState !== 'complete' && e.readyState !== 'loaded') {
                return false;
            }
            e.onload = e.onreadystatechange = null;
            ++loadedCount;
            if (count === loadedCount && onSuccess != undefined) {
                setTimeout(function () {
                    onSuccess();
                });
            }
        };
        firstScript.parentNode.insertBefore(e, firstScript);
    };

    var makeScript = function (url) {
        var s = document.createElement('script');
        chatPath = (chatPath.substr(chatPath.length - 1) === "/") ? chatPath : chatPath + "/";
        s.async = true;
        s.src = chatPath + url;
        addElement(s);
    };

    var i, n;
    for (i = 0, n = scripts.length; i < n; ++i) makeScript(scripts[i]);
};

var initialized = false;
function ready() {
    if (!initialized) {
        initialized = true;

        if (!navigator.cookieEnabled) {
            console.warn('Client web chat widget can\'t work with disabled cookies. Skip initialization...')
            return;
        }

        if (window.__surfly) {
            loadScripts(['js/surflySession.js']);
        } else {

            loadScripts([
                'build/page-lib.min.js'
            ], function() {
                loadScripts([
                    'build/chat-widget.min.js?cache-control=1337'
                    // "js/libraries/perfect-scrollbar/perfect-scrollbar.min.js"
                ], function() {

                    if (!SERVICE_PATTERN_CHAT_CONFIG.chatHtmlName) {
                        SERVICE_PATTERN_CHAT_CONFIG.chatHtmlName = 'client-chat-page.html';
                    }

                    chatSnippet();

                    var formButtons = document.querySelectorAll('#sp-callback-submit, #sp-chat-submit, #sp-callback-submit-inline');
                    [].forEach.call(formButtons, function (formButton) {
                        formButton.addEventListener('click', function () {

                            var lastInvocationTime = localStorage.getItem('bp-chat-start-last-invocation-time');
                            var newInvocationTime = Date.now();
                            if (lastInvocationTime && newInvocationTime < Number(lastInvocationTime) + 1000) {
                                console.error('Attempt to start a chat twice in 1 second');
                                return;
                            }
                            localStorage.setItem('bp-chat-start-last-invocation-time', newInvocationTime);

                            if (callbackUtilService.isCallbackFormValid('sp-callback-form')) {
                                var spcc = SERVICE_PATTERN_CHAT_CONFIG;
                                var xmlhttp;
                                var cp = callbackUtilService.getSnippetFormValues('sp-callback-form');
                                cp.clientId = (typeof spcc.clientId !== 'undefined') ? spcc.clientId : 'Webchat';
                                cp.apiUrl = spcc.apiUrl;
                                cp.chatPath = spcc.chatPath;
                                cp.url = spcc.apiUrl;
                                cp.appId = (typeof spcc.callbackAppId !== 'undefined') ? spcc.callbackAppId : spcc.appId;
                                cp.tenantUrl = spcc.tenantUrl;
                                var url = spcc.apiUrl + '/chats?tenantUrl=' + encodeURIComponent(spcc.tenantUrl) + "&timestamp=" + (new Date().getTime());
                                if (window.XMLHttpRequest) {
                                    xmlhttp = new XMLHttpRequest();
                                } else {
                                    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                                }
                                xmlhttp.crossDomain = true;
                                xmlhttp.xhrFields = {
                                    withCredentials: true
                                };
                                xmlhttp.open("POST", url, true);
                                xmlhttp.setRequestHeader('Content-Type', 'application/json');
                                xmlhttp.setRequestHeader('Accept', 'application/json, text/javascript, */*; q=0.01');
                                xmlhttp.setRequestHeader('Authorization', 'MOBILE-API-140-327-PLAIN appId="' + cp.appId + '", clientId="' + cp.clientId + '"');
                                xmlhttp.send(JSON.stringify(callbackUtilService.getSnippetFormValues('sp-callback-form')));
                                xmlhttp.onreadystatechange = function () {
                                    var form = document.getElementById('sp-callback-form');
                                    var className = 'sended';
                                    if (form.classList) {
                                        form.classList.add(className);
                                    } else if (hasClass && !hasClass(form, className)) {
                                        form.className += " " + className
                                    }
                                    var suffix = (this.id === 'sp-chat-submit') ? "Chat" : this.innerHTML;
                                    sessionStorage.removeItem('source', 'callbackFormChat');
                                    sessionStorage.removeItem('source', 'callbackFormCall');
                                    sessionStorage.setItem('source', 'callbackForm' + suffix);
                                };
                                return xmlhttp.onreadystatechange();
                            }
                        });
                    });
                });
            });
        }
    }
}

if (document) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        ready();
    } else {
        document.addEventListener("DOMContentLoaded", ready);
    }
}
