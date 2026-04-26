var clientChatUiEscapeHtml = function (string, escapeHtml) {
    var div = document.createElement('div');
    if (escapeHtml) {
        div.innerText = string;
    } else {
        div.innerHTML = string;
    }

    // put links here, so we can avoid wrapping nested links a couple of times
    var links = [];

    // URLs starting with protocol
    var pattern1 = {
        pattern: /(?:^|(?!\s))((?:https?|ftp):\/\/\S+)/gim,
        template: '<a href="$1" target="_blank">$1</a>',
        isUrl: true
    };

    // URLs starting with www.
    var pattern2 = {
        pattern: /(?:^|(?!\s))(www\.\S+)/gim,
        template: '<a href="http://$1" target="_blank">$1</a>',
        isUrl: true,
        withoutProtocol: true
    };

    // emails
    var pattern3 = {
        pattern: /(?:^|(?!\s))([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gim,
        template: '<a href="mailto:$1">$1</a>'
    };

    var patterns = [pattern1, pattern2, pattern3];

    traverse(div);

    return div.innerHTML;

    function makeId() {
        return '$$$link$$$' + Math.random().toString(36).slice(2) + '$$$';
    }

    function chunkNewLines(text) {
        var chunks = [];
        for (var i = 0; i < text.length; ++i) {
            var iType = text[i] === '\n' ? 'new-line' : 'text';
            if (chunks.length && chunks[chunks.length - 1].type === iType) {
                chunks[chunks.length - 1].value += text[i];
            } else {
                chunks.push({
                    type: iType,
                    value: text[i]
                });
            }
        }
        return chunks;
    }

    function traverse(node) {
        switch (node.nodeType) {
            case Node.TEXT_NODE: {
                var chunks = chunkNewLines(node.textContent);
                for (var k = 0; k < chunks.length; ++k) {
                    if (chunks[k].type === 'new-line') {
                        var textNode = document.createTextNode(chunks[k].value);
                        node.parentNode.insertBefore(textNode, node);
                    } else if (chunks[k].type === 'text') {
                        var result = replace(chunks[k].value);
                        for (var i = 0; i < result.length; i++) {
                            node.parentNode.insertBefore(result[i], node);
                        }
                    }
                }
                node.parentNode.removeChild(node);
                break;
            }
            case Node.ELEMENT_NODE: {
                if (node.nodeName !== "A") {
                    for (var i = 0; i < node.childNodes.length; i++) {
                        traverse(node.childNodes[i]);
                    }
                }
                break;
            }
        }
    }

    function replace(text) {
        //as we got text and we want to append anchors to it, we need convert it to HTML
        var tempDiv = document.createElement('div');
        tempDiv.innerText = text;
        var escaped = tempDiv.innerHTML;
        // replace every link with id
        patterns.forEach(function (pattern) {
            escaped = escaped.replace(pattern.pattern, function (match, $1)  {
                if (pattern.isUrl && !validateUrl($1, pattern.withoutProtocol)) {
                    return $1;
                }
                var id = makeId();
                links.push({
                    template: pattern.template,
                    id: id,
                    // null is for matching indices with $ names
                    match: $1
                });
                return id;
            });
        });

        // replace link id with transformed link
        links.forEach(function (link) {
            var html = link.template
                .replace('$1', link.match)
                .replace('$1', link.match);
            escaped = escaped.replace(link.id, html);
        });
        tempDiv.innerHTML = escaped;
        var result = [];
        for (var i = 0; i < tempDiv.childNodes.length; i++) {
            result.push(tempDiv.childNodes[i]);
        }
        return result;
    }

    function validateUrl(url, withoutProtocol) {
        var tempAnchor = document.createElement('a');
        if (withoutProtocol) {
            tempAnchor.href = 'http://' + url;
        } else {
            tempAnchor.href = url;
        }
        return !!tempAnchor.host;
    }
};
