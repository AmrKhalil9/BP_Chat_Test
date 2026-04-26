var snippetKeepOpenedState = function (opened) {
    if (opened) {
        sessionStorage.setItem("sp-chat-snippet", "true");
    } else {
        sessionStorage.removeItem("sp-chat-snippet");
    }
};
