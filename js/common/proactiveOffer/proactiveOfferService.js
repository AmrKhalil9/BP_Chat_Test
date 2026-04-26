var proactiveOfferService = (function () {

    var animationIn, animationOut;

    function loadProactiveOfferStyles() {
        var chatPath = widgetConfiguration.getChatPath();
        document.querySelector('head').insertAdjacentHTML('beforeend', "<link href='" + chatPath + "css/proactive-offer.css' type='text/css' rel='stylesheet' />");
    }

    function createButton(className, innerText, dataTab) {
        if (dataTab) {
            return '<button class="' + className + '" data-tab="' + dataTab + '">' + innerText + '</button>'
        } else {
            return '<button class="' + className + '">' + innerText + '</button>'
        }
    }

    function getProactiveOfferButtons() {
        var poConfig = widgetConfiguration.getProactiveOffer();
        var commonClass = 'button-primary proactive-offer__button main-background-color second-color',
            callBtnClass = commonClass + ' ' + 'proactive-offer__button_type_call',
            chatBtnClass = commonClass + ' ' + 'proactive-offer__button_type_chat',
            emailBtnClass = commonClass + ' ' + 'proactive-offer__button_type_email',
            closeBtnClass = commonClass + ' ' + 'proactive-offer__close',
            paLeaveMessage = '',
            paCloseButton = '',
            paCallButton = '',
            paChatButton = '',
            paCloseButtonText = '';
        if (poConfig && poConfig.properties) {
            var properties = poConfig.properties;
            if (properties.callButtonEnabled) {
                paCallButton = createButton(callBtnClass, properties.callButtonText, 'call');
            }
            if (properties.chatButtonEnabled) {
                paChatButton = createButton(chatBtnClass, properties.chatButtonText, 'chat');
            }
            if (properties.cancelButtonText) {
                paCloseButtonText = properties.cancelButtonText
            }
        }
        paCloseButton = createButton(closeBtnClass, paCloseButtonText);
        paLeaveMessage = createButton(emailBtnClass, 'Leave message');
        return commonUtilService.isServiceAvailable() ? paCloseButton + paChatButton + paCallButton : paCloseButton + paLeaveMessage;
    }

    function getProactiveOfferHtml() {
        var width = '',
            height = '',
            content = '',
            position = 'center',
            buttons = getProactiveOfferButtons(),
            properties = null,
            styling = null,
            closeIcon = '',
            poConfig = widgetConfiguration.getProactiveOffer();
        animationIn = '';
        animationOut = '';
        if (poConfig) {
            styling = poConfig.styling;
            properties = poConfig.properties;
            if (styling) {
                position = styling.location;
                animationIn = styling.animationIn;
                animationOut = styling.animationOut;
                width = styling.width;
                height = styling.height;
            }
            if (properties) {
                content = properties.htmlContent;
                closeIcon = properties.closeButtonEnabled ? '<div class="proactive-offer__close-wrapper"><svg class="proactive-offer__close close-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path clip-rule="evenodd" d="M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z" /></svg></div>' : '';
            }
        }
        animationIn = (commonUtilService.includes(animationIn, 'slide')) ? position + '_' + animationIn : animationIn;
        animationOut = (commonUtilService.includes(animationOut, 'slide')) ? position + '_' + animationOut : animationOut;
        return '<div class="proactive-offer base-font position_' + position + '" data-animationIn="' + animationIn + '" >' +
                    '<div class="widget-border widget-border-radius">'+
                        '<div style="width:' + width + 'px;height:' + height + 'px;" class="proactive-offer__body widget-background">' +
                            '<div class="proactive-offer__content-wrapper">' +
                                closeIcon +
                                '<div class="proactive-offer__content">' + content + '</div>' +
                                '<div class="proactive-offer__button-wrapper">' + buttons + '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
    }

    function updateProactiveOfferStyles() {
        var poConfig = widgetConfiguration.getProactiveOffer();
        var proactiveOffer = document.querySelector('.proactive-offer');
        var poContent = document.querySelector('.proactive-offer__content');
        var poBtnWrapper = document.querySelector('.proactive-offer__button-wrapper');
        var contentHeight = poContent ? poContent.offsetHeight : 0,
            contentWidth = poContent ? poContent.offsetWidth : 0,
            buttonsHeight = poBtnWrapper ? poBtnWrapper.offsetHeight : 0,
            buttonsWidth = 30,
            screenWidth = proactiveOffer ? proactiveOffer.offsetWidth : 0,
            screenHeight = proactiveOffer ? proactiveOffer.offsetHeight : 0;

        var buttons = document.querySelectorAll('.proactive-offer__button-wrapper > *');
        [].forEach.call(buttons, function (button) {
            buttonsWidth += button.offsetWidth - 30;
        });

        var POheight = contentHeight + buttonsHeight,
            POwidth = Math.max.apply(Math, [contentWidth, buttonsWidth]);

        if (POwidth > screenWidth) {
            var coefX = screenWidth / POwidth;
        }
        if (POheight > screenHeight) {
            var coefY = screenHeight / POheight;
        }
        if (coefX || coefY) {
            var coef = Math.max.apply(Math, [coefX, coefY]),
                scale = 100 / coef;
            document.querySelector('.proactive-offer__content-wrapper>div').setAttribute("style", "transform:scale(' + coef + ');");
            document.querySelector('.proactive-offer__content').style.width = scale + '%';
        }
        var paButtonsEl = document.querySelector('.proactive-offer__button_type_chat');
        if (paButtonsEl !== null) {
            var paBody = document.querySelector('.proactive-offer__body');
            var isMobile = widgetConfiguration.isMobile();
            var availableHeight = (isMobile && window.screen) ? window.screen.availHeight : window.innerHeight;
            var availableWidth = (isMobile && window.screen) ? window.screen.availWidth : window.innerWidth;

            var calculatedHeight = Math.min(poConfig.styling.height, availableHeight);
            var calculatedWidth = Math.min(poConfig.styling.width, availableWidth);

            if (paBody && paBody.style) {
              paBody.style.width = calculatedWidth + 'px';
              paBody.style.height = calculatedHeight + 'px';
            }
        }
    }

    function setButtonsListeners(openChat, eventsCallback) {

        function loopButtons(e, buttons, isClose) {
            var helper = snippetHelperFunctions();
            [].forEach.call(buttons, function (button) {
                if (e.target === button){
                    if (!isClose) {
                        document.querySelector('.proactive-offer').setAttribute("data-animationOut", animationOut);
                        helper.addClass(document.querySelector('.proactive-offer'), 'removing');
                        setTimeout(function() {
                            removeProactiveOffer();
                        }, 500);
                        if (eventsCallback && eventsCallback.proactiveYes) {
                            eventsCallback.proactiveYes();
                        }
                        sessionStorage.setItem("tab", button.getAttribute('data-tab'));
                        openChat();
                        snippetOpenChat(true);
                        sessionStorage.setItem("source", 'proactive');
                    } else {
                        document.querySelector('.proactive-offer').setAttribute("data-animationOut", animationOut);
                        helper.addClass(document.querySelector('.proactive-offer'), 'removing');
                        setTimeout(function() {
                            removeProactiveOffer();
                        }, 500);
                        if (eventsCallback && eventsCallback.proactiveNo) {
                            eventsCallback.proactiveNo();
                        }
                    }
                }
            });
        }

        document.addEventListener('click', function (e) {
            var poButtons = document.querySelectorAll('.proactive-offer__button:not(.proactive-offer__close)');
            var poCloses = document.querySelectorAll('.proactive-offer__close');
            loopButtons(e, poButtons, false);
            loopButtons(e, poCloses, true);
        });
    }

    function isOpened() {
        return document.getElementsByClassName('proactive-offer').length > 0;
    }

    function build() {
        if (!isOpened()) {
            var iframe = document.querySelector('#sp-chat-iframe');
            if (!iframe) {
                var paCode = getProactiveOfferHtml();
                var body = document.querySelector('body');
                body.insertAdjacentHTML('beforeend', paCode);
                var offers = document.querySelectorAll('.proactive-offer.base-font');
                [].forEach.call(offers, function (offer) {
                    offer.setAttribute("style", "display:block")
                });
            }
            setTimeout(function () {
                updateProactiveOfferStyles();
            });
        }
    }

    function isAllowedToShow() {
        var allowed = true;
        var isMobile = widgetConfiguration.isMobile();
        var conditions = widgetConfiguration.getProactiveOfferConditions();
        if (isMobile) {
            conditions.forEach(function (condition) {
                if (condition && Array.isArray(condition.rules) && condition.rules.length) {
                    condition.rules.forEach(function (rule) {
                        if (rule && rule.ruleType === "nonmobile_browser") {
                            allowed =  false;
                        }
                    })
                }
            });
        } else {
            allowed = true;
        }
        return allowed;
    }

    function windowResizeListener() {
        if (isAllowedToShow()) {
            updateProactiveOfferStyles();
        } else {
            removeProactiveOffer();
            window.removeEventListener("resize", windowResizeListener, false);
        }
    }

    function isEnabled() {
        var poConfig = widgetConfiguration.getProactiveOffer();
        if (poConfig && poConfig.properties) {
            return !!poConfig.properties.enabled;
        }
        return false;
    }

    function buildProactiveOffer(openChat) {
        var eventsCallback = SERVICE_PATTERN_CHAT_CONFIG.callbacks;
        if (isAllowedToShow() && isEnabled()) {
            window.addEventListener("resize", windowResizeListener, false);
            loadProactiveOfferStyles();
            if (!commonUtilService.isServiceNotAvailable()) {
                proactiveChatStarter(build);
                setButtonsListeners(openChat, eventsCallback);
                if (eventsCallback && eventsCallback.proactiveChatOffered) {
                    eventsCallback.proactiveChatOffered();
                }
            }
        }
    }

    function resetProactiveOffer() {
        proactiveChatStarter(build);
    }

    function removeProactiveOffer() {
        var offer = document.querySelector('.proactive-offer');
        if(offer) {
            offer.parentNode.removeChild(offer);
        }
    }

    return {
        buildProactiveOffer: buildProactiveOffer,
        removeProactiveOffer: removeProactiveOffer,
        resetProactiveOffer: resetProactiveOffer
    }
})();
