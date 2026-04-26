var clientChatPageOnFormSubmit = function (e) {
    var variables = clientChatPageVariables;
    e.preventDefault();
    if (variables.currentForm && typeof variables.currentForm.onSubmit === 'function') {
        variables.currentForm.onSubmit(form_name);
    }
};
