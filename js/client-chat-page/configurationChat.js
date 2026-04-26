var clientChatPageConfigurationChat = function (data, _styles) {
    var variables = clientChatPageVariables;
    var connection = clientChatPageConnection();
    var previewMode = widgetConfiguration.isPreviewMode();
    var chatUrl = widgetConfiguration.getChatPath();
    var i18n = clientChatUiI18n();

    var store = window.sessionStorage;

    var confObj = widgetConfiguration.getObject(),
        snippetConfig = widgetConfiguration.getSnippet(),
        poConfig = widgetConfiguration.getProactiveOffer(),
        customFormConfig = widgetConfiguration.getForm(),
        styles = previewMode ? JSON.parse(sessionStorage.getItem("styles")) : confObj.styles,
        comparsion = previewMode ? (confObj.widgetType === 'chat_styling') : true,
        cwConfig = previewMode ? confObj : (confObj.definition || {}).chatWidgetStyling || {},
        fullConf = widgetConfiguration.getFullConfigurationObject();

    var lmConfig, win, frameHeight;

    if (previewMode) {
        lmConfig = confObj.leaveMessage;
        poConfig = confObj;
        snippetConfig = confObj;
        customFormConfig = confObj;
        win = window;
    }

    if (snippetConfig) {
        lmConfig = snippetConfig.leaveMessage;
        win = window.parent;
    }

    if (poConfig) {
        win = window.parent;
    }

    var pcConfig = (snippetConfig && snippetConfig.preChat) ? snippetConfig.preChat : '',
        source = store.getItem('source'),
        sourceObj = (source === 'proactive' && commonUtilService.stringIsTrue(store.getItem('serviceAvailable')))
            ? poConfig.preChat
            : pcConfig;

    function getFrameHeight(configHeight, innerHeight) {
        return Math.min.apply(Math, [configHeight, innerHeight - 20]);
    }

    function isFormSecure(form) {
        return form.hasClass('secure');
    }

    function checkIframe() {
        var key = (+new Date) + "" + Math.random();

        try {
            var global = window.parent;
            global[key] = "asd";
            return global[key] === "asd";
        }
        catch (e) {
            return false;
        }
    }

    function submitCustomFormData(data) {
        var chatSession = window.chatSession;
        sendFormData(chatSession.sendSecureFormData, chatSession.sendFormData, variables, data)
    }

    function cancelCustomFormData(data) {
        var chatSession = window.chatSession;
        sendFormData(chatSession.sendSecureFormData, chatSession.sendFormData, variables, data)
    }

    function sendFormData(secureFormCallback, formCallback, variables, data) {
        var requestId = variables.currentFormRequestId;
        var formName = variables.currentFormName;
        isFormSecure($customForm) ? secureFormCallback(requestId, formName, data) : formCallback(requestId, formName, data);
    }

    function getFormByName(formName) {
        var form;
        switch (formName) {
            case 'preChatForm':
                form = $('#preChatForm');
                break;
            case 'questionForm':
                form = $('#questionForm');
                break;
            case 'unavailableForm':
                form = $('#unavailableForm');
                break;
            case 'customForm':
                form = $('#customForm');
                break;
        }
        return form;
    }

    function formOnHide(formName, customFormCallback, data) {
        htmlUtilService.displayNone($('#offline-form'));
        var form = getFormByName(formName);
        if (formName === 'customForm') {
            customFormCallback(data);
            $('.custom-form-fields').scrollTop(0);
            htmlUtilService.displayNone($customForm);
            $('#agent-name').text($('#agent-name').attr('data-original-name'));
            $('#agent-name').attr('data-original-name', '');
            $('#header-avatar-container .avatar').css({'display': ''});
            clientChatPageUpdateScrollbar();
        } else {
            connection.connect();
            htmlUtilService.displayNone(form);
        }
    }

    function formAnimateFast(form, formInner) {
        if (form && form.animate) {
            form.animate({
                scrollTop: $('.error-balloon:visible').eq(0).offset().top + formInner.scrollTop() - 154
            }, 'fast');
        }
    }

    function showErrorBalloons(context, message) {
        var errorBalloons = getErrorBalloons(context);
        if (message) {
            errorBalloons.text(message);
        }
        errorBalloons.show();
    }

    function hideErrorBalloons(context) {
        var errorBalloons = getErrorBalloons(context);
        errorBalloons.hide();
    }

    function getErrorBalloons(context) {
        return $(context).find('.error-balloon');
    }

    function setCallChatButton(buttonClass, isButtonEnabled, buttonText) {
        if (isButtonEnabled) {
            $('.sp-callback-form').append('<button id="sp-callback-submit" class="' + buttonClass + '">' + buttonText + '</button>');
        } else {
            $('.' + buttonClass + '').remove();
        }
    }

    function getFieldInput(context) {
        var $input;
        switch ($(context).attr('class')) {
            case 'field-wrapper field-radio':
                $input = $(context).find('input:checked');
                break;
            case 'field-wrapper field-multiline':
                $input = $(context).find('textarea');
                break;
            case 'field-wrapper field-select':
                $input = $(context).find('select');
                break;
            default:
                $input = $(context).find('input');
        }
        return $input;
    }

    function getCaptcha(field) {
        var captcha = '';
        $(field).find('table.captcha td').each(function () {
            captcha += $(this).text();
        });
        return captcha;
    }

    function isCaptchaValid(field) {
        return getCaptcha(field) === $(field).find('input').val();
    }

    function validateAndUpdateFields(fields, data) {
        var result = {isValid: true};
        fields.each(function () {
            var $input = getFieldInput(this);
            var key = $input.attr('name');
            var type = $input.attr('type');
            var message = i18n.requiredField;
            if (key !== 'captcha_text') {
                var val = ($input.val() || '');
                var noError = (val && val.length > 0 && $(this).find('.error-balloon').length > 0) || !$input.prop('required');
                if (this.className === 'field-wrapper field-radio') {
                    noError = ( $(this).find('input:checked').length == 0 && $(this).find('.error-balloon').length > 0) ? false : true;
                }
                if (this.className === 'field-wrapper field-select') {
                    noError = ( $(this).find('option:selected').val().length == 0 && $(this).find('.error-balloon').length > 0  && $(this).find('select[required]').length > 0) ? false : true;
                }
                var validationRequired = commonUtilService.stringIsTrue($input.attr("data-validate"));
                if ((type === 'tel' || type === 'email' || type === 'datetime') && noError && $input.val() && validationRequired) {
                    var isValid = true;
                    if (type === 'tel') {
                        isValid = commonUtilService.validatePhoneNumber($input.val());
                    }
                    if (type === 'email') {
                        isValid = commonUtilService.validateEmail($input.val());
                    }
                    if (type === 'datetime') {
                        isValid = commonUtilService.validateDate($input.val());
                    }
                    if (!isValid) {
                        message = i18n.invalidInputField;
                        noError = false;
                    }
                }
                if (noError) {
                    hideErrorBalloons(this);
                    variables.cp.parameters[key] = data[key] = val;
                    if (variables.cp[key]) {
                        variables.cp[key] = val;
                    } else if (key === 'phone') {
                        variables.cp.phone_number = val;
                    }
                } else {
                    showErrorBalloons(this, message);
                    result.isValid = false;
                }
            } else if (!isCaptchaValid(this)) {
                htmlUtilService.displayBlock($('#error-captcha'));
                result.isValid = false;
            }
        });
        return result;
    }

    function appendTip(elementSelector, tipId) {
        if (htmlUtilService.hasElementRequiredFields(elementSelector)) {
            var elementParent = $(elementSelector + ' *[required="true"]').parents(elementSelector);
            var tip = $('#' + tipId);
            if (elementParent.length > 0 && tip.length === 0) {
                elementParent.append('<div id="' + tipId + '" class="reqDescr">' + i18n.refersToRequiredFields + '</div>');
            }
        }
    }

    if (!checkIframe()) {
        win = window;
    }

    var showAgentPic;
    if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling) {
        showAgentPic = fullConf.widget.chatWidgetStyling.showAgentPic;
    }
    if (comparsion) {
        showAgentPic = cwConfig.showAgentPic;
    }

    var $query = $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions');
    switch (showAgentPic) {
        case 'none':
        default:
            $query.addClass('narrow');
            break;
        case 'always_default':
            $query.removeClass('narrow');
            break;
        case 'show':
            $query.removeClass('narrow');
            break;
    }

    var $spChatFrame = $('#sp-chat-frame');
    var $messagesDiv = $('#messages-div');
    var $headerAvatar = $('#header-avatar .avatar');
    var $minHeaderAvatar = $('#min_agent_image');
    var $customForm = $('#customForm');
    var $cancelPreChatForm = $('#cancelPreChatForm');
    if (comparsion) {
        var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
        if (!isChatMinimized) {
            if (!widgetConfiguration.isMobile()) {
                frameHeight = Math.min.apply(Math, [cwConfig.height, win.innerHeight - 20]);
                $spChatFrame.css({height: frameHeight, width: cwConfig.width})

            } else {
                $spChatFrame.css({height: '100%', width: '100%'});
            }
        }
        switch (showAgentPic) {
            case 'none':
                $messagesDiv.addClass('noAgentImage');
                $messagesDiv.removeClass('defaultAgentImage');
                $headerAvatar.hide();
                $minHeaderAvatar.hide();
                break;
            case 'always_default':
                $headerAvatar.show();
                $messagesDiv.removeClass('noAgentImage');
                $messagesDiv.removeClass('defaultAgentImage');
                if (previewMode) {
                    $('.previewAgentImage').attr('style', 'background:url(' + chatUrl + 'images/man-with-glasses.jpg) center center no-repeat/contain;');
                }
                break;
            case 'show':
                $headerAvatar.show();
                $messagesDiv.removeClass('noAgentImage');
                $messagesDiv.removeClass('defaultAgentImage');
                if (previewMode) {
                    $('.previewAgentImage').attr('style', 'background:url(' + chatUrl + 'images/man-with-glasses.jpg) center center no-repeat/contain;');
                }
                break;
        }

        var $previewCallme = $('#preview #callMe');
        if (cwConfig.videoCallEnabled === false) {
            htmlUtilService.displayNone($previewCallme);
        } else {
            htmlUtilService.displayFlex($previewCallme);
        }

        if (cwConfig.visitorVideoEnabled === false) {
            $('#call-prompt .content').html(i18n.allowMicroPrompt);
            $('#call-prompt .error.camera').remove();
        } else {
            $('#call-prompt .content').html(i18n.allowMicroVideoPrompt);
        }

        if (cwConfig.fileUploadEnabled === false) {
            $('#attachFile:not(.preview)').remove();
            $('#attachFile.preview').hide();
            $('#input-div').addClass('without_file');
        } else {
            $('#attachFile.preview').show();
            $('#input-div').removeClass('without_file');
        }

        if (cwConfig.emojiSelector === false) {
            htmlUtilService.displayNone($('.emoji-picker'));
        } else {
            htmlUtilService.displayBlock($('.emoji-picker'));
        }

        if (cwConfig.widgetMinimizationEnabled === false) {
            htmlUtilService.displayNone($('#minimizeChat'));
        } else {
            htmlUtilService.displayFlex($('#minimizeChat'));
        }

        if (cwConfig.title) {
            $('.agent-name').text(cwConfig.title);
            $('#min_agent_name').text(cwConfig.title)
        }

        $('#notification-prompt .content').text(cwConfig.notificationsPrompt || i18n.notificationsPrompt);
        $('#input-field').attr('placeholder', cwConfig.hintMessageTextBox || i18n.hintMessageTextBox);
        $('.min-tab-wrapper > .sp-round-button').attr('title', cwConfig.showChatTooltip || i18n.showChatTooltip);
        $('.min-tab-wrapper > .min-chat-tab > .min-tab-content').attr('title', cwConfig.showChatTooltip || i18n.showChatTooltip);
        $('#callMe').attr('title', cwConfig.webRtcCallTooltip || i18n.webRtcCallTooltip);
        $('#switchVideo').attr('title', cwConfig.webRtcSwitchVideoTooltip || i18n.webRtcSwitchVideoTooltip);
        $('#shareScreen').attr('title', cwConfig.shareScreenTooltip || i18n.shareScreenTooltip);
        $('#minimizeChat').attr('title', cwConfig.minimizeChatTooltip || i18n.minimizeChatTooltip);
        $('#sp-close-frame').attr('title', cwConfig.endChatTooltip || i18n.endChatTooltip);
        $('i.emoji-picker').attr('title', cwConfig.emojiTooltip || i18n.emojiTooltip);
        $('#attachFile').attr('title', cwConfig.sendFileTooltip || i18n.sendFileTooltip);
        $('#min_dismiss_button').attr('title', cwConfig.minimizedDismissMessagesTooltip || i18n.minimizedDismissMessagesTooltip);
        $('#call-prompt > .error.camera').text(cwConfig.cameraNotDetectedText || i18n.cameraNotDetectedText);
        $('#call-prompt > .error.microphone').text(cwConfig.microNotDetectedText || i18n.microNotDetectedText);

        $('#surveyForm .serviceSurvey .description').text(cwConfig.surveyFormWasIssueResolvedQuestion || i18n.surveyFormWasIssueResolvedQuestion);
        $('#surveyForm .serviceSurvey input#service-1 + label').text(cwConfig.surveyFormWasIssueResolvedPositiveAnswer || i18n.surveyFormWasIssueResolvedPositiveAnswer);
        $('#surveyForm .serviceSurvey input#service-0 + label').text(cwConfig.surveyFormWasIssueResolvedNegativeAnswer || i18n.surveyFormWasIssueResolvedNegativeAnswer);
        $('#surveyForm .helpfulSurvey .description').text(cwConfig.surveyFormContactSatisfactionQuestion || i18n.surveyFormContactSatisfactionQuestion);
        $('#surveyForm .recommendSurvey .description').text(cwConfig.surveyFormNetPromoterScoreQuestion || i18n.surveyFormNetPromoterScoreQuestion);
        $('#surveyForm .transcriptSurvey .description').text(cwConfig.surveyFormSendChatTranscriptQuestion || i18n.surveyFormSendChatTranscriptQuestion);
        $('#surveyForm .emailSurvey .description').text(cwConfig.surveyFormEmailFieldLabel || i18n.surveyFormEmailFieldLabel);
        $('#surveyForm .emailSurvey .error-balloon').text(cwConfig.surveyFormEmailValidationErrorText || i18n.surveyFormEmailValidationErrorText);

        $('.agentJoinedMessage span').text(cwConfig.agentJoinedMessage);
        $('.inactivityWarningText span').text(cwConfig.inactivityWarningMessage);
        $('.inactivityTimeoutText span').text(cwConfig.inactivityTimeoutMessage);
        $('.sessionEndedText span').text(cwConfig.sessionEndedMessage);
        $('.agentLeftText span').text(cwConfig.agentLeftMessage);
        $('.chat_widget #agent-name').text(cwConfig.title);
        $('#min_agent_name').text(cwConfig.title);
    }

    if (confObj.widgetType === 'form') {
        $('#custom_submit').val(confObj.submitButtonText);
        $('#custom_cancel').text(confObj.cancelButtonText);
    }

    if (confObj.widgetType === 'onPageForm') {

        if ($('.sp-callback-form').length === 1) {
            $('#preview .sp-callback-form').css('display', 'inline-block');
        }
        clientChatPageGenerateInputs(confObj.fields, '.sp-callback-form');
        setCallChatButton('chatButton', confObj.chatButtonEnabled, confObj.chatButtonText);
        setCallChatButton('callButton', confObj.callButtonEnabled, confObj.callButtonText);
    }

    if (sourceObj) {

        if (sourceObj.enabled) {
            var isCallButtonEnabled = sourceObj.callButtonEnabled;
            var isChatButtonEnabled = sourceObj.chatButtonEnabled;
            var submitPhone = $('#submitPhone');
            var submitChat = $('#submitChat');
            var title;
            var $preChatForm =  $('#preChatForm');
            var $preChatFormTabs =  $preChatForm.find('.tabs');
            $preChatForm.removeClass();
            $preChatForm.addClass('agent-message question__call-tab_hide question__chat-tab_hide question__call-tab_active question__chat-tab_active');
            if (!isCallButtonEnabled) {
                $preChatForm.removeClass('question__call-tab_active');
            } else {
                $preChatForm.removeClass('question__call-tab_hide');
            }
            if (!isChatButtonEnabled) {
                $preChatForm.removeClass('question__chat-tab_active');
            } else {
                $preChatForm.removeClass('question__chat-tab_hide');
            }
            if (isCallButtonEnabled && isChatButtonEnabled) {
                $preChatForm.removeClass('question__call-tab_active');
            }

            $preChatFormTabs.toggleClass('none', (!isCallButtonEnabled || !isChatButtonEnabled));

            if (commonUtilService.isServiceNotAvailable()) {
                title = lmConfig ? lmConfig.title : '';
            } else {
                title = sourceObj.title;
            }

            $('#agent-name').html(title);
            $('#min_agent_name').html(title);
            submitPhone.val(sourceObj.callButtonText);
            $('.tabPhone span').text(sourceObj.callButtonText);
            submitChat.val(sourceObj.chatButtonText);
            $('.tabChat span').text(sourceObj.chatButtonText);

            if (cwConfig.fileUploadEnabled === false) {
                $('#attachFile:not(.preview)').remove();
                $('#attachFile.preview').hide();
                $('#input-div').addClass('without_file');
            } else {
                $('#attachFile.preview').show();
                $('#input-div').removeClass('without_file');
            }

            if (cwConfig.emojiSelector === false) {
                htmlUtilService.displayNone($('.emoji-picker'));
            } else {
                htmlUtilService.displayBlock($('.emoji-picker'));
            }

            if (commonUtilService.isDefined(sourceObj.cancelButtonEnabled) && sourceObj.cancelButtonEnabled === true) {
                $cancelPreChatForm.val(sourceObj.cancelButtonText);
                $cancelPreChatForm.css({'display': 'block'});
            } else {
                $('#cancelPreChatForm:not(.preview)').remove();
                $('#cancelPreChatForm.preview').hide();
            }

            $cancelPreChatForm.on('click', function () {
                window.parent.postMessage("sp-pre-chat-form-cancel-button-clicked", "*");
                clientChatPageSafeEndSession();
            });

            $('#submit').on('click', function () {
                submit('questionForm');
            });

            submitChat.on('click', function () {
                window.parent.postMessage("sp-pre-chat-form-chat-button-clicked", "*");
                submit('preChatForm', 'chatFields');
            });

            submitPhone.on('click', function () {
                window.parent.postMessage("sp-pre-chat-form-phone-button-clicked", "*");
                submit('preChatForm', 'phoneFields');
            });

            clientChatPageGenerateInputs(sourceObj.commonFields, '.commonFields');
            clientChatPageGenerateInputs(sourceObj.chatFields, '.chatFields');
            clientChatPageGenerateInputs(sourceObj.phoneFields, '.phoneFields');
            appendTip('.questionFormInner', 'questionFormInnerReqDescr');
        }

        function submit(formName, className) {
            var globalNoError = true,
                data = {};
            var fields, form, formInner;
            var questionFormInner = $('.questionFormInner');

            // Might be problem here
            switch (formName) {
                case 'preChatForm':
                    fields = $('#preChatForm .commonFields .field-wrapper, #preChatForm .' + className + ' .field-wrapper');
                    form = questionFormInner;
                    formInner = questionFormInner;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
                case 'questionForm':
                    fields = $('#questionForm .field-wrapper');
                    form = $('.questionFormFieldsWrapper');
                    formInner = questionFormInner;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
                case 'customForm':
                    fields = $('#customForm .field-wrapper');
                    form = $('.custom-form-fields');
                    formInner = $customForm;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
                case 'unavailableForm':
                    fields = $('#unavailableForm .field-wrapper');
                    variables.leaveMessageForm = 'true';
                    variables.extChatData = {email: (lmConfig.email) ? lmConfig.email : ''};
                    fields.each(function (index) {
                        var name = $(this).find('input,label,select,textarea').attr('name');
                        var val;
                        if ($(this).find('input').not('input[type="radio"],input[type="checkbox"]').length > 0) {
                            val = $(this).find('input').val();
                        }
                        if ($(this).find('textarea').length > 0) {
                            val = $(this).find('textarea').val();
                        }
                        if ($(this).find('input[type="radio"],input[type="checkbox"]').length > 0) {
                            val = $(this).find('input:checked').val();
                        }
                        if ($(this).find('select').length > 0) {
                            val = $(this).find('option:selected').val();
                        }
                        variables.extChatData[name] = val;
                    });
                    form = $('#offline-form-fields');
                    formInner = questionFormInner;
                    globalNoError = validateAndUpdateFields(fields, data).isValid;
                    break;
            }

            if (globalNoError) {
                formOnHide(formName, submitCustomFormData, data);
            } else {
                var visibleErrorBallons = $('.error-balloon:visible');
                if (visibleErrorBallons.length > 0) {
                    visibleErrorBallons.siblings('input').eq(0).focus();
                    formAnimateFast(form, formInner);
                }
            }
        }

        function cancel(formName, className) {
            formOnHide(formName, cancelCustomFormData, {});
        }

        $('#unsubmit').on('click', function () {
            submit('unavailableForm');
        });

        $('#custom_submit').on('click', function () {
            submit('customForm');
        });

        $('#custom_cancel').on('click', function () {
            cancel('customForm');
        });

    }
    var avatarImageWrapper = $('.avatar-image-wrapper');
    if ((cwConfig && cwConfig.showAgentPic !== 'none') && previewMode) {
        $('.avatar-image').attr('style', 'background:url(' + chatUrl + 'images/man-with-glasses.jpg) center center no-repeat/contain;');
        avatarImageWrapper.removeClass('collapse');
        avatarImageWrapper.removeClass('contain');
    } else {
        if (snippetConfig && snippetConfig.contactTab) {
            var src = snippetConfig.contactTab.iconUrl ? snippetConfig.contactTab.iconUrl : '';
            if (src.length > 0) {
                $('.avatar-image').attr('style', "background-image:url('" + src + "')");
                avatarImageWrapper.addClass('contain');
            } else {
                avatarImageWrapper.addClass('collapse');
            }
            if (title) {
                window.parent.postMessage(JSON.stringify({
                    type: 'bp-update-agent-data',
                    data: {
                        name: title,
                        url: (showAgentPic !== 'none') ? src : undefined
                    }
                }), '*');
            }
        }
    }

    if (lmConfig) {
        if (lmConfig.okButtonText) {
            $('#unsubmit').val(lmConfig.okButtonText);
        }

        if (commonUtilService.isDefined(lmConfig.cancelButtonEnabled) && lmConfig.cancelButtonEnabled === true) {
            $('#uncancelWrapper:not(.preview)').remove();
            $('#uncancelWrapper.preview').hide();
        } else {
            $('#uncancel').html(lmConfig.cancelButtonText);
            htmlUtilService.displayBlock($('#uncancelWrapper'));
        }

        clientChatPageGenerateInputs(lmConfig.fields, '.offlineFields');
        appendTip('.offlineFields', 'offlineFieldsReqDescr');
    }

    if (customFormConfig) {
        if (customFormConfig.title) {
            $('#agent-name').html(customFormConfig.title);
            $('#min_agent_name').html(customFormConfig.title);
        }
        frameHeight = previewMode ? getFrameHeight(cwConfig.height, window.innerHeight) : getFrameHeight(cwConfig.height, window.parent.innerHeight);
        var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
        if (!isChatMinimized) {
            $spChatFrame.css({'height' : frameHeight, 'width' : cwConfig.width});
        }
        clientChatPageGenerateInputs(customFormConfig.fields, '.customFormFields');
        $('#custom_submit').val(customFormConfig.submitButtonText);
        $('#custom_cancel').text(customFormConfig.cancelButtonText);
        $('#agent-name').attr('data-original-name', $('#agent-name').text());
        $('#agent-name').text(customFormConfig.title);
        $('#header-avatar-container .avatar').css({'display': 'none'});
        appendTip('.customFormFields', 'customFormFieldsReqDescr');
    }
    scaleProactiveOffer();

    updateChatStyles(cwConfig, styles);

    if ($.fn.perfectScrollbar) {
        setTimeout(function () {
            $('.questionFormInner').perfectScrollbar({useBothWheelAxes: false});
            $('.offlineFields').perfectScrollbar({useBothWheelAxes: false});
            $('.custom-form-fields').perfectScrollbar({useBothWheelAxes: false});
            $('.questionFormFieldsWrapper').perfectScrollbar({useBothWheelAxes: false});
        }, 100);
    }

    if (previewMode) {

        if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling) {
            var isRoundButton = fullConf.widget.chatWidgetStyling.tabStyle === 'round';
            if (isRoundButton) {
                document.querySelector('#sp-chat-widget .sp-round-button').style.display = '';
                document.querySelector('#sp-chat-widget .sp-chat-widget__content').style.display = 'none';
            } else {
                document.querySelector('#sp-chat-widget .sp-chat-widget__content').style.display = '';
                document.querySelector('#sp-chat-widget .sp-round-button').style.display = 'none';
            }
        }
    }
};
