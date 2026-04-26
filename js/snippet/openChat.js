var snippetOpenChat = function (open, deleteIframe, startSession) {
    var variables = snippetVariables();
    var helper = snippetHelperFunctions();
    var source = sessionStorage.getItem('source');
    var spChatIframe = document.querySelector('#sp-chat-iframe');

    function updateOffset(target, width, height) {
        target.offsetWidth = width;
        target.offsetHeight = height;
    }

    if (widgetConfiguration.isMobile()) {
        var viewport = document.querySelectorAll('head meta[name="viewport"]');
        var head=document.querySelector('head');

        if(!deleteIframe) {
            if (viewport.length > 0 ){
                sessionStorage.setItem('initialViewport', viewport[0].getAttribute('content'));
                viewport[0].parentNode.removeChild(viewport[0]);
            } else {
                sessionStorage.removeItem('initialViewport');
            }
            head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=320, initial-scale=1, maximum-scale=1, user-scalable=no" />');
        } else {
            var initialViewport = sessionStorage.getItem('initialViewport')
            if(viewport.length > 0){
                viewport[0].parentNode.removeChild(viewport[0]);
            }
            if(initialViewport){
                head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="' + initialViewport + '" />');
            } else {
                head.insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=device-width, initial-scale=0" />');
            }
        }
    }

    var fr=document.querySelector('#sp-chat-frame'),
        wi = document.querySelector('#sp-chat-widget'),
        fakeTo = open ? fr : wi,
        fakeFrom = open ? wi : fr,
        snippetConfig = widgetConfiguration.getSnippet();

    snippetKeepOpenedState(open);

    if (!helper.isHidden(fakeTo)) {
        if (deleteIframe) {
            spChatIframe.parentNode.removeChild(spChatIframe);
        }
        return;
    }

    if (window.localStorage.getItem("bp-bc") !== null) {
        fr.parentNode.removeChild(fr);
        return;
    }
    snippetCheckAddFrame(startSession);

    var location = 'bottom_left';
    var direction = 'horizontal';

    if (snippetConfig && snippetConfig.contactTab.location) {
        location = snippetConfig.contactTab.location;
        direction = (location.indexOf('right_') !== -1 || location.indexOf('left_') !== -1) ? "vertical" : "horizontal";
    }
    helper.toggle(fakeTo);
    helper.toggle(fakeTo);

    var fake = document.querySelector('#sp-chat-fake');

    // In order to fix Trac #30629
    var w = 0; // fakeTo.offsetWidth;
    var h = 0; // fakeTo.offsetHeight;
    if (direction === "vertical") {
        open ? updateOffset(fake, h, w) : updateOffset(fake, w, h);
    } else {
        updateOffset(fake, w, h);
    }

    if(source !== 'callbackFormCall'){
        helper.hide(fakeFrom);
    }
    helper.toggle(fake);

    // easing function
    function easeInOutExpo(x, t, b, c, d){
        if (t==0) return b;
        if (t==d) return b+c;
        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }

    // setup
    var start = new Date().getTime();
    var fromWidth = fake.offsetWidth;
    var toWidth = w;
    var fromHeight = fake.offsetHeight;
    var toHeight = h;
    var duration = 1000;

    // animation
    (function animate(){
        var now = (new Date().getTime() - start);
        var ease = easeInOutExpo(0, now, 0, 1, duration);
        fake.style.width = (fromWidth + (toWidth - fromWidth) * ease)+'px';
        fake.style.height = (fromHeight + (toHeight - fromHeight) * ease)+'px';
        if(now < duration){
            setTimeout(animate, 1000/60);
        }
    })();

    setTimeout(function(){
        if((fakeTo === wi && snippetConfig && snippetConfig.contactTab.enabled === false) || (fakeTo === wi && sessionStorage.getItem("confFromOtherPage"))) {} else {
            if(source !== 'callbackFormCall'){
                helper.toggle(fakeTo);
            }
        }
        helper.toggle(fake);
        variables.init = true;
        if (deleteIframe) {

            if(spChatIframe && spChatIframe.parentNode) {
                spChatIframe.parentNode.removeChild(spChatIframe);
            }
            sessionStorage.removeItem('source');

        } else {
            //document.getElementById('sp-chat-iframe').contentWindow.postMessage("sp-dragged", "*");
        }
    }, 400)

};
