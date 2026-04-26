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
