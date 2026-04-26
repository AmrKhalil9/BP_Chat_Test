var clientChatPageGenerateInputs = function (object, parentElement) {
    var formInputsOutput = '';
    var i18n = clientChatUiI18n();
    var fieldTypes = {
        LABEL: 'label',
        CALLBACK_PHONE: 'callback_phone',
        PHONE: 'phone',
        EMAIL: 'email',
        NAME: 'name',
        TEXT: 'text',
        DATE: 'date',
        MULTILINE_TEXT: 'multiline_text',
        SLIDER: 'numerical_range_slider',
        RADIO: 'radio_buttons',
        CAPTCHA: 'captcha',
        CONTACT_BUTTON: 'contact_button',
        SELECTION_LIST: 'selection_list',
    };

    function generateCaptcha(options) {
        var text = '';
        for (var i = 0; i < options.captchaLength; i++) {
            var rand = Math.floor(Math.random() * options.chars.length);
            text += options.chars.charAt(rand);
        }
        return text;
    }

    // ToDo: Add "name" input for captcha to admin tool.
    function generateFieldName(field, arrayIndex) {
        if (field.formFieldType === fieldTypes.CAPTCHA) {
            field.name = 'captcha_text';
        }
        return field.name ? field.name.replace(/\s/g, '_') : 'field_' + arrayIndex;
    }

    if (object) {
        object.forEach(function (item, i, arr) {
            var formFieldType = item.formFieldType,
                placeholder = item.name,
                name = generateFieldName(item, i),
                id = name,
                required = item.required ? "true" : "false",
                ariaRequired = !!item.required,
                validate = !!item.validate,
                requiredSuffix = item.required ? '*' : '',
                label = (typeof item.label !== 'undefined' && item.label != null) ? item.label + requiredSuffix : '',
                options = item.options,
                outputCurrent = '',
                value = (widgetConfiguration.isPreviewMode() && commonUtilService.isDefined(SERVICE_PATTERN_CHAT_CONFIG[item.name])) ? SERVICE_PATTERN_CHAT_CONFIG[item.name] : '',
                nextItem = object[i + 1];
            var errorMessageText = i18n.requiredField;
            var errorMsg = (item.required || validate) ? ' <div id="error-' + name + '" class="error-balloon">' + errorMessageText + '</div>' : '';
            switch (formFieldType) {

                case fieldTypes.LABEL: {
                    var forAttribute = '';
                    if (commonUtilService.isDefined(nextItem)) {
                        forAttribute = generateFieldName(nextItem, i + 1);
                    }
                    outputCurrent = htmlUtilService.wrapWithDiv('field-wrapper field-label', htmlUtilService.wrapWithLabel('', label, name, forAttribute));
                    break;
                }

                case fieldTypes.CALLBACK_PHONE:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-callback-phone',
                        htmlUtilService.generateInput('tel', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.PHONE:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-phone_number',
                        htmlUtilService.generateInput('tel', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.EMAIL:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-email',
                        htmlUtilService.generateInput('email', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.NAME:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-name',
                        htmlUtilService.generateInput('text', id, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.TEXT:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-text',
                        htmlUtilService.generateInput('text', id, value, validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.DATE:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-date',
                        htmlUtilService.generateInput('datetime', name, "", validate, name, label, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.MULTILINE_TEXT:
                    var rows = ((commonUtilService.isObject(options) && Array.isArray(options) && options.length === 1) ? options[0] : '');
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-multiline',
                        htmlUtilService.generateTextArea(name, id, value, label, rows, required, ariaRequired, 'agent-message') + errorMsg
                    );
                    break;

                case fieldTypes.SLIDER:
                    var middleValue = Math.floor(((item.maxValue - item.minValue)/2)) + item.minValue;
                    outputCurrent = '' +
                        '<div class="field-wrapper field-range">' +
                        '<input oninput="$(this).siblings(\'.currentValue\').html($(this).val());"' +
                        'class=""' +
                        'type="range" ' +
                        'id="' + id +
                        '" name="' + name +
                        '" placeholder="' + label +
                        '" min="' + item.minValue +
                        '" max="' + item.maxValue +
                        '" value="" ' +
                        (required === 'true' ? ('required="' + required + '" ') : '') +
                        ariaRequired +
                        '/>' +
                        '<div class="minValue">' + item.minValue + '</div>' +
                        '<div class="maxValue">' + item.maxValue + '</div>' +
                        '<div class="currentValue">' + middleValue + '</div>' +
                        errorMsg +
                        '</div>';
                    break;

                case fieldTypes.RADIO:
                    var radioOptions = '';
                    options.forEach(function (option, j) {
                        radioOptions += htmlUtilService.wrapWithDiv(
                            'option',
                            htmlUtilService.generateInput('radio', name + '_' + j, option, validate, name, "", required, ariaRequired, '') +
                            htmlUtilService.wrapWithLabel('', option, '', name + '_' + j)
                        );
                    });
                    outputCurrent = htmlUtilService.wrapWithDiv('field-wrapper field-radio', radioOptions + errorMsg);
                    break;

                case fieldTypes.CAPTCHA:

                    var defaults = {
                        captchaLength: 5,
                        chars: commonConstants.alphabet
                    };

                    var captchaText = generateCaptcha(defaults);

                    var table = $('<table></table>')

                    var row = $('<tr></tr>').appendTo(table);
                    for (var k = 0; k < captchaText.length; k++) {
                        $('<td>' + captchaText.charAt(k) + '</td>').css({
                            'border': '1px solid lightgrey'
                        }).appendTo(row);
                    }

                    outputCurrent = htmlUtilService.wrapWithDiv('field-wrapper field-captcha',
                        htmlUtilService.wrapWithLabel('', 'Enter the text shown below: ') +
                        htmlUtilService.wrapWithDiv('captcha_wrapper',
                            '<input type="text" required="true" name="captcha_text" id="captcha_text" class="agent-message" />' +
                            '<table class="captcha">' + table.html() + '</table>'
                        ) +
                        htmlUtilService.wrapWithDiv('error-balloon', 'Incorrect code', 'error-captcha')
                    );
                    break;

                case fieldTypes.CONTACT_BUTTON:
                    outputCurrent = htmlUtilService.wrapWithDiv(
                        'field-wrapper field-contact-button',
                        htmlUtilService.generateInput('button', id, "Contact button") + errorMsg
                    );
                    break;

                case fieldTypes.SELECTION_LIST:
                    var req = (required === 'true' ? ('required="' + required + '" ') : '');
                    outputCurrent = '' +
                        '<div class="field-wrapper field-select">' +
                        '<select id="' + id + '" name="' + name + '" ' + req + ariaRequired + '">' +
                        '<option value="" disabled selected>' + label + '</option>';
                    options.forEach(function (option) {
                        outputCurrent += '<option value="' + option + '">' + option + '</option>';
                    });
                    outputCurrent += '</select>' + errorMsg + '</div>';
                    break;
            }

            formInputsOutput += outputCurrent;

        });

        $(parentElement).html(formInputsOutput);

        $('.tabChat').on('click', function () {
            $('#preChatForm').addClass('question__chat-tab_active');
            $('#preChatForm').removeClass('question__call-tab_active');
        });

        $('.tabPhone').on('click', function () {
            $('#preChatForm').addClass('question__call-tab_active');
            $('#preChatForm').removeClass('question__chat-tab_active');
        });

        $('.radioStars input').on('change', function () {
            $(this).parent().attr('data-rated', $(this).val());
        })
    }
};
