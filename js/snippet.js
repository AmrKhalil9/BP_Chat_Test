var chatSnippet = function () {
    setTimeout(function() {
        if(widgetConfiguration.isPreviewMode()) {
            chatPreview();
        }
        snippetBuild();
    });
};
