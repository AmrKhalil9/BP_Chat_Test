var clientChatPageUploadFiles = function (files) {

    var blockExtensions = [
        '.ade', '.adp', '.apk', '.appx', '.appxbundle', '.bat',
        '.cab', '.chm', '.cmd', '.com', '.cpl', '.dll', '.dmg',
        '.ex', '.ex_', '.exe', '.hta', '.ins', '.isp', '.iso',
        '.jar', '.js', '.jse', '.lib', '.lnk',
        '.mde', '.msc', '.msi', '.msix', '.msixbundle', '.msp', '.mst',
        '.nsh', '.pif', '.ps1', '.scr', '.sct', '.shb', '.sys',
        '.vb', '.vbe', '.vbs', '.vxd', '.wsc', '.wsf', '.wsh'
    ];

    var blockMIMETypes = [
        'application/x-msdownload',
        'text/javascript',
    ]

    var i18n = clientChatUiI18n();

    function upload(cp, formData) {
        var uploadFilesEndpoint = 'files?tenantUrl=' + encodeURIComponent(cp.tenantUrl);
        return chatApiSessionSendXhr(cp, uploadFilesEndpoint, 'POST', formData);
    }

    function uploadFile(file) {
        var formData = new FormData();
        var id = clientChatPageMakeId();
        var sessionId = sessionStorage.getItem('sp-chat-session');
        formData.append("file-upload-input", file);
        $.chatUI.appendLog({
            fromClass: "me",
            msg: "Uploading \"" + file.name + "\"",
            msgId: id,
            sessionId: sessionId
        });
        upload(window.chatSession.cp, formData)
            .fail(function (fail) {
                var errorMessage = '';
                if (fail && fail.responseJSON) {
                    errorMessage = fail.responseJSON.error_message || '';
                }
                $('#' + sessionId + '-' + id).detach();
                $.chatUI.appendLog({fromClass: "sys", msg: "Error: " + errorMessage});
            })
            .done(function (done) {
                $('#' + sessionId + '-' + id).detach();
                if (done && done.file_id) {
                    if (window.chatSession) {
                        var type = 'attachment';
                        if (file.type.match('image.*')) {
                            type = 'image';
                        } else {
                            clientChatPageUpdateScrollbar();
                        }

                        window.chatSession.fileUploaded(done.file_id, type, done.file_name);
                    }
                }
            });
    }

    for (var i = 0, item; item = files[i]; i++) {
        console.log(files[i]);
        if (
            blockExtensions.some(function (ext) { return commonUtilService.endsWith(files[i].name.toLowerCase(), ext); }) ||
            blockMIMETypes.some(function (mime) { return files[i].type.toLowerCase() === mime; })
        ) {
            $.chatUI.appendLog({
                fromClass: "sys",
                msg: files[i].name + ": " + i18n.fileUploadBlockedErrorText
            });
        } else {
            uploadFile(item);
        }
    }
    sessionStorage.setItem("blockConnectionInterruptCheck", false);
};
