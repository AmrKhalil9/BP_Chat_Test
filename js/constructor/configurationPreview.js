var constructorConfigurationPreview = function (data, styles) {
    var helper = snippetHelperFunctions();
    var conf = widgetConfiguration.getObject();
    var fullConf = widgetConfiguration.getFullConfigurationObject();;
    var frameHeight = Math.min.apply(Math, [fullConf.widget.chatWidgetStyling.height, window.innerHeight - 20]);
    var widget = document.querySelector('#sp-chat-widget'),
        frame = document.querySelector('#sp-chat-frame'),
        body = document.querySelector('body'),
        labelText = document.querySelector('#sp-chat-label-text'),
        labelIcon = document.querySelector('#sp-chat-label-icon'),
        avatarImageWrapper = document.querySelector('.avatar-image-wrapper'),
        avatar = document.querySelector('.avatar-image'),
        messagesDiv = document.querySelector('#messages-div'),
        previewAgentImage = document.querySelector('.previewAgentImage'),
        preChatForm = document.querySelector('.pre_chat_form #preChatForm'),
        preChatFrame = document.querySelector('.pre_chat_form #sp-chat-frame'),
        agentName = document.querySelector('.pre_chat_form #agent-name'),
        screenTitle = document.querySelector('#screen-title'),
        questionFormInner = document.querySelector('.questionFormInner'),
        offlineFields = document.querySelector('.offlineFields'),
        customFormFields = document.querySelector('.custom-form-fields'),
        messagesDivOuter = document.querySelector('#messages-div-outer');

    if (frame) {
        frame.offsetHeight = frameHeight;
        frame.offsetWidth = fullConf.widget.chatWidgetStyling.width;
    }

    helper.addClass(body, 'preview_body');

    if (conf.contactTab) {

        var icon = conf.contactTab.iconUrl || '';
        if (icon.length == 0) {
            if (labelIcon) helper.addClass(labelIcon, 'collapse');
        } else {
            if (labelIcon) helper.removeClass(labelIcon, 'collapse');
        }
        labelIcon.style.cssText = (icon.length > 0) ? 'width: 28px;margin: 6px 10px;background:url("' + icon + '") center center no-repeat/contain' : '';
        if (labelText) labelText.innerHTML = conf.contactTab.agentsAvailableMsg || '';

        if (conf.contactTab.enabled == false) {
            if (widget) helper.hide(widget);
        } else {
            if (widget) helper.show(widget);
        }

    }

    if (fullConf && fullConf.widget.chatInitiations[0]) {
        var src = fullConf.widget.chatInitiations[0].contactTab.iconUrl ? fullConf.widget.chatInitiations[0].contactTab.iconUrl : '';
        if (src.length == 0) {
            if (avatarImageWrapper) helper.addClass(avatarImageWrapper, 'collapse');
            if (messagesDiv) helper.addClass(messagesDiv, 'noAgentImage');
        } else {
            if (avatarImageWrapper) helper.removeClass(avatarImageWrapper, 'collapse');
            if (messagesDiv) helper.removeClass(messagesDiv, 'noAgentImage');
        }
        if (avatar) avatar.style.cssText = "background-image:url('" + src + "')";
        if (previewAgentImage) previewAgentImage.style.cssText = 'background:url(' + src + ') center center no-repeat;background-size:contain!important;border-radius:0';
        sessionStorage.setItem('logoUrl', src)
    }

    if (conf.preChat) {

        var pcConfig = conf.preChat;

        if (pcConfig.enabled == false) {
            if (preChatForm) helper.hide(preChatForm);
            if (preChatFrame) helper.hide(preChatFrame);
            if (frame) frame.style.display = "";
        } else {
            if (preChatForm) preChatForm.style.display = "";
            if (preChatFrame) preChatFrame.style.display = "";
        }

        if (agentName) agentName.innerHTML = pcConfig.title;

    }

    if (conf.leaveMessage) {
        var lmConfig = conf.leaveMessage;
        if (screenTitle) screenTitle.innerHTML = lmConfig.title;
    }

};
