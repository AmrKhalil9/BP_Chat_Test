
var snippetCheckAvailability = function (needToHandleAvailability) {

    var cachedConfUrl = sessionStorage.getItem('cachedConfUrl');
    var cachedConf = widgetConfiguration.getParams();

    function whenConfigLoaded() {
        showSnippet();
        loadCobrowsingSolution();
        availabilityRequest();
    }

    if (cachedConfUrl && chatCompareUrl(cachedConfUrl) && cachedConf) {
        whenConfigLoaded();
    } else {
        return sendRequestToClientWebserver('configuration', function (xmlhttp) {
            sessionStorage.setItem('confParams', xmlhttp.responseText);
            whenConfigLoaded();
        });
    }

    function availabilityRequest() {
        return sendRequestToClientWebserver('availability', function (xmlhttp) {
            var available = JSON.parse(xmlhttp.responseText).chat === 'available';
            var ewt = JSON.parse(xmlhttp.responseText).ewt || "0";
            sessionStorage.setItem('serviceAvailable', available);
            sessionStorage.setItem('ewt', ewt);
            needToHandleAvailability && snippetHandleAvailability(available);
        });
    }

    function showSnippet() {
        var styling = widgetConfiguration.getDefinitionStyling();
        var isRoundButton = styling.tabStyle === 'round';
        if (isRoundButton) {
            document.querySelector('#sp-chat-widget .sp-round-button').style.display = '';
        } else {
            document.querySelector('#sp-chat-widget .sp-chat-widget__content').style.display = '';
        }
    }

    function sendRequestToClientWebserver(resource, callback) {
        var url = SERVICE_PATTERN_CHAT_CONFIG.apiUrl + '/' + resource
            + '?tenantUrl=' + encodeURIComponent(SERVICE_PATTERN_CHAT_CONFIG.tenantUrl)
            + '&domain=' + encodeURIComponent(window.location.host)
            + '&appId=' + encodeURIComponent(SERVICE_PATTERN_CHAT_CONFIG.appId);

        // Special case for TTEC customer
        if (window._bpattern_domainParam) {
            url += '&domain=' + encodeURIComponent(window.location.host);
        }

        var xmlhttp;
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
                callback(xmlhttp);
            }
        };

        xmlhttp.withCredentials = true;
        xmlhttp.crossDomain = true;
        xmlhttp.open("GET", url, true);
        xmlhttp.setRequestHeader('Authorization', 'MOBILE-API-140-327-PLAIN appId="' + SERVICE_PATTERN_CHAT_CONFIG.appId + '", clientId="' + SERVICE_PATTERN_CHAT_CONFIG.clientId + '"');

        xmlhttp.send();
        return xmlhttp.onreadystatechange();
    }

};
