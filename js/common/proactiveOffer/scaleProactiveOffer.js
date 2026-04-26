var scaleProactiveOffer = function () {
    var offer = $('.proactive-offer');
    if (offer) {
        var content = offer.find('.proactive-offer__content');
        if (content) {
            var contentHeight = content.outerHeight(),
                contentWidth = content.outerWidth(),
                buttonsHeight = $('.proactive-offer__button-wrapper').outerHeight(),
                buttonsWidth = 0,
                screenWidth = offer.width(),
                screenHeight = offer.height(),
                scaled = 1;
            $('.proactive-offer__button-wrapper > *').each(function () {
                buttonsWidth += $(this).width() + 10;
            });
            var POheight = contentHeight + buttonsHeight,
                POwidth = Math.max.apply(Math, [contentWidth, buttonsWidth]);

            if (POwidth > screenWidth) {
                var coefX = screenWidth / POwidth;
            }
            if (POheight > screenHeight) {
                var coefY = screenHeight / POheight;
            }
            if (coefX || coefY) {
                var coef = Math.max.apply(Math, [coefX, coefY]),
                    scale = 100 / coef;

                $('.proactive-offer__content-wrapper>div').attr('style', 'transform:scale(' + coef + ');');
                content.css('width', scale + '%');
                setTimeout(function () {
                    scaled = 0;
                }, 3000);
            }
        }
    }
};
