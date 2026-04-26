var clientChatPageInitDragAndDrop = function () {

    var obj = $("#chat-body");
    var timeoutID;

    function checkAndUpdateTimeout(timeoutID) {
        if (timeoutID) {
            window.clearTimeout(timeoutID);
            timeoutID = null;
        }
    }

    obj.on('dragenter dragleave dragover drop', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });

    obj.on('dragenter', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        if ($('#attachFile').is(':visible')) {
            obj.attr("dnd", "1");
            checkAndUpdateTimeout(timeoutID);
        }
    });

    obj.on('dragleave', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        if (timeoutID) {
            window.clearTimeout(timeoutID);
            timeoutID = null;
        } else {
            timeoutID = window.setTimeout(function () {
                obj.attr("dnd", null);
            }, 200);
        }
    });

    obj.on('dragover', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        obj.attr("dnd", "1");
        checkAndUpdateTimeout(timeoutID);
    });

    obj.on('drop', function (e) {
        if (!widgetConfiguration.isFileAttachEnabled()) {
            return;
        }
        clientChatPageUploadFiles(e.originalEvent.dataTransfer.files);
        obj.attr("dnd", null);
        checkAndUpdateTimeout(timeoutID);
    });
};
