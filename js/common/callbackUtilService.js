var callbackUtilService = (function () {

    var errorStyle = 'position: relative;\n' +
        'top: -39px;\n' +
        'background: #fbf0d1;\n' +
        'color: #434343;\n' +
        'padding: 4px;\n' +
        'float: right;\n' +
        'border: 1px solid #f7ecc5;\n' +
        'border-radius: 4px;\n';

    function removeElementByClassName(className) {
        var elements = document.getElementsByClassName(className);
        while(elements.length > 0){
            elements[0].parentNode.removeChild(elements[0]);
        }
    }

    function insertError(field, text) {
        var i18n = clientChatUiI18n();
        var fieldError = document.createElement('div');
        var message = text || i18n.requiredField;
        fieldError.setAttribute('id', 'error-' + field.id);
        fieldError.setAttribute('style', errorStyle);
        fieldError.classList.add('error-message');
        fieldError.innerText = message;
        field.parentNode.insertBefore(fieldError, field.nextSibling);
    }

    function loopFormFields(formId, callback) {
        var form = document.getElementById(formId);
        if (typeof form !== "undefined") {
            var fields = form.getElementsByTagName('input');
            if (typeof fields !== "undefined" && fields.length) {
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    callback(field);
                }
            }
        }
    }

    function getSnippetFormValues(formId) {
        var platform = window.platform;
        var resultConfig = {
            parameters: {
                user_platform: {
                    browser: platform.name + ' ' + platform.version,
                    os: platform.os.toString(),
                    description: platform.description
                }
            }
        };
        var spConf = SERVICE_PATTERN_CHAT_CONFIG;
        loopFormFields(formId, function (field) {
            var fieldId = field.id;
            var fieldValue = field.value;
            if (field.type === 'radio') {
                fieldId = field.name;
                if (!field.checked) {
                    return
                }
            }
            if (typeof fieldId !== "undefined" && typeof fieldValue !== "undefined") {
                fieldId = fieldId.split('sp-callback-').reverse().join('');
                if (!fieldValue && spConf[fieldId]) {
                    fieldValue = spConf[fieldId]
                }
                if (fieldId === 'phone_number' || fieldId === 'phone') {
                    resultConfig[fieldId] = fieldValue;
                }
                resultConfig.parameters[fieldId] = fieldValue;
            }
        });
        var spConfFields = ['email', 'last_name', 'first_name', 'account_number', 'logging', 'location', 'phone_number'];
        for (var i = 0; i < spConfFields.length; i++) {
            var key = spConfFields[i];
            if ((key === 'phone_number' || key === 'phone') && !resultConfig[key] && spConf[key]) {
                resultConfig[key] = spConf[key];
            }
            if (!resultConfig.parameters[key] && spConf[key]) {
                resultConfig.parameters[key] = spConf[key];
            }
        }
        if (spConf.parameters) {
            for (var key in spConf.parameters) {
                if (spConf.parameters.hasOwnProperty(key) && spConf.parameters[key] && !resultConfig.parameters[key]) {
                    resultConfig.parameters[key] = spConf.parameters[key];
                }
            }
        }
        return resultConfig;
    }

    function isCallbackFormValid(formId) {
        var isFormValid = true;
        var radioGroupValidated = [];
        removeElementByClassName('error-message');
        loopFormFields(formId, function (field) {
            var isFieldValid = true;
            var type = field.type;
            if (field && field.attributes && field.attributes.hasOwnProperty('required') && !field.value) {
                isFieldValid = false;
                insertError(field);
            }
            if (type === 'radio' && radioGroupValidated.indexOf(field.name) === -1) {
                var radioGroup = document.getElementsByName(field.name);
                var isRadioChecked = false;
                radioGroupValidated.push(field.name);
                for (var i = 0; i < radioGroup.length; i++) {
                    if (radioGroup[i].checked) {
                        isRadioChecked = true;
                    }
                }
                if (!isRadioChecked) {
                    insertError(radioGroup[radioGroup.length - 1]);
                }
                isFieldValid = isRadioChecked;
            }
            if (!isFieldValid) {
                isFormValid = false;
            }
        });
        return isFormValid;
    }

    return {
        isCallbackFormValid: isCallbackFormValid,
        getSnippetFormValues: getSnippetFormValues,
    }

})();
