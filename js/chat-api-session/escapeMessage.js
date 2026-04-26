
/* Custom HTML sanitizer
    needs to be in sync with AD version at agentdesktop/src/com/brightpattern/agentdesktop/client/chat/presenter/ChatUtils.java
 */
var escapeHTML = function(msg) {
    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = msg;
    
    var result = escapeRecursive(document.createElement("div"), tempDiv.childNodes);

    return result.innerHTML;
}

var escapeRecursive = function(result, childNodes) {
    if (childNodes.length === 0) {
        return result;
    }

    [].forEach.call(childNodes, function (node) {
        switch (node.nodeName) {
            case "A":
                var a;
                var href = node.href;
                if(isValidHrefAttribute(href)) {
                    a = document.createElement("a");
                    a.setAttribute("href", encodeURI(href));
                    a.setAttribute("target", "_blank");
                    a.innerText = node.innerText;
                } else {
                    a = document.createTextNode(node.innerText);
                }
                
                result.appendChild(a);

                break;
            case "BR":
                var br = document.createElement("br");
                result.appendChild(br);
                break;
            case "#text":
                var tmpDiv = document.createElement("div");
                tmpDiv.innerText = node.nodeValue;
                if (tmpDiv.childNodes.length > 1) {
                    escapeRecursive(result, tmpDiv.childNodes);
                } else {
                    result.appendChild(tmpDiv.childNodes[0]);
                }
                break;
            case "DIV":
                // Safari-specific issue trac #26009, part 2
                if (commonUtilService.isSafari()) {
                    var br = document.createElement("br");
                    result.appendChild(br);
                    if (node.childNodes.length !== 1 || node.childNodes[0].nodeName !== "BR") {
                        escapeRecursive(result, node.childNodes);
                    }
                }
                break;
            default:
                escapeRecursive(result, node.childNodes);
                break;
        }
    });

    return result;
}

var isValidHrefAttribute = function(href){
    return (isValidProtocol(href) && isValidHost(href)) || isValidEmailAddress(href);
}

var isValidProtocol = function(href){
    return !!href.match(/^((https?|ftp):\/\/|\.{0,2}\/)/);
}

var isValidHost = function(href){
    var a = document.createElement("a");
    a.href = href;
    
    return !!a.host;
}

var isValidEmailAddress = function(href){
    var pattern = /^mailto:[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return !!href.match(pattern);
}

