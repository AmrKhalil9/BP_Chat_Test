var eventPreprocessor = (function () {

    var preprocessEvent = function (event, eventProcessor) {
        switch (event.event) {
            case commonConstants.events.chat.session.MESSAGE:
                processMessage(event, eventProcessor);
                break;
            default:
                eventProcessor(event);
                break;
        }
    }

    var processMessage = function (event, eventProcessor) {
        var fileEvents = findFileEvents(event);

        if (fileEvents.length === 0) {
            eventProcessor(event);
        } else {
            var messageEvents = findMessageEvents(event);
            var mergedEvents = mergeEvents(fileEvents, messageEvents);
            mergedEvents.forEach(function (e) {
                eventProcessor(e);
            });
        }
    }

    var findFileEvents = function (event) {
        var attachmentRegex = new RegExp('\\/attachment(\\s*:\\s*|\\s+)(http[^\\s^,]+)(\\s*,\\s*(audio|video|image))?', 'gi');
        var text = event.msg_text || event.msg;
        var files = [];

        var match = attachmentRegex.exec(text);
        while (match) {
            var fileEvent = createFileEvent(match, event);
            files.push(fileEvent);

            match = attachmentRegex.exec(text);
        }

        return files;
    }

    var createFileEvent = function (match, event) {
        var fileEvent = Object.assign({}, event, {
            msg_id: crypto.randomUUID().toUpperCase(),
            original_msg_id: event.msg_id,
            event: commonConstants.events.chat.session.DIRECTIVE_FILE_URL,
            file_url: match[2],
            file_type: match[4] || 'attachment'
        });

        delete fileEvent.msg;
        delete fileEvent.msg_text;

        return fileEvent;
    }

    var findMessageEvents = function (event) {
        var messageRegex = new RegExp('\\/attachment(?:\\s*:\\s*|\\s+)(?:http[^\\s^,]+)(?:\\s*,\\s*(?:audio|video|image))?', 'i');
        var text = event.msg || event.msg_text || ''; //try to parse msg first to keep html markup
        var messages = text.split(messageRegex);

        return messages.map(function (message) {
            return createMessageEvent(message.trim(), event);
        });
    }

    var createMessageEvent = function (message, event) {
        function innerText(html){
            var dif = document.createElement('div');
            dif.innerHTML = html;

            return dif.innerText;
        }

        return Object.assign({}, event, {
            msg_id: crypto.randomUUID().toUpperCase(),
            original_msg_id: event.msg_id,
            msg: message,
            msg_text: innerText(message)
        });
    }

    var mergeEvents = function (fileEvents, messageEvents) {
        var result = [];
        for (var i = 0, j = 0; i < fileEvents.length && j < messageEvents.length; i++, j++) {
            var fileEvent = fileEvents[i];
            var messageEvent = messageEvents[j];
            if (messageEvent.msg.length > 0) {
                result.push(messageEvent);
            }
            result.push(fileEvent);
        }

        if (fileEvents.length > messageEvents.length) {
            result.push(...fileEvents.slice(messageEvents.length));
        } else if (fileEvents.length < messageEvents.length) {
            result.push(...messageEvents.slice(fileEvents.length).filter(function (messageEvent) {
                return messageEvent.msg.length > 0;
            }));
        }

        return result;
    }

    return {
        preprocessEvent: preprocessEvent
    }
}());
