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
