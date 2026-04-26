
function sendRequestToClientWebserver(resource, callback) {
    var url = SERVICE_PATTERN_CHAT_CONFIG.apiUrl + '/' + resource
        + '?tenantUrl=' + encodeURIComponent(SERVICE_PATTERN_CHAT_CONFIG.tenantUrl)
        + '&domain=' + window.location.host
        + '&appId=' + SERVICE_PATTERN_CHAT_CONFIG.appId;

    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            callback(xmlhttp);
        }
    };

    xmlhttp.withCredentials = true;
    xmlhttp.crossDomain = true;
    xmlhttp.open("GET", url, true);
    xmlhttp.setRequestHeader('Authorization', 'MOBILE-API-140-327-PLAIN appId="' + SERVICE_PATTERN_CHAT_CONFIG.appId + '", clientId="' + SERVICE_PATTERN_CHAT_CONFIG.clientId + '"');

    xmlhttp.send();
    return xmlhttp.onreadystatechange();
}

function merge(object1, object2) {
    var newObj = {};
    for (var key in object1) {
        newObj[key] = object1[key];
    }
    for (var key in object2) {
        newObj[key] = object2[key];
    }
    return newObj;
}

sendRequestToClientWebserver('configuration', function (xmlhttp) {
    var config = JSON.parse(xmlhttp.responseText);

    var surflySnippetScript = document.createElement('script');
    surflySnippetScript.innerHTML = "(function(s,u,r,f,l,y){s[f]=s[f]||{init:function(){s[f].q=arguments}};" +
        "l=u.createElement(r);y=u.getElementsByTagName(r)[0];l.async=1;" +
        "l.src='https://surfly.com/surfly.js';y.parentNode.insertBefore(l,y);})" +
        "(window,document,'script','Surfly');";
    document.body.appendChild(surflySnippetScript);

    setTimeout(function() {
        Surfly.init(merge(
            {
                widget_key: config.cobrowsing.SURFLY
            },
            SERVICE_PATTERN_CHAT_CONFIG.surflySettings || {}
        ), function(initResult) {
            if (initResult.success) {
                if (Surfly.isInsideSession) {
                    console.log('#Session: init');
                    setTimeout(function() {
                        if (Surfly.currentSession) {
                            Surfly.currentSession.on('control', function(session, event) {
                                var elements = document.querySelectorAll('[surfly_blocked]');
                                [].forEach.call(elements, function(el) { el.disabled = event.to === 0 ? false : true });
                            });
                        }
                    }, 1000);
                }
            } else {
                console.error('#Session: Surfly was unable to initialize properly.');
            }
        });
    }, 100);
});
