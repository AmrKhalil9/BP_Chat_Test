var snippetChatUrl = function (f, l, p, e) {
    var config = snippetVariables();
    var first = f ? f : encodeURIComponent(config.SP.first_name || '');
    var last = l ? l : encodeURIComponent(config.SP.last_name || '');
    var phone = p ? p : encodeURIComponent(config.SP.phone_number || '');
    var email = e ? e : encodeURIComponent(config.SP.email || '');
    var location = '';
    if (config.SP.location) {
        location += "&latitude=" + encodeURIComponent(config.SP.location.latitude + '');
        location += "&longitude=" + encodeURIComponent(config.SP.location.longitude + '');
    }
    var chatPath = widgetConfiguration.getChatPath();
    var chatHtmlName = config.SP.chatHtmlName;
    var isCobrowsingTogetherJS = widgetConfiguration.isCobrowsingTogetherJS();
    chatPath += chatHtmlName + "?"
        + "tenantUrl=" + encodeURIComponent(config.SP.tenantUrl)
        + "&appId=" + config.SP.appId
        + "&referrer=" + encodeURIComponent(window.location.href)
        + "&referrerTitle=" + encodeURIComponent(window.document.title)
        + "&webServer=" + encodeURIComponent(config.SP.apiUrl)
        + "&logging=" + encodeURIComponent(config.SP.logging || '')
        + location
        + "&phone_number=" + phone
        + "&from=" + encodeURIComponent(config.SP.from || '')
        + "&email=" + email
        + "&account_number=" + encodeURIComponent(config.SP.account_number || '')
        + "&first_name=" + first
        + "&last_name=" + last
        + "&togetherjs_enabled=" + encodeURIComponent(isCobrowsingTogetherJS || '')
        + "&autostartVideocall=" + encodeURIComponent(config.SP.autostartVideocall || '');
    if (config.SP.parameters) {
        for (var property1 in config.SP.parameters) {
            if (config.SP.parameters.hasOwnProperty(property1)) {
                chatPath += "&custom_" + property1 + "=" + encodeURIComponent(config.SP.parameters[property1] || '')
            }
        }
    }
    return chatPath;
};
