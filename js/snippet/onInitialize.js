var snippetOnInitialize = function () {
    var variables = snippetVariables();
    var helper = snippetHelperFunctions();
    var head = document.querySelector('head');
    var body = document.querySelector('body');
    var spConfig = SERVICE_PATTERN_CHAT_CONFIG;
    var i18n = clientChatUiI18n();

    function loadCss(target, fileNames) {
        var chatPath = widgetConfiguration.getChatPath();
        if (Array.isArray(fileNames)) {
            fileNames.forEach(function (fileName) {
                target.insertAdjacentHTML('beforeend', "<link href='" + chatPath + "css/" + fileName + ".css' type='text/css' rel='stylesheet' />");
            });
        }
    }

    function initializePreview() {
        window.parent.postMessage("initialization", "*");
        var code = constructorPreviewCode();
        var spChatWidget = document.getElementById('sp-chat-widget');
        loadCss(head, ['wrong', 'override', 'preview', 'proactive-offer', 'snippet']);
        body.insertAdjacentHTML('beforeend', code);
        if (spChatWidget) {
            spChatWidget.setAttribute("style", "");
        }
    }

    function startMinimized() {
        sessionStorage.setItem('bp-minimized', true);
        var spChatIframe = document.getElementById('sp-chat-iframe'),
            spDragHandle = document.getElementById('sp-drag-handle'),
            spSideBar = document.getElementById('sp-side-bar'),
            spChatFrame = document.getElementById('sp-chat-frame');
        if (spChatIframe) {
            spChatIframe.style.boxShadow = 'none';
            spChatIframe.style.background = 'none';
        }
        spDragHandle.style.display = 'none';
        spSideBar.style.display = 'none';
        spChatFrame.style.removeProperty('left');
        spChatFrame.style.removeProperty('top');
    }

    function stopMinimized() {
        sessionStorage.removeItem('bp-minimized');
        var spChatIframe = document.getElementById('sp-chat-iframe'),
            spIframeContainer = document.getElementById('sp-iframe-container'),
            spDragHandle = document.getElementById('sp-drag-handle'),
            spSideBar = document.getElementById('sp-side-bar'),
            spChatFrame = document.getElementById('sp-chat-frame'),
            spMinTab = document.getElementById('sp-min-tab-wrapper'),
            chatWidgetStyling = widgetConfiguration.getDefinitionStyling();

        if (spMinTab) {
            helper.removeClass(spMinTab, 'show');
        }

        if (spIframeContainer) {
            for (var i = 0; i < spIframeContainer.classList.length; ++i) {
                if (spIframeContainer.classList[i].substr(0, 4) === 'min-') {
                    spIframeContainer.classList.remove(spIframeContainer.classList[i]);
                    break;
                }
            }
        }
        if (spChatIframe) {
            spChatIframe.style.removeProperty('box-shadow');
            spChatIframe.style.removeProperty('background');
        }
        if (spDragHandle) {
            spDragHandle.style.removeProperty('display');
        }
        if (spSideBar) {
            spSideBar.style.removeProperty('display');
        }
        if (spChatFrame) {
            spChatFrame.style.left = sessionStorage.getItem('chatLeft');
            spChatFrame.style.top = sessionStorage.getItem('chatTop');
            if (widgetConfiguration.isMobile()) {
                spChatFrame.style.height = '100%';
                spChatFrame.style.width = '100%';
            } else {
                var frameHeight = Math.min.apply(Math, [chatWidgetStyling.height, window.innerHeight - 20]);
                spChatFrame.style.height = frameHeight + 'px';
                spChatFrame.style.width = chatWidgetStyling.width + 'px';
            }
        }
    }

    function setSnippetHtml() {
        loadCss(head, ['snippet']);
        body.insertAdjacentHTML('beforeend', getSnippetHtml());
    }

    function areWeOnSharedDomain() {
        var sharedDomains = spConfig.sharedDomains || spConfig.sharedHistoryDomains;
        var currentDomainIsFromShared = false;
        if (sharedDomains && sharedDomains.length) {
            for (var i = 0; i < sharedDomains.length; ++i) {
                var domainSuffix = (
                        (sharedDomains[i].length && (sharedDomains[i][0] === '.' || sharedDomains[i] === location.hostname)) ? '' : '.'
                    ) + sharedDomains[i];
                if (
                    location.hostname.length >= domainSuffix.length &&
                    location.hostname.substring(location.hostname.length - domainSuffix.length) === domainSuffix
                ) {
                    currentDomainIsFromShared = true;
                    break;
                }
            }
        }
        return currentDomainIsFromShared
    }

    function initializeSnippet() {
        window.addEventListener("message", receiveMessage, false);
        snippetDraggable();
        var chatMinimized = sessionStorage.getItem('bp-minimized');
        if (chatMinimized === 'true') {
            startMinimized();
        } else {
            var spChatFrame = document.querySelector('#sp-chat-frame');
            if (sessionStorage.getItem('chatLeft')) {
                spChatFrame.style.left = sessionStorage.getItem('chatLeft');
            }
            if (sessionStorage.getItem('chatTop')) {
                spChatFrame.style.top = sessionStorage.getItem('chatTop');
            }
        }
        setVisibilityListener(onVisibilityChange, safeWrap);
        // set the initial state (but only if browser supports the Page Visibility API)
        if (commonUtilService.isDefined(document["hidden"])) {
            onVisibilityChange({ type: document["hidden"] ? "blur" : "focus" });
        }
        spConfig.hidden = spConfig.hidden || window.localStorage.getItem("bp-bc") != null;

        function then() {
            snippetCheckAvailability(true);
            setCloseFrameListeners();
            setMinimizedTabListeners();
            var closeButton = document.getElementById('sp-close-frame');
            closeButton.setAttribute('title', i18n.endChatTooltip);
        }
        if (areWeOnSharedDomain()) {
            restoreSessionIfItExists(then);
        } else {
            then();
        }
    }

    function getSnippetHtml() {
        var isMobile = (widgetConfiguration.isMobile()) ? 'mobile-version' : 'desktop-version';
        return (
            "<div style='display:none' id='sp-root-container' class='" + isMobile + "'>" +
                "<div id='sp-chat-widget' data-hidden='hidden'> " +
                    "<div class='sp-round-button main-background-color second-fill-color' style='display:none' tabindex='100'>" +
                        "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 74 74'><path transform='scale(1.3) translate(15 15)' d='M14,2C7.458,2,2,6.769,2,12.8S7.458,23.6,14,23.6c.415,0,.8-.083,1.2-.122v3.834l1.849-1.186c2.595-1.665,8.213-5.988,8.883-12.192A9.906,9.906,0,0,0,26,12.8C26,6.769,20.542,2,14,2Zm0,2.4c5.389,0,9.6,3.828,9.6,8.4a7.5,7.5,0,0,1-.052.867v0l0,0c-.415,3.841-3.489,6.857-5.946,8.824V20.687l-1.437.291A10.918,10.918,0,0,1,14,21.2c-5.389,0-9.6-3.828-9.6-8.4S8.611,4.4,14,4.4Z'/></svg>" +
                    "</div>" +
                    "<div class='sp-chat-widget__content main-background-color contact-tab-border' style='display:none' tabindex='100'>" +
                        "<div id='sp-chat-label-icon'></div>" +
                        "<div id='sp-chat-label-text' class='base-font contact-tab-font second-color'></div>" +
                    "</div>" +
                "</div>" +
                "<div id='sp-chat-fake'></div>" +
                "<div id='sp-chat-frame' data-draggable='sp-drag-handle'>" +
                    "<div id='sp-drag-handle'></div>" +
                    "<div id='sp-side-bar'>" +
                        "<div id='sp-close-frame' role='button' aria-label='Close' tabindex='2' class='close-icon'><svg class='main-path-color' xmlns='http://www.w3.org/2000/svg' width='15' height='15'><path clip-rule='evenodd' d='M14.318 15l-6.818-6.818-6.818 6.818-.682-.682 6.819-6.818-6.819-6.818.682-.682 6.818 6.818 6.818-6.818.682.682-6.818 6.818 6.818 6.818-.682.682z' /></svg></div>" +
                    "</div>" +
                    "<div id='sp-iframe-container'></div>" +
                "</div>" +
                "<div id='sp-min-tab-wrapper'>" +
                    "<div class='sp-min-tab sp-round-button main-background-color second-fill-color' title='Show chat'>" +
                        "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 74 74'><path transform='scale(1.3) translate(15 15)' d='M14,2C7.458,2,2,6.769,2,12.8S7.458,23.6,14,23.6c.415,0,.8-.083,1.2-.122v3.834l1.849-1.186c2.595-1.665,8.213-5.988,8.883-12.192A9.906,9.906,0,0,0,26,12.8C26,6.769,20.542,2,14,2Zm0,2.4c5.389,0,9.6,3.828,9.6,8.4a7.5,7.5,0,0,1-.052.867v0l0,0c-.415,3.841-3.489,6.857-5.946,8.824V20.687l-1.437.291A10.918,10.918,0,0,1,14,21.2c-5.389,0-9.6-3.828-9.6-8.4S8.611,4.4,14,4.4Z'/></svg>" +
                    "</div>" +
                    "<div class='sp-min-tab min-chat-tab main-background-color'>" +
                        "<div class='min-tab-content' title='Show chat'>" +
                            "<div id='min_agent_image' class='min-agent-image'></div>" +
                            "<div id='min_agent_name' class='min-agent-name second-color title-font'></div>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
            "</div>"
        );
    }

    function safeWrap(func, callback) {
        if (func) {
            if (commonUtilService.isDefined(console))
                console.log('Snippet will wrap the site function %o', func);
            func();
        }
        callback();
    }

    function onVisibilityChange(evt) {
        var h = "sp-hidden";
        var evtMap = {
            blur: h,
            focusout: h,
            pagehide: h
        };
        evt = evt || window.event;
        var spRoot = document.getElementById('sp-root-container');
        helper.removeClass(spRoot, h);
        if (evt.type in evtMap)
            helper.addClass(spRoot, evtMap[evt.type]);
        else if (this["hidden"]) {
            helper.addClass(spRoot, h);
        }
        if (helper.hasClass(spRoot, h)) {
            var arrayLength = variables.notifications.length;
            for (var i = 0; i < arrayLength; i++) {
                variables.notifications[i].close();
            }
        }
    }

    function setVisibilityListener(callback, wrapperCallback) {
        // Standards:
        var hidden = "hidden";
        if (commonUtilService.isDefined(callback)) {
            if (hidden in document)
                document.addEventListener("visibilitychange", callback);
            else if ((hidden = "mozHidden") in document)
                document.addEventListener("mozvisibilitychange", callback);
            else if ((hidden = "webkitHidden") in document)
                document.addEventListener("webkitvisibilitychange", callback);
            else if ((hidden = "msHidden") in document)
                document.addEventListener("msvisibilitychange", callback);
            else if ("onfocusin" in document) {
                // IE 9 and lower:
                document.onfocusin = wrapperCallback(document.onfocusin, callback);
                document.onfocusout = wrapperCallback(document.onfocusout, callback);
            } else {
                // All others:
                window.onpageshow = wrapperCallback(window.onpageshow, callback);
                window.onpagehide = wrapperCallback(window.onpagehide, callback);
                window.onfocus = wrapperCallback(window.onfocus, callback);
                window.onblur = wrapperCallback(window.onblur, callback);
            }
        }
    }

    function closeFrame() {
        if (spConfig.callbacks && spConfig.callbacks.windowCloseIconClicked) {
            spConfig.callbacks.windowCloseIconClicked();
        }
        document.getElementById('sp-chat-iframe').contentWindow.postMessage("sp-disconnect", "*");
    }

    function setCloseFrameListeners() {
        var spCloseFrame = document.getElementById('sp-close-frame');
        if (spCloseFrame) {
            spCloseFrame.addEventListener("click", function () {
                closeFrame();
            });
            spCloseFrame.addEventListener("keyup", function (event) {
                if (event.keyCode === 13)
                    closeFrame();
            });
        }
    }

    function setMinimizedTabListeners() {
        var spMinTabs = document.querySelectorAll('.sp-min-tab');
        if (spMinTabs) {
            [].forEach.call(spMinTabs, function (tab) {
                if (tab) {
                    tab.addEventListener('click', function () {
                        var spChatIframe = document.getElementById('sp-chat-iframe');
                        spChatIframe.contentWindow.postMessage('bp-request-minimize-off', '*');
                    });
                    tab.addEventListener('keyup', function (event) {
                        var spChatIframe = document.getElementById('sp-chat-iframe');
                        if (event.keyCode === 13) {
                            spChatIframe.contentWindow.postMessage('bp-request-minimize-off', '*');
                        }
                    });
                }
            });
        }
    }

    function receiveMessage(event) {
        var spChatIframe = document.getElementById('sp-chat-iframe');
        var spChatFrame = document.getElementById('sp-chat-frame');
        var spMinTab = document.getElementById('sp-min-tab-wrapper');
        var data = event.data;
        if (!commonUtilService.isString(data)) return;
        var conf = widgetConfiguration.getParams(),
            snippetConfig = widgetConfiguration.getSnippet(),
            definition = widgetConfiguration.getDefinition(),
            chatWidgetStyling = widgetConfiguration.getDefinitionStyling();
        var width = 320;
        var height = 720;
        if (definition && chatWidgetStyling) {
            width = chatWidgetStyling.width;
            height = undefined;
            try {
                height = Math.min.apply(Math, [parseInt(chatWidgetStyling.height) - 10, window.parent.innerHeight - 20]);
            } catch (e) {
                height = parseInt(chatWidgetStyling.height) - 10;
            }
        }
        if (event.data == 'ready') {
            spChatIframe.contentWindow.postMessage("[parentPath]=" + window.location.pathname, "*");
            spChatIframe.contentWindow.postMessage("[parentHost]=" + window.location.host, "*");
            spChatIframe.contentWindow.postMessage("[serviceAvailable]=" + sessionStorage.getItem("serviceAvailable"), "*");
            spChatIframe.contentWindow.postMessage("[source]=" + sessionStorage.getItem("source"), "*");
            spChatIframe.contentWindow.postMessage(conf, "*");
        } else if (event.data == 'formsGenerated') {
            //***
            //***Cross-domain policy should be taken in account
            //***

            // var frame = spChatIframe.contentWindow.document.getElementById('inner-chat');
            // var getArrayFromTag = function(tagname) {
            //     return Array.prototype.slice.call(frame.getElementsByTagName(tagname));
            // }
            // var child_inputs = getArrayFromTag('input');
            // var child_textareas = getArrayFromTag ('textarea');
            // var child_selects = getArrayFromTag ('select');
            // var child_selects = getArrayFromTag ('a');
            // var field_elements = child_inputs.concat(child_textareas, child_selects);
            // var firstFocusableEl = field_elements[0];
            // var lastFocusableEl = field_elements.slice(-1)[0];
            // var KEYCODE_TAB = 9;
            //
            // window.addEventListener('keydown', function(e) {
            //     if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
            //         var isOpen = sessionStorage.getItem('sp-chat-snippet');
            //         if (e.srcElement.id!=='sp-close-frame' && isOpen){
            //             e.preventDefault();
            //             firstFocusableEl.focus();
            //         }
            //     }
            // });
            // firstFocusableEl.addEventListener('keydown', function(e) {
            //     if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
            //         if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
            //         if ( e.shiftKey ) {
            //             lastFocusableEl.focus();
            //             e.preventDefault();
            //         }
            //     }
            //     }
            // });
        } else if (data === 'sp-session-end') {
            window.setTimeout(function () {
                snippetOpenChat(false, true);
                if (window.cobrowsingSolution && window.cobrowsingSolution.isRunning()) {
                    window.cobrowsingSolution.stop();
                }
            }, 500);
            if (spConfig.returnUrl) {
                window.location.replace(spConfig.returnUrl);
            }
            if (removeCobrowsingPopup) {
                removeCobrowsingPopup();
            }
        } else if (data == 'sp-chat-init') {
            document.getElementById('sp-drag-handle').style.height = "0px";
            var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
            if (!widgetConfiguration.isMobile() && !isChatMinimized) {
                spChatFrame.style.height = height + "px";
                spChatFrame.style.width = width + "px";
            }
        } else if (data == 'sp-chat-maximize-on') {
            helper.addClass(spChatFrame, "sp-chat-frame-maximize");
        } else if (data == 'sp-chat-maximize-off') {
            helper.removeClass(spChatFrame, "sp-chat-frame-maximize");
        } else if (data == 'sp-chat-drag' && snippetConfig) {
            var location = snippetConfig.contactTab.location;
            if (location.indexOf('_top') === -1
                && location.indexOf('left_middle') === -1
                && location.indexOf('left_bottom') === -1
                && location.indexOf('right_') === -1
                && location.indexOf('top_right') === -1) {
                // $("#sp-chat-frame").css("top", Math.max(0, $(window).height() - height) + "px");
            }
        } else if (data == 'sp-session-start') {
            if (window.Notification && window.Notification.permission !== 'denied') {
                spChatIframe.contentWindow.postMessage("sp-req-notification", "*");
                window.Notification.requestPermission(function (permission) {
                    spChatIframe.contentWindow.postMessage("sp-req-notification-end", "*");
                });
            }
        } else if (data.indexOf('sp-notification') > 0) {
            var parse = JSON.parse(data);
            snippetShowNotification(parse.name, parse.msg, parse.photo);
        } else if (data.indexOf('sp-storage') > 0) {
            var store = JSON.parse(data);
            window.localStorage.setItem(store.key, store.value);
        } else if (data === 'sp-get-status-together') {
            if (window.cobrowsingSolution) {
                if (window.cobrowsingSolution.isRunning()) {
                    spChatIframe.contentWindow.postMessage("sp-started-together", "*");
                } else {
                    spChatIframe.contentWindow.postMessage("sp-stopped-together", "*");
                }
            }
        } else if (data === 'sp-pre-chat-form-cancel-button-clicked') {
            if (spConfig.callbacks && spConfig.callbacks.preChatWindowCancelButtonClicked) {
                spConfig.callbacks.preChatWindowCancelButtonClicked();
            }
        } else if (data === 'sp-pre-chat-form-phone-button-clicked') {
            if (spConfig.callbacks && spConfig.callbacks.preChatWindowPhoneButtonClicked) {
                spConfig.callbacks.preChatWindowPhoneButtonClicked();
            }
        } else if (data === 'sp-pre-chat-form-chat-button-clicked') {
            if (spConfig.callbacks && spConfig.callbacks.preChatWindowChatButtonClicked) {
                spConfig.callbacks.preChatWindowChatButtonClicked();
            }
        } else if (data === 'bp-cobrowsing-requested') {
            if (window.cobrowsingSolution) {
                window.cobrowsingSolution.askToStart();
            }
        } else if (data === 'bp-stop-cobrowsing') {
            if (window.cobrowsingSolution && window.cobrowsingSolution.isRunning()) {
                window.cobrowsingSolution.stop();
            } else if (removeCobrowsingPopup) {
                removeCobrowsingPopup();
            }
        } else if (data === 'bp-stop-cobrowsing-and-close-chat') {
            if (window.cobrowsingSolution && window.cobrowsingSolution.isRunning()) {
                snippetKeepOpenedState(false);
                window.cobrowsingSolution.stop();
            } else if (removeCobrowsingPopup) {
                removeCobrowsingPopup();
            }
        } else if (data === 'bp-start-cobrowsing' && window.cobrowsingSolution) {
            if (window.cobrowsingSolution) {
                window.cobrowsingSolution.start();
            }
        } else if (data === 'bp-start-minimized') {
            startMinimized();
        } else if (data === 'bp-stop-minimized') {
            stopMinimized();
        } else if (data === 'bp-request-max-height') {
            var frameMaxHeight = Math.min.apply(Math, [chatWidgetStyling.height, window.innerHeight - 20]);
            spChatIframe.contentWindow.postMessage(
                JSON.stringify({
                    message: 'bp-max-height',
                    height: frameMaxHeight
                }),
                '*'
            );
        } else {
            try {
                var parsed = JSON.parse(data);
                if (parsed.type === 'bp-dimensions' && !window.__bpap) {
                    if (sessionStorage.getItem('bp-minimized')) {
                        if (parsed.data.height) {
                            /** special case for min snippet without unread messages */
                            if (parsed.data.height === '0px' || parsed.data.height === '0') {
                                helper.addClass(spMinTab, 'show');
                            } else {
                                helper.removeClass(spMinTab, 'show');
                            }
                            spChatFrame.style.height = parsed.data.height;
                        }
                        if (parsed.data.width && !widgetConfiguration.isMobile()) {
                            spChatFrame.style.width = parsed.data.width;
                        }
                    }
                } else if (parsed.type === 'bp-update-agent-data') {
                    var minAgentName = document.getElementById('min_agent_name');
                    var minAgentImage = document.getElementById('min_agent_image');
                    if (parsed.data.name && minAgentName && minAgentImage) {
                        minAgentName.textContent = parsed.data.name;
                        if (parsed.data.url) {
                            minAgentImage.style.display = 'block';
                            minAgentImage.style.background = 'url(' + parsed.data.url + ') center center no-repeat';
                        } else {
                            minAgentImage.style.display = 'none';
                        }
                    }
                } else if (parsed.message === 'bp-show-close-chat-dialog') {
                    var confirm = window.confirm(parsed.text)
                    if (confirm) {
                        spChatIframe.contentWindow.postMessage('bp-close-chat-confirmed', '*');
                    }
                }
            } catch (e) { }
        }
    }

    function restoreSessionIfItExists(thenCallback) {
        var thenWasCalled = false;
        setTimeout(function () {
            if (!thenWasCalled) {
                thenCallback();
                thenWasCalled = true;
            }
        }, 1000);
        window.addEventListener('message', function tmpListener(event) {
            var data = event.data;
            var checkSessionIframe = document.getElementById('check-session-iframe');
            if (data === 'bpc-session-exists') {
                sessionStorage.setItem('sp-chat-snippet', true);
                if (checkSessionIframe) {
                    checkSessionIframe.parentElement.removeChild(checkSessionIframe);
                }
                window.removeEventListener('mesage', tmpListener);
                thenCallback();
                thenWasCalled = true;
            } else if (data === 'bpc-no-session') {
                if (checkSessionIframe) {
                    checkSessionIframe.parentElement.removeChild(checkSessionIframe);
                }
                window.removeEventListener('mesage', tmpListener);
                if (!thenWasCalled) {
                    thenCallback();
                    thenWasCalled = true;
                }
            }
        });
        var style = 'position:absolute;left:-1000px;top:-1000px;width:0;height:0;border:none';
        var url = widgetConfiguration.getChatPath() + 'check-session.html?' +
            'tenantUrl=' + encodeURIComponent(variables.SP.cp.tenantUrl) +
            '&url=' + encodeURIComponent(variables.SP.cp.url) +
            '&appId=' + encodeURIComponent(variables.SP.cp.appId) +
            '&clientId=' + encodeURIComponent(variables.SP.cp.clientId) +
            '&crossDomain=' + encodeURIComponent(variables.SP.cp.crossDomain);
        body.insertAdjacentHTML('beforeend', '' +
            '<iframe id="check-session-iframe" style="' + style + '" frameborder="0" src=' + url + '>' +
            '</iframe>'
        );
    }

    if (widgetConfiguration.isPreviewMode()) {
        initializePreview();
    } else {
        setSnippetHtml();
        initializeSnippet();
        setTimeout(function () {
            htmlUtilService.setDivHoverById('sp-close-frame', i18n.endChatTooltip);
        }, 1000);
    }
};
