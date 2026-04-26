var constructorHelpers = function () {
    var helper = snippetHelperFunctions();

    var helpers = {
        listener: function (event) {
            var preview = document.querySelector('#preview');
            if (commonUtilService.isJsonString(event.data)) {
                sessionStorage.setItem('fullConf', event.data);
                var config = JSON.parse(event.data);
                var target = widgetConfiguration.getChatConfiguration(config);

                if (config.screen) {
                    if (preview) {
                        preview.setAttribute('class', '');
                        helper.addClass(preview, config.screen);
                    }
                    sessionStorage.setItem('confParams', JSON.stringify(target.data));
                    sessionStorage.setItem('styles', JSON.stringify(config.styles));
                    helpers.applyConfiguration(target.data, target.styles);
                }
            }
        },

        applyConfiguration: function (data, styles) {
            snippetConfigurationSnippet(data, styles);
            constructorConfigurationPreview(data, styles);
            if (widgetConfiguration.isPreviewMode()) {
                loadScripts([
                    "js/libraries/jquery/jquery-3.2.1.min.js",
                    "js/libraries/perfect-scrollbar/perfect-scrollbar.min.js"
                ], function () {
                    clientChatPageConfigurationChat();
                    buildProactiveOfferPreview();
                    scaleProactiveOffer();
                });
            }
        },

        showChat: function () {
            var content = document.querySelector('.chat-preview-content');
            if (content) helper.show(content);
        }
    };

    return helpers;
};
