var chatCompareUrl = function (comparedUrl) {

    var parentHost = sessionStorage.getItem('parentHost')

    var sourceRelativeUrl = (parentHost) ? sessionStorage.getItem('parentPath') : window.location.pathname.split('#')[0],
        sourceAbsoluteUrl = (parentHost) ? sessionStorage.getItem('parentHost') + sessionStorage.getItem('parentPath') : window.location.host + window.location.pathname.split('#')[0],
        sourceRelativeUrlSegments = sourceRelativeUrl.split('#')[0].split('/');
    var sourceAbsoluteUrlSegments = sourceAbsoluteUrl.split('#')[0].split('/');
    var comparedUrlSegments = comparedUrl.split('#')[0].split('/');
    var check = false,
        urlItemType = {
            path: (comparedUrl.substring(0, 1) === '/') ? 'relative' : 'absolute',
            object: (comparedUrl.substring(comparedUrl.length - 1, comparedUrl.length) === '/') ? 'folder' : 'file'
        };

    var weight = 0;

    function updateWeight(sourceUrlSegments) {
        for (var i = 0; i < comparedUrlSegments.length - 1; i++) {
            var current = i + 1;
            if (comparedUrlSegments[i] === sourceUrlSegments[i]) {
                weight++
            }
            check = (current === weight);
        }
    }

    if (urlItemType.object === 'file') {
        if (comparedUrl === sourceAbsoluteUrl && urlItemType.path === 'absolute') weight = 999;
        if (comparedUrl === sourceRelativeUrl && urlItemType.path === 'relative') weight = 998;
        check = true;
    }

    if (urlItemType.object === 'folder') {
        if (urlItemType.path === 'relative') updateWeight(sourceRelativeUrlSegments);
        if (urlItemType.path === 'absolute') updateWeight(sourceAbsoluteUrlSegments);
    }

    return {check: check, weight: weight};
};
