var snippetShowNotification = function (title, body, icon) {
    var config = snippetVariables();
    var doNotShowNotifications = window.localStorage.getItem('doNotShowNotifications');
    var helper = snippetHelperFunctions();

    if (doNotShowNotifications !== 'true') {
        if (window.Notification
            && window.Notification.permission === 'granted'
            && helper.hasClass(document.querySelector('#sp-root-container'), 'sp-hidden')) {
            var options = {
                body: htmlUtilService.htmlDecode(body),
                icon: icon
            };

            var n = new window.Notification(title, options);
            config.notifications.push(n);

            if (config.SP.sound_notification) {
                config.audioElement.pause();
                config.audioElement.currentTime = 0;
                config.audioElement.play().then(function () {}, function (error) {
                    console.warn(error);
                });
            }

            n.onclose = function () {
                var index = config.notifications.indexOf(n);
                if (index > -1) {
                    config.notifications.splice(index, 1);
                }
            };

            n.onclick = function (e) {
                window.focus();
            };
        }
    }
};
