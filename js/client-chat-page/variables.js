var clientChatPageVariables = (function () {

    function getUrlVars(url) {
        var vars = {};
        var hash;
        var hashes = url.slice(url.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars[hash[0]] = decodeURIComponent(hash[1]);
        }
        return vars;
    }

    function checkAndCloseCustomForm(msg) {
        var sessionEvents = commonConstants.events.chat.session;
        if (msg && (msg.event === sessionEvents.SECURE_FORM_CANCEL || msg.event === sessionEvents.FORM_DATA_CANCEL)) {
            htmlUtilService.displayNone($('#customForm'));
        }
    }

    var variables = {
        cp: getUrlVars(window.location.href),
        currentFormName: '',
        currentFormRequestId: '',
        currentForm: null,
        extChatData: {},
        forms: {
            MobileChatCustomerData: {
                html: '',
                onShow: function () {
                    window.parent.postMessage('sp-chat-init', '*');
                    htmlUtilService.displayBlock($('#offline-form'));
                    var definition = widgetConfiguration.getDefinition();
                    $('#agent-name').text(definition.preChat.title);
                    $('#min_agent_name').text(definition.preChat.title);
                    var url;
                    if (window.chatSession) {
                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                $.chatUI.appendLog(event);
                                commonUtilService.saveLastEventTimestamp(event);
                                clientChatPageUpdateScrollbar();
                            }
                        });
                        url = window.chatSession.getProfilePhotoUrl();
                    }
                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                    window.parent.postMessage(JSON.stringify({
                        type: 'bp-update-agent-data',
                        data: {
                            name: definition.preChat.title,
                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                        }
                    }), '*');
                },
                onHide: function () {
                    htmlUtilService.displayNone($('#offline-form'));
                    htmlUtilService.displayNone($('#questionForm'));
                },
                onSubmit: function () {}
            },

            find_agent_form: {
                html: '',
                onShow: function () {
                    window.chatSession.sessionStatus = 'queued';

                    window.parent.postMessage('sp-chat-drag', '*');

                    var definition = widgetConfiguration.getDefinition();
                    if (definition && definition.chatWidgetStyling) {
                        $('#agent-name').text(definition.chatWidgetStyling.title);
                        $('#min_agent_name').text(definition.chatWidgetStyling.title);
                    }

                    htmlUtilService.displayBlock($('#chat-body'));
                    $('#chat-body').removeClass('sp-readonly');

                    $('#messages-div-outer').perfectScrollbar({useBothWheelAxes: false});
                    $('.min-scroll').perfectScrollbar({useBothWheelAxes: false});

                    if (window.chatSession) {

                        var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                        var url = window.chatSession.getProfilePhotoUrl();
                        if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                            $('.avatar-image').attr("style", "background-image:url('" + url + "')");
                            $('#min_agent_image').attr("style", "background-image:url('" + url + "')");
                            $('.avatar-image-wrapper').removeClass('collapse');
                            $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                        }
                        window.parent.postMessage(JSON.stringify({
                            type: 'bp-update-agent-data',
                            data: {
                                name: definition.chatWidgetStyling.title,
                                url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                            }
                        }), '*');

                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                var definition = widgetConfiguration.getDefinition();
                                $.chatUI.appendLog(event);
                                clientChatPageUpdateScrollbar();
                                commonUtilService.saveLastEventTimestamp(event);
                                if (definition && definition.chatWidgetStyling) {
                                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                                    if (window.chatSession.internalParty) {
                                        $('#agent-name').text(window.chatSession.internalParty.displayName);
                                        $('.agent-name').text(window.chatSession.internalParty.displayName);
                                        $('#min_agent_name').text(window.chatSession.internalParty.displayName);
                                        $('.avatar-image-wrapper').removeClass('collapse');
                                        $('#agent-name').attr('title', $('#agent-name').text());
                                        $('#min_agent_name').attr('title', $('#agent-name').text());
                                    } else {
                                        $('#agent-name').text(definition.chatWidgetStyling.title);
                                        $('#min_agent_name').text(definition.chatWidgetStyling.title);
                                    }
                                    var agentId = window.chatSession.internalParty ? window.chatSession.internalParty.id : undefined;
                                    var url = window.chatSession.getProfilePhotoUrl(agentId);
                                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                                        $('.avatar-image').attr("style", "background-image:url('" + url + "')");
                                        $('#min_agent_image').attr("style", "background-image:url('" + url + "')");
                                        $('.avatar-image-wrapper').removeClass('contain');
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                                    }
                                    if (showAgentPic === 'none') {
                                        $('#header-avatar .avatar').hide();
                                        $('#min_agent_image').hide();
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                                    }
                                }

                                window.parent.postMessage(JSON.stringify({
                                    type: 'bp-update-agent-data',
                                    data: {
                                        name: window.chatSession.internalParty ? window.chatSession.internalParty.displayName : definition.chatWidgetStyling.title,
                                        url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                                    }
                                }), '*');
                            }
                        });
                    }
                },
                onHide: function () {
                    window.chatSession.sessionStatus = undefined;
                    htmlUtilService.displayNone($('#chat-body'));
                },
                onSubmit: function () {}
            },

            start_form: {
                html: '',
                onShow: function () {
                    window.parent.postMessage('sp-chat-drag', '*');

                    htmlUtilService.displayBlock($('#chat-body'));
                    $('#chat-body').removeClass('sp-readonly');

                    $('#messages-div-outer').perfectScrollbar({useBothWheelAxes: false});
                    $('.min-scroll').perfectScrollbar({useBothWheelAxes: false});

                    if (window.chatSession) {
                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                $.chatUI.appendLog(event);
                                clientChatPageUpdateScrollbar();
                            }
                        });
                    }
                    
                    var definition = widgetConfiguration.getDefinition();
                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                    var url = window.chatSession.getProfilePhotoUrl();
                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                        $('.avatar-image').attr('style', "background-image:url('" + url + "')");
                        $('.min_agent_image').attr('style', "background-image:url('" + url + "')");
                        $('.avatar-image-wrapper').removeClass('contain');
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                    }
                    if (showAgentPic === 'none') {
                        $('#header-avatar .avatar').hide();
                        $('.min_agent_image').hide();
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                    }
                    window.parent.postMessage(JSON.stringify({
                        type: 'bp-update-agent-data',
                        data: {
                            name: definition.chatWidgetStyling.title,
                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                        }
                    }), '*');
                },
                onHide: function (formName, msg) {
                    htmlUtilService.displayNone($('#chat-body'));
                    checkAndCloseCustomForm(msg);
                },
                onSubmit: function () {}
            },

            connect_chat_form: {
                html: '',

                onShow: function () {
                    var definition = widgetConfiguration.getDefinition();
                    window.chatSession.sessionStatus = 'connected';
                    htmlUtilService.displayBlock($('#chat-body'));
                    $('#callMe').removeClass('hang-up');

                    var connection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;

                    if (definition && definition.chatWidgetStyling.videoCallEnabled === false) {
                        $('#callMe').remove();
                    } else {
                        $('#callMe').css('display', (connection) ? 'flex' : 'none');
                    }

                    if (definition && definition.chatWidgetStyling.visitorVideoEnabled === false) {
                        $('#call-controls_mute-video, #myCam').remove();
                    }

                    if (definition && definition.chatWidgetStyling.widgetMinimizationEnabled === undefined || definition.chatWidgetStyling.widgetMinimizationEnabled === true) {
                        $('#minimizeChat').css('display', 'flex');
                    } else {
                        $('#minimizeChat').css('display', 'none');
                    }

                    if (commonUtilService.stringIsTrue(clientChatPageGetUrlVars(window.location.href)['togetherjs_enabled'])) {
                        htmlUtilService.displayFlex($('#shareScreen'));
                    }

                    htmlUtilService.displayBlock($('#endChat'));
                    $('#chat-body').removeClass('sp-readonly');

                    $('#messages-div-inner').css({'bottom': '0', 'top': 'auto'});

                    $('#messages-div-outer').perfectScrollbar({useBothWheelAxes: false});
                    $('.min-scroll').perfectScrollbar({useBothWheelAxes: false});
                    clientChatPageUpdateScrollbar();


                    window.parent.postMessage('sp-get-status-together', '*');

                    if (window.chatSession) {
                        if (definition && definition.chatWidgetStyling.webNotificationsEnabled === true) {
                            window.parent.postMessage('sp-session-start', '*'); //request web notifications
                        }

                        window.chatSession.reassignUICallbacks({
                            onLogEvent: function (event) {
                                var definition = widgetConfiguration.getDefinition();

                                if (event.msg === '/ban') {
                                    var store = {
                                        action: 'sp-storage',
                                        key: 'bp-bc',
                                        value: '1'
                                    };
                                    window.parent.postMessage(JSON.stringify(store), '*');
                                    window.chatSession.disconnectSession();
                                    window.chatSession.endSession();
                                    return;
                                }

                                event = $.chatUI.appendLog(event);

                                commonUtilService.saveLastEventTimestamp(event);

                                var currentSessionHistoryLoaded = !window.chatSession.historyReceived || window.chatSession.historyRendered;
                                if (!event.history && currentSessionHistoryLoaded && event.fromClass !== 'me' && event.fromClass !== 'sys') {
                                    var profilePhotoUrl = event.profilePhotoUrl;
                                    if (definition && definition.chatWidgetStyling && definition.chatWidgetStyling.showAgentPic === 'none') {
                                        profilePhotoUrl = '';
                                    }
                                    var a = {
                                        action: 'sp-notification',
                                        photo: profilePhotoUrl,
                                        msg: event.buttonsData ? event.buttonsData.message : event.originalMsg,
                                        name: event.fromName
                                    };
                                    window.parent.postMessage(JSON.stringify(a), '*');
                                }

                                if (definition && definition.chatWidgetStyling) {
                                    var titleText = window.chatSession.internalParty ? window.chatSession.internalParty.displayName : definition.chatWidgetStyling.title;
                                    $('#agent-name').text(titleText);
                                    $('#min_agent_name').text(titleText);
                                    $('#agent-name').attr('title', $('#agent-name').text());
                                    $('#min_agent_name').attr('title', $('#agent-name').text());
                                    var agentId = window.chatSession.internalParty ? window.chatSession.internalParty.id : undefined;
                                    var url = window.chatSession.getProfilePhotoUrl(agentId);
                                    var showAgentPic = definition.chatWidgetStyling.showAgentPic;
                                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                                        $('.avatar-image').attr('style', "background-image:url('" + url + "')");
                                        $('.min_agent_image').attr('style', "background-image:url('" + url + "')");
                                        $('.avatar-image-wrapper').removeClass('contain');
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                                    }
                                    if (showAgentPic === 'none') {
                                        $('#header-avatar .avatar').hide();
                                        $('.min_agent_image').hide();
                                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                                    }
                                    window.parent.postMessage(JSON.stringify({
                                        type: 'bp-update-agent-data',
                                        data: {
                                            name: titleText,
                                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                                        }
                                    }), '*');
                                }
                                if (currentSessionHistoryLoaded && event.event && event.event === 'chat_session_secure_form_show') {
                                    var index = -1;
                                    var i18n = clientChatUiI18n();
                                    variables.currentFormRequestId = event.form_request_id;
                                    if (definition) {
                                        for (var key in definition.forms) {
                                            if (definition.forms.hasOwnProperty(key) && definition.forms[key].id == event.form_id) {
                                                index = key;
                                            }
                                        }
                                        var customFormConfig = definition.forms[index];
                                        clientChatPageGenerateInputs(customFormConfig.fields, '.customFormFields');
                                        $('.customFormFields *[required="true"]').parents('.customFormFields').append('<div class="reqDescr">' + i18n.refersToRequiredFields + '</div>');
                                        $('#customForm').css('display', 'block');
                                        $('#customForm').addClass('secure');
                                        $('#customFormFields').scrollTop(0);
                                        $('#custom_submit').val(customFormConfig.submitButtonText);
                                        $('#custom_cancel').text(customFormConfig.cancelButtonText);
                                        $('#agent-name').attr('data-original-name', $('#agent-name').text());
                                        $('#agent-name').text(customFormConfig.title);
                                        $('#header-avatar-container .avatar').css({'display': 'none'});
                                    }
                                }
                                clientChatPageUpdateScrollbar();
                            },
                            onSessionTyping: function (a) {
                                var i18n = clientChatUiI18n();
                                $('#agent-typing').css('display', 'block');
                                var agentTypingMessage = i18n.agentTypingIndicator;
                                if (commonUtilService.includes(agentTypingMessage, '$(name)')) {
                                    agentTypingMessage = agentTypingMessage.replace('$(name)', a.displayName);
                                }
                                if (commonUtilService.includes(agentTypingMessage, '$(firstName)')) {
                                    agentTypingMessage = agentTypingMessage.replace('$(firstName)', a.firstName || a.displayName);
                                }
                                if (commonUtilService.includes(agentTypingMessage, '$(lastName)')) {
                                    agentTypingMessage = agentTypingMessage.replace('$(lastName)', a.lastName || a.displayName);
                                }
                                $('.agent-typing-wrapper').text(agentTypingMessage);
                            },
                            onSessionNotTyping: function () {
                                $('#agent-typing').css('display', 'none');
                            },
                            onAddLocalStream: function (stream) {
                                var video2 = $('#myCam');
                                try {
                                    video2.attr('src', URL.createObjectURL(stream));
                                } catch (e) {
                                    try {
                                        video2.prop('srcObject', stream);
                                    } catch (b) {
                                    }
                                }

                                if (window.bpWidgetMain && window.bpWidgetMain.onLocalStream) {
                                    window.bpWidgetMain.onLocalStream(stream, window.chatSession ? window.chatSession.webRTC : null);
                                }
                            },
                            onAddStream: function (stream) {
                                var $video = $('#video');
                                var $callMode = $('#callMode');

                                try {
                                    $video.attr('src', URL.createObjectURL(stream));
                                } catch (e) {
                                    try {
                                        $video.prop('srcObject', stream);
                                    } catch (b) {
                                    }
                                }

                                window.chatSession.webRTC.muteVideo();
                                // $('#callMe').addClass('hang-up');
                                $callMode.addClass('enabled');

                                if (window.bpWidgetMain && window.bpWidgetMain.setWebRtcApi && window.chatSession) {
                                    window.bpWidgetMain.setWebRtcApi(window.chatSession.webRTC);
                                }

                                var callMode = sessionStorage.getItem('callMode');
                                if (typeof callMode !== 'undefined' && callMode === 'voice') {
                                    $callMode.addClass('voice');
                                    // $('#servicepattern-chat').css('top', '35px');
                                }
                                // clientChatPageUpdateScrollbar();

                                // if (false) { // turn on to maximize video session
                                //     htmlUtilService.displayNone($('#servicepattern-chat'));
                                //     htmlUtilService.displayNone($('#input-div'));
                                //     $video.css({
                                //         position: "absolute",
                                //         width: "100%",
                                //         height: "100%",
                                //         left: "0",
                                //         right: "0",
                                //         top: "0",
                                //         bottom: "0",
                                //         padding: "0",
                                //     });
                                //     window.parent.postMessage('sp-chat-maximize-on', '*');
                                // }
                            },
                            hideChatInput: function () {
                                htmlUtilService.displayNone($('#input-div'));
                                $('#chat-body').addClass('sp-readonly');
                            },
                            showChatInput: function () {
                                htmlUtilService.displayBlock($('#input-div'));
                                $('#chat-body').removeClass('sp-readonly');
                            },
                        });
                    }
                },
                onHide: function (formName, msg) {
                    checkAndCloseCustomForm(msg);
                    window.chatSession.sessionStatus = undefined;
                    $('#endChat').css('display', 'none');
                    $('#chat-body').css('display', 'none');
                    $('#video').css('display', 'none');
                    $('#servicepattern-chat').css('top', '0');
                    $('#callMe').css('display', 'none');
                    $('#shareScreen').css('display', 'none');
                    $('#minimizeChat').css('display', 'none');

                    var definition = widgetConfiguration.getDefinition();
                    var showAgentPic = definition && definition.chatWidgetStyling.showAgentPic
                    if (showAgentPic === 'show' || showAgentPic === 'always_default') {
                        var url = window.chatSession.getProfilePhotoUrl();
                        $('.avatar-image').attr('style', 'background-image:url("' + url + '")');
                        $('.min_agent_image').attr('style', 'background-image:url("' + url + '")');
                        $('.avatar-image-wrapper').addClass('contain');
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').removeClass('narrow');
                    } else if (showAgentPic === 'none') {
                        $('#header-avatar .avatar').hide();
                        $('#min_agent_image').hide();
                        $('#header-avatar, #sp-close-frame, #chat-body, #inner-chat, #sp-drag-handle, .conversationOptions').addClass('narrow');
                    }
                    clientChatPageUpdateScrollbar();
                },
                onSubmit: function () {
                    this.submitForm();
                },
                submitForm: function () {
                    window.chatSession.sendFormData(variables.currentFormRequestId, variables.currentFormName, {});
                }
            },

            chat_unavailable_form: {
                html: '',
                onShow: function () {
                    variables.currentFormName = 'chat_unavailable_form';
                    window.chatSession.sessionStatus = undefined;
                    htmlUtilService.displayBlock($('#offline-form'));
                    htmlUtilService.displayBlock($('#unavailableForm'));
                },
                onHide: function (formName, msg) {

                },
                onSubmit: function () {}
            },

            custom_form: {
                html: '',
                onShow: function (form_name) {
                    var definition = widgetConfiguration.getDefinition();
                    var index = -1;
                    var i18n = clientChatUiI18n();
                    if (definition) {
                        for (var key in definition.forms) {
                            if (definition.forms.hasOwnProperty(key) && definition.forms[key].name == form_name) {
                                index = key;
                            }
                        }
                        if (index !== -1) {
                            var customFormConfig = definition.forms[index];
                            if (customFormConfig && customFormConfig.title) {
                                $('#agent-name').html(customFormConfig.title);
                                $('#min_agent_name').html(customFormConfig.title);
                            }
                            clientChatPageGenerateInputs(customFormConfig.fields, '.customFormFields');
                            $('.customFormFields *[required="true"]').parents('.customFormFields').append('<div class="reqDescr">' + i18n.refersToRequiredFields + '</div>');
                            htmlUtilService.displayBlock($('#offline-form'));
                            htmlUtilService.displayBlock($('#customForm'));
                            $('#custom_submit').val(customFormConfig.submitButtonText);
                            $('#custom_cancel').text(customFormConfig.cancelButtonText);
                            $('#agent-name').attr('data-original-name', $('#agent-name').text());
                            $('#agent-name').text(customFormConfig.title);
                            $('#header-avatar-container .avatar').css({'display': 'none'});

                            var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                            var url = window.chatSession.getProfilePhotoUrl();
                            window.parent.postMessage(JSON.stringify({
                                type: 'bp-update-agent-data',
                                data: {
                                    name: customFormConfig.title,
                                    url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                                }
                            }), '*');
                        } else {
                            window.chatSession.sendFormData(variables.currentFormRequestId, form_name, 'Form not found');
                        }
                    }
                },
                onHide: function (formName, msg) {
                    checkAndCloseCustomForm(msg);
                },
                onSubmit: function (form_name) {
                    $('#agent-name').text($('#agent-name').attr('data-original-name'));
                    $('#agent-name').attr('data-original-name', '');
                    $('#header-avatar-container .avatar').css({'display': ''});
                }
            },

            survey_form: {
                html: '',
                onShow: function () {
                    var i18n = clientChatUiI18n();
                    window.parent.postMessage('sp-chat-init', '*');
                    htmlUtilService.displayBlock($('#offline-form'));
                    htmlUtilService.displayBlock($('#surveyForm'));
                    $('#agent-name').text(i18n.surveyFormTitle);
                    $('#min_agent_name').text(i18n.surveyFormTitle);
                    $('#agent-name').attr('title', $('#agent-name').text());
                    $('#min_agent_name').attr('title', $('#agent-name').text());
                    $('#transcriptEmail').val(variables.extChatData.email);

                    var showAgentPic = definition.chatWidgetStyling.showAgentPic || '';
                    var url = window.chatSession.getProfilePhotoUrl();
                    window.parent.postMessage(JSON.stringify({
                        type: 'bp-update-agent-data',
                        data: {
                            name: i18n.surveyFormTitle,
                            url: (showAgentPic === 'show' || showAgentPic === 'always_default') ? url : undefined
                        }
                    }), '*');
                },
                onHide: function (formName, msg) {
                    htmlUtilService.displayNone($('#offline-form'));
                    htmlUtilService.displayNone($('#surveyForm'));
                },
                onSubmit: function () {},
                submitForm: function () {}
            },

            MobileChatSurvey: {
                html: '',
                onShow: function () {
                    var i18n = clientChatUiI18n();
                    window.parent.postMessage('sp-chat-init', '*');
                    htmlUtilService.displayBlock($('#offline-form'));
                    htmlUtilService.displayBlock($('#surveyForm'));
                    $('#agent-name').text(i18n.surveyFormTitle);
                    $('#min_agent_name').text(i18n.surveyFormTitle);
                    $('#agent-name').attr('title', $('#agent-name').text());
                    $('#min_agent_name').attr('title', $('#agent-name').text());
                    $('#transcriptEmail').val(variables.extChatData.email);
                },
                onHide: function (formName, msg) {
                    htmlUtilService.displayNone($('#offline-form'));
                    htmlUtilService.displayNone($('#surveyForm'));
                },
                onSubmit: function () {},
                submitForm: function () {}
            }

        }
    };

    return variables;
})();
