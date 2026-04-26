var updateChatStyles = function (currentWidget, styles) {

    function applyStyle(prefix, style, hasBase) {

        var appliedStyles = [];
        if (hasBase) {
            appliedStyles.push({name: 'baseFont', className: 'base-font'});
        }

        appliedStyles = appliedStyles.concat([
            {
                name: 'clientMessage',
                className: 'clientMessage'
            },
            {
                name: 'agentMessage',
                className: 'agent-message'
            },
            {
                name: 'contactTabBorder',
                className: 'contact-tab-border'
            }, {
                name: 'contactTabFont',
                className: 'contact-tab-font '
            }, {
                name: 'contentMargin',
                className: 'content-margin'
            }, {
                name: 'dialogShadow',
                className: 'dialog-shadow'
            }, {
                name: 'systemMessage',
                className: 'system-message'
            }, {
                name: 'titleFont',
                className: 'title-font'
            }, {
                name: 'widgetBackground',
                className: 'widget-background'
            }, {
                name: 'widgetBorder',
                className: 'widget-border'
            }, {
                name: 'baseFont',
                className: 'base-font'
            }, {
                name: 'widgetBorderRadius',
                className: 'widget-border-radius'
            }]);

        return appliedStyles.map(function (part) {
            return [
                prefix,
                '.' + part.className + '{',
                toCssStyle(style[part.name]),
                '}'
            ].join(' ');
        }).join(' ');
    }

    function writeStyleSheet(styles) {
        var dynamicStyle = document.querySelector('#dynamicStyle');
        if(dynamicStyle) dynamicStyle.parentNode.removeChild(dynamicStyle);

        var sheet = document.createElement('style');
        sheet.id = 'dynamicStyle';
        sheet.innerHTML = styles;
        document.body.appendChild(sheet);
    }

    function toCssStyle(style) {
        return (style) ? Object
            .keys(style)
            .map(function (key) {
                var value = style[key];
                return [
                    key,
                    ':',
                    value,
                    ';'
                ].join('');
            })
            .join(''): "";
    }

    function parseHexRGBToDec(hexRgb) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexRgb);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    if (styles){
        var key = Object.keys(styles)[0];

        var css = applyStyle('', styles[key]);

        var highlightsColor = (currentWidget && currentWidget.color) ? currentWidget.color : "2db2dd";
        var highlightsTextColor = (currentWidget && currentWidget.textColor) ? currentWidget.textColor : "fff";
        var videoCallEnabled = 'flex';
        var widgetMinimizationEnabled = 'flex';

        var fullConf = JSON.parse(sessionStorage.getItem("fullConf"));
        var definition = widgetConfiguration.getDefinition();
        if (fullConf && fullConf.widget && fullConf.widget.chatWidgetStyling){
            highlightsColor = fullConf.widget.chatWidgetStyling.color;
            highlightsTextColor = fullConf.widget.chatWidgetStyling.textColor;
            videoCallEnabled = fullConf.widget.chatWidgetStyling.videoCallEnabled ? 'flex' : 'none';
            widgetMinimizationEnabled = fullConf.widget.chatWidgetStyling.widgetMinimizationEnabled === false ? 'none' : 'flex';
        }

        if (definition && definition.chatWidgetStyling) {
            highlightsColor = definition.chatWidgetStyling.color;
            highlightsTextColor = definition.chatWidgetStyling.textColor;
            videoCallEnabled = definition.chatWidgetStyling.videoCallEnabled ? 'flex' : 'none';
            widgetMinimizationEnabled = definition.chatWidgetStyling.widgetMinimizationEnabled === false ? 'none' : 'flex';
        }

        var hlColor = parseHexRGBToDec(highlightsColor);

        var highlightsStyle = [
            '.main-background-color {',
            'background:#' + highlightsColor,
            '}',

            '.main-background-color-important {',
                'background:#' + highlightsColor + ' !important',
            '}',

            '.tab_active path {',
            'fill:#' + highlightsColor,
            '}',

            '.main-path-color path {',
            'fill:#' + highlightsTextColor,
            '}',

            '.main-stroke-color line {',
            'stroke:#' + highlightsTextColor,
            '}',

            '.main-fill-color {',
            'fill:#' + highlightsColor,
            '}',

            '.main-color {',
            'color:#' + highlightsColor,
            '}',

            '.widget-border {',
            'border-color:#' + highlightsColor + '!important;',
            'background:#ffffff',
            '}',

            '.second-background-color {',
            'background:#' + highlightsTextColor,
            '}',

            '.second-fill-color {',
            'fill:#' + highlightsTextColor,
            '}',

            '.second-color {',
            'color:#' + highlightsTextColor + '!important',
            '}',

            '.second-color a, .second-color a:link, .second-color a:visited, .second-color a:active {',
            'color:#' + highlightsTextColor + '!important',
            '}',

            '#preview #callMe {',
            'display:' + videoCallEnabled,
            '}',
            
            '#preview #minimizeChat {',
            'display:' + widgetMinimizationEnabled,
            '}',

            // for buttons /choice
            '.btns.choice button:hover {',
                'background-color: rgba(' + hlColor.r + ',' + hlColor.g + ',' + hlColor.b + ',.7)',
            '}'

        ].join(' ');



        writeStyleSheet([highlightsStyle, css].join(' '));
    }
};
