
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
