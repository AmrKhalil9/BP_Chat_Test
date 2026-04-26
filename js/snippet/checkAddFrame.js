var snippetCheckAddFrame = function (startSession) {
    var config = snippetVariables();

    if (!document.querySelector('#sp-chat-iframe')) {
        if (config.SP.sound_notification) {
            config.audioElement.setAttribute('src', config.SP.sound_notification_file);
            config.audioElement.load();
        }

        var definition = widgetConfiguration.getDefinition();
        var chatWidgetConfig = definition ? definition.chatWidgetStyling : {};
        var frame = document.querySelector('#sp-chat-frame');

        var isChatMinimized = sessionStorage.getItem('bp-minimized') === 'true';
        if (!widgetConfiguration.isMobile()) {
            if (!isChatMinimized) {
                var frameHeight = Math.min.apply(Math, [chatWidgetConfig.height, window.innerHeight - 20]);
                frame.style.height = frameHeight + 'px';
                frame.style.width = chatWidgetConfig.width + 'px';
            }
            try {
                window.parent.addEventListener('resize', go);
            } catch (e) {
                console.warn('Snippet parent page is on a different domain');
            }

            function go() {
                if (!isChatMinimized) {
                    var frameHeight = Math.min.apply(Math, [chatWidgetConfig.height, window.innerHeight - 20]);
                    frame.style.height = frameHeight + 'px';
                }
            }

        } else if (!isChatMinimized) {
            frame.style.height = '100%';
            frame.style.width = '100%';
        }

        var url = startSession ? snippetChatUrl(startSession.session.cp.parameters.first_name, startSession.session.cp.parameters.last_name, startSession.session.cp.phone_number, startSession.session.cp.parameters.email) : snippetChatUrl();

        var start = startSession ? '&start=' + startSession.session.sessionId : '';
        var chatMinimized = sessionStorage.getItem('bp-minimized');
        var styles = '';
        if (chatMinimized === 'true') {
            styles = ' style="box-shadow:none;background:none;" ';
        }
        var html = "<iframe lang='en-US' title='Chat widget' id='sp-chat-iframe' " + styles + 
            "allow='camera; microphone' class='widget-border-radius dialog-shadow' frameborder='0' scrolling='no' src=" + url + start + "></iframe>";
        var container = document.querySelector('#sp-iframe-container');
        container.insertAdjacentHTML('beforeend', html);
    }
};
