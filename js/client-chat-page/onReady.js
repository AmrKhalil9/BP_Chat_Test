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

    if (window.bpWidgetMain && window.bpWidgetMain.init) {
        window.bpWidgetMain.init();
    }

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
            if (window.bpWidgetMain && window.bpWidgetMain.onCallEnded) {
                window.bpWidgetMain.onCallEnded();
            }
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
