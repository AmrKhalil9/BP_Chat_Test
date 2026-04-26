var htmlUtilService = (function () {

    function wrapWithDiv(classWrapper, inner, id) {
        return '<div ' +
            (id ? ('id="' + id + '" ') : '') +
            (classWrapper ? ('class="' + classWrapper + '"') : '') + '>' + inner + '</div>'
    }

    function wrapWithLabel(classWrapper, inner, id, forAttr) {
        return '<label ' +
            (id ? ('id="' + id + '" ') : '') +
            (forAttr ? ('for="' + forAttr + '" ') : '') +
            (classWrapper ? ('class="' + classWrapper + '"') : '') + '>' + inner + '</label>'
    }

    function generateInput(type, id, value, validate, name, placeholder, isRequired, ariaRequired, className) {
        return '<input class="' + className + '" ' +
            'value="'+ value + '" ' +
            'type="' + type + '" ' +
            'id="' + id + '" ' +
            'name="' + name + '" ' +
            'placeholder="' + placeholder + '" ' +
            (validate ? ('data-validate="' + validate + '" ') : '') +
            (isRequired === 'true' ? ('required="' + isRequired + '" ') : '') +
            (ariaRequired ? ('aria-required="' + ariaRequired + '"') : '') + ' />';
    }

    function generateTextArea(id, name, value, placeholder, rows, isRequired, ariaRequired, className) {
        return '<textarea class="' + className + '" ' +
            'id="' + id + '" ' +
            'name="' + name + '" ' +
            'placeholder="' + placeholder + '" ' +
            (isRequired === 'true' ? ('required="' + isRequired + '" ') : '') +
            ((rows !== '') ? ('rows="' + rows + '" ') : ('height="80px" ')) +
            (ariaRequired ? ('aria-required="' + ariaRequired + '"') : '') + '>'+ value + '</textarea>'
    }

    function insertStyles(target, position, pathArray) {
        if (Array.isArray(pathArray)) {
            commonUtilService.forEach(pathArray, function(path) {
                target.insertAdjacentHTML(position, '<link href="' + path + '" type="text/css" rel="stylesheet" />');
            });
        }
    }

    function displayNone(element) {
        if (element && element.css) {
            element.css('display', 'none')
        }
    }

    function displayBlock(element) {
        if (element && element.css) {
            element.css('display', 'block')
        }
    }

    function displayInlineBlock(element) {
        if (element && element.css) {
            element.css('display', 'inline-block')
        }
    }

    function displayFlex(element) {
        if (element && element.css) {
            element.css('display', 'flex')
        }
    }

    function hasElementRequiredFields(elementSelector) {
        var items = $(elementSelector + ' *[required="true"]');
        return items.length > 0;
    }

    function setDivHoverById(elementId, title) {
        if (document && elementId && title) {
            var element = document.getElementById(elementId);
            if (element) {
                element.setAttribute('title', title)
            }
        }
    }

    // Converts html entities to characters safely: '&amp;' --> '&'
    function htmlDecode(input) {
        // IE9-
        if (typeof DOMParser !== 'function') return input;

        var doc = new DOMParser().parseFromString(input, "text/html");
        return doc.documentElement.textContent;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function unescapeHtml(safe) {
        return safe
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, '\'');
    }

    return {
        wrapWithDiv: wrapWithDiv,
        wrapWithLabel: wrapWithLabel,
        generateInput: generateInput,
        generateTextArea: generateTextArea,
        insertStyles: insertStyles,
        displayNone: displayNone,
        displayBlock: displayBlock,
        displayInlineBlock: displayInlineBlock,
        displayFlex: displayFlex,
        hasElementRequiredFields: hasElementRequiredFields,
        setDivHoverById: setDivHoverById,
        htmlDecode: htmlDecode,
        escapeHtml: escapeHtml,
        unescapeHtml: unescapeHtml
    }

})();
