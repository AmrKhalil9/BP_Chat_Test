var buildProactiveOfferPreview = function () {
    var config = widgetConfiguration.getObject();
    var styling = config.styling;
    var properties = config.properties;
    var $offer = $('.proactive-offer'),
        $content = $offer.find('.proactive-offer__content');

    if (config.widgetType === 'proactive_offer') {

        var paAnimationIn = styling.animationIn,
            paAnimationOut = styling.animationOut,
            paPosition = styling.location || 'center',
            paAnimationInAttr = (commonUtilService.includes(paAnimationIn, 'slide')) ? paPosition + '_' + paAnimationIn : paAnimationIn,
            paAnimationOutAttr = (commonUtilService.includes(paAnimationOut, 'slide')) ? paPosition + '_' + paAnimationOut : paAnimationOut;

        var $body = $offer.find('.proactive-offer__body'),
            $callButton = $offer.find('.proactive-offer__button_type_call'),
            $chatButton = $offer.find('.proactive-offer__button_type_chat'),
            $closeButton = $offer.find('.proactive-offer__close.proactive-offer__button'),
            $close = $offer.find('.proactive-offer__close.close-icon');

        $callButton.toggleClass('proactive-offer__button_hide_yes', !properties.callButtonEnabled);
        $chatButton.toggleClass('proactive-offer__button_hide_yes', !properties.chatButtonEnabled);

        $callButton.text(properties.callButtonText);
        $chatButton.text(properties.chatButtonText);
        $closeButton.text(properties.cancelButtonText);

        $close.toggleClass('proactive-offer__close_hide_yes', !properties.closeButtonEnabled);

        $content.html(properties.htmlContent);

        $body.width(styling.width)
            .height(styling.height);
    }
    if (widgetConfiguration.isPreviewMode()) {
        $offer.removeClass();
        $offer.addClass('widget-background proactive-offer base-font');
        if ($offer) {
            $offer.removeAttr('data-animationIn');
            $offer.attr('data-animationIn', paAnimationInAttr);
            $offer.removeClass('position_center');
            $offer.addClass('position_' + paPosition);

            if (styling && sessionStorage.getItem('data-animationOut') != paAnimationOutAttr) {
                sessionStorage.setItem('runOutAnimation', true);
                setTimeout(function () {
                    sessionStorage.removeItem('runOutAnimation');
                }, 1000);
            }
        }

        if (sessionStorage.getItem('runOutAnimation')) {
            $offer.removeAttr('data-animationIn').removeAttr('data-animationOut').removeClass('removing');
            $offer.attr('data-animationOut', paAnimationOutAttr);
            $offer.addClass('removing');
            setTimeout(function () {
                $offer.removeAttr('data-animationOut').removeClass('removing');
                sessionStorage.removeItem('runOutAnimation');
            }, 700);
        }

        if (styling) {
            sessionStorage.setItem('data-animationOut', paAnimationOutAttr);
        }
    }
};
