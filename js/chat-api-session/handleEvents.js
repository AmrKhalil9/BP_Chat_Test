var chatApiSessionHandleEvents = function (r, session) {
    if (r.events) {
        for (var i = 0; i < r.events.length; i++) {
            session.handleEvent(r.events[i]);
        }
    }
};
