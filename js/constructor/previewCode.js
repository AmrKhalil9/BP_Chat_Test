var constructorPreviewCode = function () {
    var variables = snippetVariables();
    var chatPath = widgetConfiguration.getChatPath();
    var fullConf = JSON.parse(sessionStorage.getItem("fullConf"));
    var isRoundButton = false;
    var i18n = clientChatUiI18n();
    if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling) {
        isRoundButton = fullConf.widget.chatWidgetStyling.tabStyle === 'round';
    }
    return (
        '<div id="preview">'+
            '<div class="chat-preview-content">'+
                '<div id="sp-chat-widget">'+
                    '<div class="sp-round-button main-background-color second-fill-color" style="' + (isRoundButton ? '' : 'display:none') + '">'+
                        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 74 74"><path transform="scale(1.3) translate(15 15)" d="M14,2C7.458,2,2,6.769,2,12.8S7.458,23.6,14,23.6c.415,0,.8-.083,1.2-.122v3.834l1.849-1.186c2.595-1.665,8.213-5.988,8.883-12.192A9.906,9.906,0,0,0,26,12.8C26,6.769,20.542,2,14,2Zm0,2.4c5.389,0,9.6,3.828,9.6,8.4a7.5,7.5,0,0,1-.052.867v0l0,0c-.415,3.841-3.489,6.857-5.946,8.824V20.687l-1.437.291A10.918,10.918,0,0,1,14,21.2c-5.389,0-9.6-3.828-9.6-8.4S8.611,4.4,14,4.4Z"/></svg>'+
                    '</div>'+
                    '<div class="sp-chat-widget__content main-background-color contact-tab-border" style="' + (isRoundButton ? 'display:none' : '') + '">'+
                        '<div id="sp-chat-label-icon"></div>'+
                        '<div id="sp-chat-label-text" class="base-font contact-tab-font second-color">text</div>'+
                    '</div>'+
                '</div>'+
                '<div class="proactive-offer base-font position_center">'+
                    '<div class="widget-border widget-border-radius">'+
                        '<div class="proactive-offer__body widget-background">'+
                            '<div class="proactive-offer__close-wrapper"><svg class="proactive-offer__close close-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path clip-rule="evenodd" d="M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z" /></svg></div>'+
                            '<div class="proactive-offer__content-wrapper">'+
                                '<div class="proactive-offer__content"></div>'+
                                '<div class="proactive-offer__button-wrapper">'+
                                    '<button class="button-primary proactive-offer__button proactive-offer__close main-background-color second-color"></button>' +
                                    '<button class="button-primary proactive-offer__button proactive-offer__button_type_chat main-background-color second-color"></button>'+
                                    '<button class="button-primary proactive-offer__button proactive-offer__button_type_call main-background-color second-color"></button>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
                '<div id="sp-chat-frame" class="base-font">'+
                    '<div id="sp-drag-handle"></div>'+
                    '<div id="sp-side-bar">'+
                        '<div id="sp-close-frame" class="close-icon">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" class="main-path-color" width="15" height="15"><path clip-rule="evenodd" d="M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z" /></svg>' +
                        '</div>'+
                    '</div>'+
                    '<div id="sp-iframe-container">'+
                        '<div id="sp-chat-iframe2" class="widget-border-radius dialog-shadow">'+
                            '<div id="inner-chat" class="widget-border widget-border-radius base-font">'+
                                '<div id="servicepatternsite-iframe-chat">'+
                                    '<div id="header-avatar" class="main-background-color">'+
                                        '<div id="header-avatar-container">'+
                                            '<div class="has-avatar">'+
                                                '<div class="avatar">'+
                                                    '<div class="avatar-image-wrapper">'+
                                                        '<div class="avatar-image" style="background-image:url(' + variables.SP.chatPath + '/images/logo-big.png)"></div>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="info second-color title-font">'+
                                                    '<div id="agent-name" class="agent-name"></div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div class="clear"></div>'+
                                        '<div class="sound_player"></div>'+
                                        '<div class="conversationOptions">' +
                                            '<div id="callMe" class="main-path-color">'+
                                                '<svg class="startCall" xmlns="http://www.w3.org/2000/svg" width="20" height="19.001"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.246 14.774l-.258.119.012.108c0 1.656-1.343 3-3 3h-2.101c-.208.58-.748 1-1.399 1s-1.191-.42-1.399-1h-.101v-1h.101c.208-.58.748-1 1.399-1s1.191.42 1.399 1h1.101c1.36 0 2.496-.912 2.863-2.153-.507-.24-.863-.748-.863-1.347v-5c0-.829.672-1.5 1.5-1.5.277 0 .523.096.746.228 1.594.526 2.754 2.002 2.754 3.772s-1.16 3.247-2.754 3.773zm-.246-6.273c0-.276-.224-.5-.5-.5s-.5.225-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5v-5zm1 .315v4.371c.602-.545 1-1.309 1-2.186 0-.876-.398-1.64-1-2.185zm-8-7.816c-3.313 0-6 2.688-6 6.001h-1c0-3.866 3.134-7.001 7-7.001s7 3.135 7 7.001h-1c0-3.313-2.687-6.001-6-6.001zm-5 7.501v5c0 .828-.672 1.5-1.5 1.5-.277 0-.523-.096-.746-.228-1.594-.525-2.754-2.002-2.754-3.772s1.16-3.247 2.754-3.772c.223-.132.469-.228.746-.228.828 0 1.5.672 1.5 1.5zm-3 .315c-.602.545-1 1.309-1 2.185 0 .877.398 1.641 1 2.186v-4.371zm2-.315c0-.276-.224-.5-.5-.5s-.5.225-.5.5v5c0 .276.224.5.5.5s.5-.224.5-.5v-5z"/></svg>'+
                                            '</div>'+
                                            '<div id="minimizeChat" class="main-stroke-color" style="display: none;">'+
                                                '<svg class="minimizeChat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><line x1="0" y1="30" x2="32" y2="30" stroke-width="2"></line></svg>'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>'+
                                    '<form id="content-form" method="POST"></form>'+
                                    '<div id="offline-form">'+
                                        '<div id="offline-form-inner">'+
                                            '<div id="preChatForm" class="question__chat-tab_active agent-message">'+
                                                '<div class="tabs">'+
                                                    '<div class="tab tab_active tabChat main-color widget-background"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="17"><path clip-rule="evenodd" d="M15.001 12.001h-3.601l-6.4 5v-5h-1c-.552 0-1-.447-1-1v-7c0-.552.448-1 1-1h11c.552 0 1 .448 1 1v7c.001.553-.447 1-.999 1zm-1-7h-9.001v5h2v3.391l3.827-3.391h3.174v-5zm-12.001 3.999h-1c-.552 0-1-.448-1-1v-7c0-.553.448-1 1-1h9c.552 0 1 .447 1 1v1h-9v7z" fill="none"/></svg><span>Chat</span></div>'+
                                                    '<div class="tab tabChat"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="17"><path clip-rule="evenodd" d="M15.001 12.001h-3.601l-6.4 5v-5h-1c-.552 0-1-.447-1-1v-7c0-.552.448-1 1-1h11c.552 0 1 .448 1 1v7c.001.553-.447 1-.999 1zm-1-7h-9.001v5h2v3.391l3.827-3.391h3.174v-5zm-12.001 3.999h-1c-.552 0-1-.448-1-1v-7c0-.553.448-1 1-1h9c.552 0 1 .447 1 1v1h-9v7z" fill="none"/></svg><span>Chat</span></div>'+

                                                    '<div class="tab tab_active tabPhone main-color widget-background"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17"><path clip-rule="evenodd" d="M12.492 17c-.444 0-.883-.075-1.302-.224-5.191-1.836-9.303-6.056-11.001-11.289-.509-1.573.032-3.302 1.346-4.305l.838-.639c.465-.355 1.022-.543 1.609-.543 1 0 1.905.553 2.363 1.444l1.417 2.751c.134.262.206.555.206.848 0 .466-.174.912-.49 1.256l-.295.321c-.293.318-.357.791-.159 1.175.484.937 1.235 1.688 2.174 2.171.377.196.864.129 1.175-.157l.321-.295c.56-.514 1.432-.632 2.105-.285l2.754 1.415c.893.458 1.447 1.362 1.447 2.362 0 .701-.271 1.363-.768 1.865l-.958.969c-.728.738-1.742 1.16-2.782 1.16zm-8.51-15.407c-.235 0-.457.075-.642.216l-.838.639c-.777.594-1.097 1.618-.796 2.549 1.545 4.765 5.289 8.607 10.017 10.279.828.293 1.803.068 2.418-.555l.958-.97c.198-.201.308-.466.308-.745 0-.399-.223-.762-.58-.945l-2.754-1.415c-.111-.057-.246-.007-.299.041l-.321.295c-.793.728-2.025.895-2.983.4-1.235-.636-2.226-1.624-2.861-2.858-.503-.976-.342-2.173.4-2.981l.294-.32c.032-.035.07-.094.07-.179l-.029-.12-1.416-2.752c-.183-.358-.546-.579-.946-.579z" /></svg><span>Phone</span></div>'+
                                                    '<div class="tab tabPhone"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17"><path clip-rule="evenodd" d="M12.492 17c-.444 0-.883-.075-1.302-.224-5.191-1.836-9.303-6.056-11.001-11.289-.509-1.573.032-3.302 1.346-4.305l.838-.639c.465-.355 1.022-.543 1.609-.543 1 0 1.905.553 2.363 1.444l1.417 2.751c.134.262.206.555.206.848 0 .466-.174.912-.49 1.256l-.295.321c-.293.318-.357.791-.159 1.175.484.937 1.235 1.688 2.174 2.171.377.196.864.129 1.175-.157l.321-.295c.56-.514 1.432-.632 2.105-.285l2.754 1.415c.893.458 1.447 1.362 1.447 2.362 0 .701-.271 1.363-.768 1.865l-.958.969c-.728.738-1.742 1.16-2.782 1.16zm-8.51-15.407c-.235 0-.457.075-.642.216l-.838.639c-.777.594-1.097 1.618-.796 2.549 1.545 4.765 5.289 8.607 10.017 10.279.828.293 1.803.068 2.418-.555l.958-.97c.198-.201.308-.466.308-.745 0-.399-.223-.762-.58-.945l-2.754-1.415c-.111-.057-.246-.007-.299.041l-.321.295c-.793.728-2.025.895-2.983.4-1.235-.636-2.226-1.624-2.861-2.858-.503-.976-.342-2.173.4-2.981l.294-.32c.032-.035.07-.094.07-.179l-.029-.12-1.416-2.752c-.183-.358-.546-.579-.946-.579z" /></svg><span>Phone</span></div>'+
                                                '</div>'+
                                                '<div class="questionFormInner ps-container widget-background">'+
                                                    '<div class="fieldsWrapper">'+
                                                        '<div class="commonFields"></div>'+
                                                        '<div class="chatFields"></div>'+
                                                        '<div class="phoneFields"></div>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="prechat__action-buttons base-font">'+
                                                    '<input id="cancelPreChatForm" type="button" value="Cancel" class="button-primary cancel main-background-color second-color preview">'+
                                                    '<input id="submitChat" type="button" value="Call tab" class="button-primary accept main-background-color second-color">'+
                                                    '<input id="submitPhone" type="button" value="Phone tab" class="button-primary phone main-background-color second-color">'+
                                                '</div>'+
                                            '</div>'+
                                            '<div id="unavailableForm">'+
                                                '<div id="offline-form-fields" class="ps-container">'+
                                                    '<div class="offlineFields"></div>'+
                                                    '<div class="buttons">'+
                                                        '<div id="uncancelWrapper" class="left-button preview">'+
                                                            '<button id="uncancel" class="servicepatternBtn cancel main-background-color second-color">Cancel</button>'+
                                                        '</div>'+
                                                        '<div>'+
                                                            '<input id="unsubmit" type="button" value="Send" class="servicepatternBtn main-background-color second-color">'+
                                                        '</div>'+
                                                    '</div>'+
                                                    '<div class="clear"></div>'+
                                                    '<div class="ps-scrollbar-x-rail" style="left: 0px; bottom: 3px;"><div class="ps-scrollbar-x" style="left: 0px; width: 0px;"></div></div><div class="ps-scrollbar-y-rail" style="top: 0px; right: 3px;"><div class="ps-scrollbar-y" style="top: 0px; height: 0px;"></div></div></div>'+
                                            '</div>'+
                                            '<div id="surveyForm" style="display: none;">'+
                                                '<div class="field-wrapper serviceSurvey">'+
                                                    '<div class="description">Did we provide the service you were looking for?</div>'+
                                                    '<input type="radio" name="service" id="service-1" value="1" checked="checked">'+
                                                    '<label for="service-1">yes</label>'+
                                                    '<input type="radio" name="service" id="service-0" value="0">'+
                                                    '<label for="service-0">no</label>'+
                                                '</div>'+
                                                '<div class="field-wrapper helpfulSurvey radioStars">'+
                                                    '<div class="description">How helpful was our representative?</div>'+
                                                    '<div class="stars">'+
                                                        '<input type="radio" name="helpful" id="helpful-1" value="2"><label for="helpful-1"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-2" value="4"><label for="helpful-2"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-3" value="6"><label for="helpful-3"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-4" value="8"><label for="helpful-4"></label>'+
                                                        '<input type="radio" name="helpful" id="helpful-5" value="10"><label for="helpful-5"></label>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="field-wrapper recommendSurvey radioStars">'+
                                                    '<div class="description">How likely are you to recommend our products and services in the future?</div>'+
                                                    '<div class="stars">'+
                                                        '<input type="radio" name="recommend" id="recommend-1" value="2"><label for="recommend-1"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-2" value="4"><label for="recommend-2"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-3" value="6"><label for="recommend-3"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-4" value="8"><label for="recommend-4"></label>'+
                                                        '<input type="radio" name="recommend" id="recommend-5" value="10"><label for="recommend-5"></label>'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="field-wrapper transcriptSurvey">'+
                                                    '<input type="checkbox" name="transcript" id="transcript" value="1">'+
                                                    '<label for="transcript" class="description small">Send me transcript of the chat by email?</label>'+
                                                '</div>'+
                                                '<div class="field-wrapper emailSurvey">'+
                                                    '<div class="description">Your email*</div>'+
                                                    '<input type="text" name="transcriptEmail" id="transcriptEmail"/>'+
                                                '</div>'+
                                                '<div class="buttons" style="margin-top: -10px;">'+
                                                    '<div>'+
                                                        '<input id="submitSurvey" type="button" value="Submit" class="servicepatternBtn main-background-color second-color">'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                            '<div id="customForm">'+
                                                '<div class="custom-form-fields ps-container widget-background">'+
                                                    '<div class="customFormFields">'+
                                                    '</div>'+
                                                '</div>'+
                                                '<div class="buttons">'+
                                                    '<div class="left-button">'+
                                                        '<button id="custom_cancel" class="servicepatternBtn cancel main-background-color second-color">Cancel</button>'+
                                                    '</div>'+
                                                    '<div>'+
                                                        '<input id="custom_submit" type="button" value="Send" class="servicepatternBtn main-background-color second-color">'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>'+
                                    '<div id="chat-body" class="widget-background">'+
                                        '<div class="chat-body__content">'+
                                            '<video id="video" style="display: none; height: 100px; width: 100%" autoplay=""></video>'+
                                            '<div id="notification-prompt" style="display: none;" class="promptMessage">When'+
                                                'prompted, please'+
                                                'allow notifications from this window, so you could see responses when this window is'+
                                                'hidden.'+
                                            '</div>'+
                                            '<div id="call-controls" class="widget-background" style="display: none;">'+
                                                '<div id="call-controls_before-call" style="display: none;">'+
                                                    '<p class="second-color">Accept <span>video</span> call from <span class="agent-name">[Agent name]</span></p>'+
                                                    '<button id="call-controls_accept" class="servicepatternBtn second-color">Accept</button>'+
                                                    '<button id="call-controls_reject" class="servicepatternBtn second-color">Reject</button>'+
                                                '</div>'+
                                                '<div id="call-controls_in-call" style="display: none;">'+
                                                    '<button id="call-controls_mute-audio" class="servicepatternBtn second-color">'+
                                                        '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><path fill="#fff" d="M11.615 26.764a.373.373 0 110-.745h3.522v-3.963a6.18 6.18 0 01-5.927-6.048v-3.717a.381.381 0 01.388-.37.381.381 0 01.392.37v3.714a5.44 5.44 0 005.54 5.322 5.683 5.683 0 002.606-.628l.385.635a6.476 6.476 0 01-2.6.719v3.963h3.524a.373.373 0 110 .745zM9.19 4.003l.776-.512 13.77 22.636-.776.606zm2.505 12.2v-6.124l5.66 9.342a3.913 3.913 0 01-1.829.465 3.758 3.758 0 01-3.831-3.68zm8.627 2.455a5.135 5.135 0 00.744-2.653v-3.714a.388.388 0 01.776 0v3.713a5.851 5.851 0 01-1.079 3.378zM12.458 5.733a3.862 3.862 0 013.068-1.496 3.756 3.756 0 013.83 3.679v8.291a3.593 3.593 0 01-.078.74z"/></svg>'+
                                                    '</button>'+
                                                    '<button id="call-controls_mute-video" class="servicepatternBtn second-color">'+
                                                        '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><path d="M7.169 22.681a1.364 1.364 0 01-1.358-1.37v-9.594a1.36 1.36 0 011.263-1.361L19.2 22.587a1.33 1.33 0 01-.482.093zm1.817-12.334h9.731a1.364 1.364 0 011.358 1.37v9.594a1.348 1.348 0 01-.02.2zM25.04 21.12l-3.605-3.236v-1.371h4.755v4.112a.683.683 0 01-.68.685.674.674 0 01-.47-.19zm-3.605-4.607v-1.366l3.626-3.255a.673.673 0 01.449-.171.683.683 0 01.68.685v4.111z" fill="#fff"/><path d="M6.829 7.264l17.322 17.473" stroke-miterlimit="10" fill="none" stroke="#fff"/></svg>'+
                                                    '</button>'+
                                                    '<button id="call-controls_end-call" class="servicepatternBtn second-color">'+
                                                        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="#db2828" d="M31.161 16.019A15.144 15.144 0 1116.02.875 15.144 15.144 0 0131.16 16.019"/><path fill="#fff" d="M17.548 13.267h-2.05c-.984 0-8.44.823-8.44 3.818 0 0 .16 2.29 1.1 2.29a14.105 14.105 0 003.316-.762c.683-.22.944-.503 1.125-1.548a1.65 1.65 0 011.733-1.448c.55-.026 1.438-.026 1.97-.024h.44c.53 0 1.42 0 1.968.024a1.65 1.65 0 011.729 1.447c.18 1.045.44 1.326 1.125 1.547a14.105 14.105 0 003.315.764c.945 0 1.1-2.292 1.1-2.292.009-2.993-7.447-3.816-8.431-3.816"/></svg>'+
                                                    '</button>'+
                                                '</div>'+
                                            '</div>'+
                                            '<div id="call-prompt" style="display: none;" class="promptMessage agent-message">When prompted, please'+
                                                'allow'+
                                                'access to your camera and microphone.'+
                                            '</div>'+
                                            '<div id="servicepattern-chat">'+
                                                '<div id="scrollbar-container">'+
                                                    '<div id="messages-div" class="viewport">'+
                                                        '<div id="messages-div-outer" class="ps-container">'+
                                                            '<div id="messages-div-inner" class="overview messages-div-inner"'+
                                                                 'style="bottom: 0px; top: auto;">'+
                                                                '<div class="new-msg-container agentMessage new-msg-animate agent-message">'+
                                                                    '<div class="pip agent-message base-font"></div>'+
                                                                    '<div class="new-msg-body agentMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text" style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner base-font">Please wait while we'+
                                                                                    ' are '+
                                                                                    'looking for an available representative...'+
                                                                                '</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div id=""'+
                                                                     'class="new-msg-container agentMessage new-msg-animate agent-message">'+
                                                                    '<div class="new-msg-body agentMessage">'+
                                                                        '<div class="pip agent-message base-font"></div>'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner base-font">Representative found. Connecting...'+
                                                                                '</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner agentJoinedMessage"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span>'+
                                                                                '</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container clientMessage new-msg-animate main-background-color">'+
                                                                    '<div class="pip main-background-color second-color"></div>'+
                                                                    '<div class="new-msg-body clientMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner second-color">User message</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container agentMessage new-msg-animate agent-message">'+
                                                                    '<div class="pip agent-message base-font"></div>'+
                                                                    '<div class="new-msg-body agentMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="agent-image-wrapper">' +
                                                                                    '<div class="agent-image-background-filler main-background-color"></div>'+
                                                                                    '<div class="agentImage previewAgentImage" style="background:url(' + chatPath + 'images/man-with-glasses.jpg) center center no-repeat/contain"></div>'+
                                                                                '</div>'+
                                                                                '<div class="new-msg-text-inner base-font">Agent message</div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time">00:00</div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner inactivityWarningText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner inactivityTimeoutText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner agentLeftText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div class="new-msg-container systemMessage new-msg-animate main-color">'+
                                                                    '<div class="new-msg-body systemMessage">'+
                                                                        '<div class="new-msg-body-inner">'+
                                                                            '<div class="new-msg-text " style="height: auto;">'+
                                                                                '<div class="new-msg-text-inner sessionEndedText"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path class="main-fill-color" d="M9.811 2.327l-4.023 4.056-.045.069c-.073.074-.159.126-.249.16l-.03.008-.159.031-.121-.002-.123-.024-.063-.02c-.085-.032-.165-.083-.233-.153l-1.265-1.273c-.27-.272-.27-.713 0-.985.271-.272.708-.272.978 0l.848.854 3.59-3.621c.247-.249.646-.249.895 0 .246.248.246.651 0 .9zm-4.848-.994c-2.01 0-3.64 1.642-3.64 3.667 0 2.026 1.63 3.667 3.64 3.667 1.828 0 3.337-1.358 3.596-3.127l1.303-1.312c.038.252.064.509.064.772 0 2.762-2.222 5-4.963 5s-4.963-2.238-4.963-5c0-2.761 2.222-5 4.963-5 .991 0 1.911.296 2.686.799l-.963.971c-.513-.278-1.1-.437-1.723-.437z"/></svg><span></span></div>'+
                                                                            '</div>'+
                                                                        '</div>'+
                                                                    '</div>'+
                                                                    '<div class="new-time"></div>'+
                                                                '</div>'+
                                                                '<div id="messages-div-inner-clear"></div>'+
                                                            '</div>'+
                                                            '<div class="ps-scrollbar-x-rail" style="left: 0px; bottom: 3px;">'+
                                                                '<div class="ps-scrollbar-x" style="left: 0px; width: 0px;"></div>'+
                                                            '</div>'+
                                                            '<div class="ps-scrollbar-y-rail" style="top: 0px; right: 0px;">'+
                                                                '<div class="ps-scrollbar-y" style="top: 0px; height: 0px;"></div>'+
                                                            '</div>'+
                                                        '</div>'+
                                                        '<div id="agent-typing" style="display: none;">'+
                                                            '<div class="agent-typing-wrapper"></div>'+
                                                        '</div>'+
                                                    '</div>'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                        '<div id="input-div" class="chat-body__input agent-message">'+
                                            '<div class="input-div-table">'+
                                                '<div class="td-textarea">'+
                                                    '<textarea id="input-field" data-emoji-input="unicode" data-emojiable="true" rows="1" name="input-field" maxlength="1000" placeholder="' + i18n.hintMessageTextBox + '" autocomplete="off" style="resize: none;"></textarea>'+
                                                '</div>'+
                                                '<i class="emoji-picker-icon emoji-picker fa fa-smile-o" data-type="picker"></i>'+
                                                '<div id="attachFile" class="preview"></div>'+
                                                '<div class="td-button">'+
                                                    '<input id="input-button" type="button" value="Send" class="servicepatternBtn accept">'+
                                                '</div>'+
                                            '</div>'+
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                                '<form name="file-upload-form" id="file-upload-form" target="_blank" method="post" enctype="multipart/form-data" style="display:none;"></form>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
                '<div class="sp-callback-form" id="sp-callback-form" class="sp-callback-form">'+
                   '<div class="fields">'+
                       '<label>Request a callback</label>'+
                       '<input type="text" id="sp-callback-test" placeholder="test" />'+
                       '<label>test</label>'+
                   '</div>'+
                   '<button id="sp-callback-submit">Chat</button>'+
                   '<button id="sp-callback-submit">Call</button>'+
                '</div>'+
            '</div>'+
        '</div>'
    );
};
