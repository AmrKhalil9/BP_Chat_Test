var widgetConfiguration = (function () {

    function isMobile() {
        var agent = navigator.userAgent || navigator.vendor || window.opera;
        var check1 = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|iP(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(agent) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(agent.substr(0, 4));
        var check2 = /iP(ad|hone|od).+Version\/[\d\.]+.*Safari/i.test(navigator.userAgent);
        return check2 ? check2 : check1;
    }

    function getParams() {
        return sessionStorage.getItem("confParams");
    }

    function getFullConfiguration() {
        return sessionStorage.getItem("fullConf");
    }

    function getFullConfigurationObject() {
        return JSON.parse(getFullConfiguration());
    }

    function getObject() {
        return JSON.parse(getParams());
    }

    function getTarget() {
        return getChatConfiguration(getObject());
    }

    function getDefinition() {
        var object = getObject();
        return object ? object.definition : null;
    }

    function getStyles() {
        var object = getObject();
        return object ? object.styles : null;
    }

    function getCobrowsing() {
        var object = getObject();
        return object ? object.cobrowsing : null;
    }

    function getSurflyWidgetKey() {
        var cobrowsing = getCobrowsing();
        if (cobrowsing && cobrowsing.provider === "SURFLY") {
            return cobrowsing.widget_key;
        }
        return null;
    }

    function getItem(itemName, indexName) {
        var definition = getDefinition();
        var index = getItemIndex(indexName);
        if (definition && definition[itemName] && commonUtilService.isDefined(index)) {
            return definition[itemName][index];
        }
        return null;
    }

    function getItemIndex(propName) {
        var target = getTarget();
        if (target && target[propName]) {
            return target[propName].widgetIndex;
        }
        return null;
    }

    function getSnippetIndex() {
        return getItemIndex('chatInitiation');
    }

    function getSnippet() {
        return getItem('chatInitiations', 'chatInitiation');
    }

    function getProactiveOfferIndex() {
        return getItemIndex('proactiveOffer');
    }

    function getProactiveOffer() {
        return getItem('proactiveOffers', 'proactiveOffer');
    }

    function getProactiveOfferConditions() {
        var conditions = [];
        var po = getProactiveOffer();
        if (po && po.conditions) {
            conditions = po.conditions;
        }
        return conditions;
    }

    function getFormIndex() {
        return getItemIndex('form');
    }

    function getForm() {
        return getItem('forms', 'form');
    }

    function getOrientation() {
        var snippet = getSnippet();
        var util = commonUtilService;
        if (snippet && snippet.contactTab && snippet.contactTab.location) {
            return (util.includes(snippet.contactTab.location, 'right_') || util.includes(snippet.contactTab.location, 'left_')) ? 'vertical' : 'horizontal';
        }
    }

    function isPreviewMode() {
        var urlVars = clientChatPageGetUrlVars(window.location.href);
        if (urlVars && commonUtilService.isDefined(urlVars.brightpattern)) {
            return urlVars.brightpattern === 'previewmode';
        }
        return false;
    }

    function getChatPath() {
        if (SERVICE_PATTERN_CHAT_CONFIG && SERVICE_PATTERN_CHAT_CONFIG.chatPath) {
            var path = SERVICE_PATTERN_CHAT_CONFIG.chatPath;
            return (path.substr(path.length - 1) === "/") ? path : path + "/";
        }
        return '';
    }

    function getServicePatternChatConfig() {
        var deferred = jQuery.Deferred();
        window.addEventListener('message', function(event) {
            if(event && event.data && event.data.eventName === 'setServicePatternChatConfig'){
                deferred.resolve(event.data.params.servicePatternChatConfig);
                window.removeEventListener('message', null, false);
            }
        });
        window.parent.postMessage("getServicePatternChatConfig", "*");
        return deferred.promise();
    }

    function getPreChat() {
        var snippet = getSnippet();
        if (snippet && snippet.preChat) {
            return snippet.preChat;
        }
        return null;
    }

    function getChatConfiguration (data) {

        var obj = (data && data.widget) ? data.widget : data;
        var output = {};

        function findUrls(section, item, weight) {
            var result = {};
            if (section) {
                for (var i = 0; i < section.data.length; i++) {
                    for (var key in section.data[i].urls) {
                        if (section.data[i].urls.hasOwnProperty(key)) {
                            var comparedUrl = section.data[i].urls[key];
                            var compareResult = chatCompareUrl(comparedUrl)
                            if (compareResult.check) {
                                if (compareResult.weight > weight) {
                                    weight = compareResult.weight;
                                    result.widgetIndex = i;
                                    result.url = comparedUrl;
                                }
                            }
                        }
                    }
                }
            }
            return result;
        }

        function getDefaultData(data) {
            if (data) {
                return {data: data, widgetIndex: -1, target: {}}
            }
            return {}
        }

        function getWidgetOutput(targetSection, widgetType) {
            var widgetOutput = {data: {}, styles: data.styles};
            var sourceId = data.id;
            for (var key in targetSection) {
                if (targetSection.hasOwnProperty(key) && sourceId === targetSection[key].id) {
                    widgetOutput.index = key;
                    widgetOutput.data = targetSection[key];
                    if (widgetType) {
                        widgetOutput.data.widgetType = widgetType
                    }
                }
            }
            return widgetOutput
        }

        if (data) {
            if (widgetConfiguration.isPreviewMode()) {

                output = {data: {}, styles: data.styles};

                switch (data.section) {
                    case "chat_initiation":
                        output = getWidgetOutput(obj.chatInitiations);
                        break;
                    case "proactive_offer":
                        output = getWidgetOutput(obj.proactiveOffers, 'proactive_offer');
                        break;
                    case "form":
                        output = getWidgetOutput(obj.forms, 'form');
                        break;
                    case "on_page_form":
                        output = getWidgetOutput(obj.onPageForms, 'onPageForm');
                        break;
                    case "chat_styling":
                        output.data = obj.chatWidgetStyling;
                        output.data.widgetType = 'chat_styling';
                        var chatInit = obj.chatInitiations[0];
                        if (chatInit) {
                            output.data.contactTab = chatInit.contactTab;
                        }
                        break;
                }

            } else {
                var temporaryWeight = 0;
                var chatInitiations = data.definition ? getDefaultData(data.definition.chatInitiations) : {};
                var proactiveOffers = data.definition ? getDefaultData(data.definition.proactiveOffers) : {};
                var forms = data.definition ? getDefaultData(data.definition.forms) : {};
                output['chatInitiation'] = (findUrls(chatInitiations, 'chatInitiation', temporaryWeight));
                output['proactiveOffer'] = (findUrls(proactiveOffers, 'proactiveOffer', temporaryWeight));
                output['form'] = (findUrls(forms, 'form', temporaryWeight));
            }
        }

        return output;
    }

    function getDefinitionStyling() {
        var definition = getDefinition();
        if (definition && definition.chatWidgetStyling) {
            return definition.chatWidgetStyling
        }
    }

    function isCobrowsingTogetherJS() {
        var enabled = false;
        // var chatWidgetStyling = getDefinitionStyling();
        var cobrowsing = getCobrowsing();
        var spConfig = SERVICE_PATTERN_CHAT_CONFIG;
        var forceTogetherJSEnabled = spConfig ? spConfig.togetherJS_enabled : undefined;

        enabled = cobrowsing && cobrowsing.provider === 'TOGETHERJS';
        if (commonUtilService.isDefined(forceTogetherJSEnabled)) {
            enabled = commonUtilService.stringIsTrue(forceTogetherJSEnabled) || forceTogetherJSEnabled === true;
        }
        // if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.cobrowsing)) {
        //     enabled = chatWidgetStyling.cobrowsing === true;
        // }
        // var surflyIsHere = getSurflyWidgetKey();
        // if (surflyIsHere) {
        //     enabled = false;
        // }
        return enabled;
    }

    function isCobrowsingEditEnabled() {
        var enabled = true;
        var chatWidgetStyling = getDefinitionStyling();
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.remoteEditing)) {
            enabled = !!chatWidgetStyling.remoteEditing;
        }
        return enabled;
    }

    function isFileAttachEnabled() {
        var enabled = true;
        var chatWidgetStyling = getDefinitionStyling();
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.fileUploadEnabled)) {
            enabled = !!chatWidgetStyling.fileUploadEnabled;
        }
        return enabled;
    }

    function isEmojiPickerEnabled() {
        var enabled = true;
        var chatWidgetStyling = getDefinitionStyling();
        if (chatWidgetStyling && commonUtilService.isDefined(chatWidgetStyling.emojiSelector)) {
            enabled = !!chatWidgetStyling.emojiSelector;
        }
        return enabled;
    }

    function isVisitorVideoEnabled() {
        var chatWidgetStyling = getDefinitionStyling();
        return !!chatWidgetStyling && chatWidgetStyling.visitorVideoEnabled !== false;
    }

    return {
        getSnippetIndex: getSnippetIndex,
        getProactiveOfferIndex: getProactiveOfferIndex,
        getFormIndex: getFormIndex,
        isMobile: isMobile,
        getDefinition: getDefinition,
        getDefinitionStyling: getDefinitionStyling,
        getStyles: getStyles,
        getCobrowsing: getCobrowsing,
        getSurflyWidgetKey: getSurflyWidgetKey,
        getSnippet: getSnippet,
        getProactiveOffer: getProactiveOffer,
        getProactiveOfferConditions: getProactiveOfferConditions,
        getForm: getForm,
        getOrientation: getOrientation,
        getPreChat: getPreChat,
        getChatPath: getChatPath,
        isPreviewMode: isPreviewMode,
        getParams: getParams,
        getObject: getObject,
        getTarget: getTarget,
        getFullConfiguration: getFullConfiguration,
        getFullConfigurationObject: getFullConfigurationObject,
        getChatConfiguration: getChatConfiguration,
        getServicePatternChatConfig: getServicePatternChatConfig,
        isCobrowsingTogetherJS: isCobrowsingTogetherJS,
        isCobrowsingEditEnabled: isCobrowsingEditEnabled,
        isFileAttachEnabled: isFileAttachEnabled,
        isEmojiPickerEnabled: isEmojiPickerEnabled,
        isVisitorVideoEnabled: isVisitorVideoEnabled,
    };
})();
