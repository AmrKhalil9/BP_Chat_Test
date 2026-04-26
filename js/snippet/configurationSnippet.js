var snippetConfigurationSnippet = function (config, styles) {
    var previewMode = widgetConfiguration.isPreviewMode();
    var helper = snippetHelperFunctions();

    updateChatStyles(config, styles);

    var container = document.querySelector('#sp-root-container'),
        widget = document.querySelector('#sp-chat-widget'),
        fake = document.querySelector('#sp-chat-fake'),
        frame = document.querySelector('#sp-chat-frame'),
        proactiveOffers = document.querySelectorAll('.proactive-offer'),
        labelText = document.querySelector('#sp-chat-label-text'),
        roundButton = document.querySelector('.sp-round-button'),
        labelIcon = document.querySelector('#sp-chat-label-icon'),
        closeIcon = document.querySelector('#sp-close-frame'),
        dragHandle = document.querySelector('#sp-drag-handle'),
        minTab = document.querySelector('#sp-min-tab-wrapper'),
        definition = widgetConfiguration.getDefinition();

    function addElementClasses(element, orientation) {
        element.removeAttribute('class');
        helper.addClass(element, 'position_' + config.contactTab.location);
        if (commonUtilService.isDefined(orientation)) {
            helper.addClass(element, orientation);
        }
    }

    if (definition && definition.chatWidgetStyling && definition.chatWidgetStyling.showAgentPic === 'none') {
        helper.addClass(closeIcon, 'narrow');
        helper.addClass(dragHandle, 'narrow');
    }

    if (container) helper.show(container);

    if (config && config.contactTab) {
        var text;
        var icon = config.contactTab.iconUrl || '';
        var isChatStyling = previewMode && (config.widgetType === "chat_styling");
        var orientation = widgetConfiguration.getOrientation();
        if (widget) addElementClasses(widget, orientation);
        if (fake) addElementClasses(fake, orientation);
        if (!isChatStyling && frame) addElementClasses(frame, orientation);
        if (minTab) addElementClasses(minTab, orientation);
        config.contactTab.location.split('_').forEach(function (item, i) {
            if (widget) helper.addClass(widget, item + "_" + i);
            if (fake) helper.addClass(fake, item + "_" + i);
            if (!isChatStyling && frame) helper.addClass(frame, item + "_" + i);
            if (minTab) helper.addClass(minTab, item + "_" + i);
        });

        if (commonUtilService.isServiceAvailable()) {
            text = config.contactTab.agentsAvailableMsg ? config.contactTab.agentsAvailableMsg : "";
            if (!previewMode) {
                [].forEach.call(proactiveOffers, function (proactiveOffer) {
                    proactiveOffer.setAttribute("style", "display:block")
                });
            }
        } else {
            text = config.contactTab.outOfHoursMsg ? config.contactTab.outOfHoursMsg : "";
        }

        if (definition && definition.chatWidgetStyling) {
            if (definition.chatWidgetStyling.tabStyle === 'round') {
                helper.addClass(minTab, 'use-round-button');
            } else {
                helper.addClass(minTab, 'use-default-styling');
            }
        }

        if (labelText) {
            labelText.innerHTML = text || '';
            roundButton.setAttribute('title', text || '');
        }

        if (!labelIcon) {
            helper.addClass(labelIcon, 'collapse');
        } else {
            labelIcon.style.cssText = (icon.length > 0) ? 'width: 28px;margin: 6px 10px;background:url("' + icon + '") center center no-repeat' : '';
        }
    } else {
        if (widget) helper.hide(widget);
    }

};
