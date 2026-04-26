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
