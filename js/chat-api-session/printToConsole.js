var chatApiSessionPrintToConsole = function (a, b) {
    if (chatApiSessionVariables.logging) {
        if (typeof console !== 'undefined') {
            if (typeof b !== 'undefined') {
                console.log(a + " %o", b);
            } else {
                console.log(a);
            }
        }
    }
};
