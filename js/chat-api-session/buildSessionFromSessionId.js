var chatApiSessionBuildSessionFromSessionId = function (cp, id, state) {
    var r = {
        chat_id: id,
        state: state
    };
    r.session = chatApiSessionCreateSessionHandler(cp, r);
    return r;
};
