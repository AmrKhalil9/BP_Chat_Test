var clientChatPageUpdateScrollbar = (function () {

    var pendingUpdateTimerId = -1;

    return function updateScrollbar() {
        var outer = $('#messages-div-outer');
        var inner = $('#messages-div-inner');
        var ih = inner.height();
        var oh = outer.height();

        if (ih === 0 || oh === 0) {
            if (pendingUpdateTimerId === -1) {
                pendingUpdateTimerId = setTimeout(updateScrollbar, 500);
            }
            return;
        } else if (pendingUpdateTimerId !== -1) {
            clearTimeout(pendingUpdateTimerId);
            pendingUpdateTimerId = -1;
        }

        outer.perfectScrollbar('update');

        inner.css("bottom", ih > oh ? "auto" : "0");

        inner.css("top", ih > oh ? "0" : "auto");

        if (ih > oh) {
            outer.scrollTop(ih - oh);
        }
    }
})();
