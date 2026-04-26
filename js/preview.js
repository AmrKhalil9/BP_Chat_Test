var chatPreview = function () {
    var helpers = constructorHelpers();

    if (window.addEventListener) {
        window.addEventListener("message", helpers.listener);
    } else {
        window.attachEvent("onmessage", helpers.listener);
    }

    (function() {
        helpers.showChat();
    })();
};
