var editMessage = function (data, session) {
    var messageFullId = data.sessionId + '-' + data.refMsgId;
    var msgElement = $('#' + messageFullId);
    var timestamp;
    var anchorElement;
    if (msgElement.length) {
        timestamp = msgElement.data('timestamp');
        anchorElement = msgElement.next();
        msgElement.remove();
    }
    $('#min-' + messageFullId).remove();
    // special case for directive attachment messages
    var dirMsgElements = $('[data-original-id="' + data.refMsgId + '"]');
    if (dirMsgElements.length) {
        timestamp = dirMsgElements.data('timestamp');
        anchorElement = dirMsgElements.last().next();
        dirMsgElements.remove();
    }

    var pseudoMessageEvent = {
        channel: 'web',
        event: 'chat_session_message',
        msg: data.msg,
        msg_id: data.refMsgId,
        msg_text: data.msg,
        party_id: data.partyId,
        timestamp: timestamp,
        anchorElement: anchorElement,
    };
    session.handleEvent(pseudoMessageEvent);
};

var deleteMessage = function (data) {
    var messageFullId = data.sessionId + '-' + data.refMsgId;
    $('#' + messageFullId).remove();
    // special case for directive attachment messages
    $('[data-original-id="' + data.refMsgId + '"]').remove();
    var minMessage = $('#min-' + messageFullId);
    if (minMessage.length) {
        minMessage.remove();
        commonUtilService.updateParentDimensions({height: {auto: true}});

        var msgCounterDiv = $('.min-message-counter');
        var currentMsgNumber = Number(sessionStorage.getItem('bp-min-message-counter'));
        currentMsgNumber--;
        sessionStorage.setItem('bp-min-message-counter', currentMsgNumber);
        msgCounterDiv.removeClass('message-counter-small message-counter-medium message-counter-big');
        if (currentMsgNumber < 5) {
            msgCounterDiv.addClass('message-counter-small');
        } else if (currentMsgNumber < 10) {
            msgCounterDiv.addClass('message-counter-medium');
        } else if (currentMsgNumber >= 10) {
            msgCounterDiv.addClass('message-counter-big');
        }
        if (currentMsgNumber < 1) {
            $('#min_dismiss_button').css('display', 'none');
            msgCounterDiv.text('');
            msgCounterDiv.removeClass('message-counter-small message-counter-medium message-counter-big');
        }
        msgCounterDiv.text(currentMsgNumber);
        $('.min-scroll').perfectScrollbar('update');
    }
};
