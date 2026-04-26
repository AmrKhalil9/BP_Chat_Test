var snippetBuild = function () {
    if (widgetConfiguration.isPreviewMode()) {
        snippetOnInitialize();
    } else {
        var config = snippetVariables();
        if (config.SP.tenantUrl && config.SP.appId) {
            // $ = jQuery.noConflict(true);
            // config.SP.$ = $;
            // $.support.cors = true;
            config.SP.cp = {
                url: config.SP.apiUrl,
                crossDomain: true,
                tenantUrl: config.SP.tenantUrl,
                appId: config.SP.appId,
                clientId: 'WebChat',
                phoneNumber: config.SP.phoneNumber,
                parameters: config.SP.parameters,
                onFormShow: config.SP.onFormShow,
                onAddStream: config.SP.onAddStream,
                onAddLocalStream: config.SP.onAddLocalStream
            };
            snippetOnInitialize();
        }
    }
};
