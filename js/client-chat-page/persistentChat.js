var persistentChat = (function () {

    var persistentChatEnabled = false;
    var historyKey = '';
    var historyLoadedHandlers = [];

    var historyLoaded = false;
    var pendingFix = false;

    function fixCurrentSessionFileMessages(sessionId) {
        $('div[id^="' + sessionId + '-"] .msg-file-link').css('display', '');
        $('div[id^="' + sessionId + '-"] .msg-file-stub').css('display', 'none');
        setTimeout(clientChatPageUpdateScrollbar);
    }

    function fixHistorySessionsAgentPartyIcons(sessionId) {
        $('.new-msg-container:not([id^="' + sessionId + '"]) .agentImage').css({
            'background-color': '#999 !important',
            'display': 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'font-size': '1.3rem',
            'color': '#fff',
            'font-weight': '600',
            'user-select': 'none'
        }).text('A');
    }

    function fixHistoryMessagesRaw() {
        var sessionId = sessionStorage.getItem('sp-chat-session');
        fixCurrentSessionFileMessages(sessionId);
        fixHistorySessionsAgentPartyIcons(sessionId);
    }

    function fixHistoryMessages() {
        pendingFix = true;
        if (historyLoaded) {
            fixHistoryMessagesRaw();
        }
    }

    function decodeContentCache(str) {
        if (!str) {
            return null;
        }
        var decoded = decodeURI(str);
        var deobfuscated = commonUtilService.deobfuscate(decoded, 3);
        var parsed = JSON.parse(deobfuscated);
        return parsed
    }

    function encodeContentCache(data) {
        var stringifyed = JSON.stringify(data);
        var obfuscated = commonUtilService.obfuscate(stringifyed, 3);
        var encoded = encodeURI(obfuscated)
        return encoded;
    }

    var chatHistoryCacheLifetime = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    function removeOutdatedCache(data) {
        Object.keys(data).forEach(function (key) {
            data[key] = data[key].filter(function (dataItem) {
                return dataItem.date > Date.now() - chatHistoryCacheLifetime;
            });
        });
    }

    function checkCurrentDate(lastDate) {
        if (lastDate) {
            lastDate = new Date(lastDate);
            var now = new Date();
            var sessionId = sessionStorage.getItem('sp-chat-session');
            if (!commonUtilService.areDatesEqual(lastDate, now)) {
                var dateMsg = {
                    event: 'date-message',
                    history: true,
                    date: Date.now(),
                    sessionId: sessionId
                };
                clientChatUiAppendLog(dateMsg);
            }
        }
    }

    function loadChatHistory(parentOrigin) {
        if (SERVICE_PATTERN_CHAT_CONFIG && SERVICE_PATTERN_CHAT_CONFIG.enableClientSideChatHistory) {
            persistentChatEnabled = true;
        }
        var styling = widgetConfiguration.getDefinitionStyling();
        if (styling && styling.enableClientSideChatHistory) {
            persistentChatEnabled = true;
        }
        if (!persistentChatEnabled) {
            return;
        }
        try {
            var cache = localStorage.getItem('bp-temp-cache');
            var decoded = decodeContentCache(cache) || {};
            removeOutdatedCache(decoded);
            var encoded = encodeContentCache(decoded);
            localStorage.setItem('bp-temp-cache', encoded);

            var allowedDomains = SERVICE_PATTERN_CHAT_CONFIG.sharedDomains || SERVICE_PATTERN_CHAT_CONFIG.sharedHistoryDomains;
            var parentHostname = commonUtilService.extractHostname(parentOrigin);
            historyKey = parentHostname;
            if (allowedDomains && allowedDomains.length) {
                var domainMatch = false;
                for (var i = 0; i < allowedDomains.length; ++i) {
                    var domainSuffix = (
                            (allowedDomains[i].length && (allowedDomains[i][0] === '.' || allowedDomains[i] === parentHostname)) ? '' : '.'
                        ) + allowedDomains[i];
                    if (
                        parentHostname.length >= domainSuffix.length &&
                        parentHostname.substring(parentHostname.length - domainSuffix.length) === domainSuffix
                    ) {
                        domainMatch = true;
                        break;
                    }
                }
                if (domainMatch) {
                    historyKey = JSON.stringify(allowedDomains);
                }
            }
            var hostnameData = decoded[historyKey] || [];
            hostnameData.sort(function (data1, data2) {
                return data1.date > data2.date ? 1 : -1;
            });
            var i = 0, lastDate = null;
            setTimeout(function appendChunk() {
                if (i < hostnameData.length) {
                    hostnameData[i].messages.forEach(function (msg, index) {
                        msg.history = true;
                        msg.sessionId = hostnameData[i].id;
                        if (index === 0 && (lastDate ? !commonUtilService.areDatesEqual(lastDate, hostnameData[i].date) : true)) {
                            var dateMsg = {
                                event: 'date-message',
                                history: true,
                                date: hostnameData[i].date,
                                sessionId: hostnameData[i].id
                            };
                            clientChatUiAppendLog(dateMsg);
                            lastDate = hostnameData[i].date;
                        }
                        if (index === hostnameData[i].messages.length - 1) {
                            msg.last = true;
                        }
                        clientChatUiAppendLog(msg);
                    });
                    i++;
                    setTimeout(appendChunk);
                } else {
                    checkCurrentDate(lastDate);
                    historyLoaded = true;
                    historyLoadedHandlers.forEach(function(handler) {
                        try {
                            handler();
                        } catch (e) {}
                    });
                    if (pendingFix) {
                        fixHistoryMessagesRaw();
                    }
                }
            });
        } catch (e) {
            console.error('Unable to load chat history: ', e);
        }
    }

    function addMessageToChatHistory(msg) {
        if (!persistentChatEnabled) {
            return;
        }
        try {
            var cache = localStorage.getItem('bp-temp-cache');
            var data = decodeContentCache(cache) || {};

            var hostnameData = data[historyKey];
            if (!hostnameData) {
                hostnameData = [];
                data[historyKey] = hostnameData;
            }
            var sessionId = sessionStorage.getItem('sp-chat-session');
            var sessionData = hostnameData.filter(function (dataItem) {
                return dataItem.id === sessionId;
            });

            if (sessionData.length) {
                sessionData = sessionData[0];
            } else {
                sessionData = { id: sessionId, date: Date.now(), messages: [] };
                hostnameData.push(sessionData);
            }
            sessionData.messages.push(msg);
            var encoded = encodeContentCache(data);
            localStorage.setItem('bp-temp-cache', encoded);
        } catch (e) {
            console.error('Unable to write chat history: ', e);
        }
    }

    function removeSessionMessages(sessionId) {
        if (!sessionId || !persistentChatEnabled) {
            return;
        }
        $('#messages_history_separator').prevAll().filter('[id^="' + sessionId + '-"]').remove();
    }

    function isEnabled() {
        return persistentChatEnabled;
    }

    function isHistoryLoaded() {
        return historyLoaded;
    }

    function onHistoryLoaded(handler) {
        historyLoadedHandlers.push(handler);
    }

    return {
        loadChatHistory: loadChatHistory,
        addMessageToChatHistory: addMessageToChatHistory,
        fixHistoryMessages: fixHistoryMessages,
        fixHistoryMessagesRaw: fixHistoryMessagesRaw,
        removeSessionMessages: removeSessionMessages,
        isEnabled: isEnabled,
        isHistoryLoaded: isHistoryLoaded,
        onHistoryLoaded: onHistoryLoaded,
    };
})();
