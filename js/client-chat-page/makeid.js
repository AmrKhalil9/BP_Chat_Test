var clientChatPageMakeId = function () {
    var text = "";
    var possible = commonConstants.alphabet;
    for (var i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
