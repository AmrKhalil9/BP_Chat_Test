var commonUtilService = (function () {

    function isUndefined(item) {
        return typeof item === 'undefined'
    }

    function isDefined(item) {
        return typeof item !== 'undefined'
    }

    function isObject(item) {
        return typeof item === 'object'
    }

    function isString(item) {
        return typeof item === 'string'
    }

    function isNumber(item) {
        return typeof item !== 'number'
    }

    function stringIsTrue(str) {
        var result = false;
        try {
            var parsed = JSON.parse(str);
            result = parsed === true
        } catch (err) {}
        return result
    }

    function stringIsFalse(str) {
        var result = false;
        try {
            var parsed = JSON.parse(str);
            result = parsed === false
        } catch (err) {}
        return result
    }

    function includes(str1, str2) {
        return isString(str1) && isString(str1) && (str1.indexOf(str2) !== -1);
    }

    function forEach(array, callback) {
        if (Array.isArray(array)) {
            for (var i = 0; i < array.length; i++) {
                callback(array[i], i)
            }
        }
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

    function startsWith(str, prefix) {
        if (typeof str !== 'string') {
            return false;
        }
        return str.substring(0, prefix.length) === prefix;
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function isServiceAvailable() {
        return sessionStorage.getItem('serviceAvailable') == 'true';
    }

    function isServiceNotAvailable() {
        return sessionStorage.getItem('serviceAvailable') == 'false';
    }

    function isEWTExceedThreshold(threshold) {
        var ewt = sessionStorage.getItem('ewt') || 0;
        console.log('EWT: ' + ewt);
        return ewt > threshold;
    }

    function isJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    function transformYear(year) {
        var currentYear = new Date().getFullYear();
        if (year.length === 2) {
            if (parseInt('20' + year) > currentYear) {
                year = '19' + year;
            } else {
                year = '20' + year;
            }
        }
        return year;
    }

    function hasAnsii(str) {
        var re = /[^\x00-\x7F]/g;
        return re.test(str)
    }

    function isLeapYear(year) {
        return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
    }

    // mm/dd/yyyy format
    function validateDate(dateString) {
        // First check for the pattern
        var pattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
        var matched = !!dateString.match(pattern);
        if (!matched) {
            return false;
        }

        // Parse the date parts to integers
        var parts = dateString.split("/");
        var day = parseInt(parts[1], 10);
        var month = parseInt(parts[0], 10);
        var year = parseInt(transformYear(parts[2]), 10);

        // Check the ranges of month and year
        if (year < 1000 || year > 3000 || month == 0 || month > 12) {
            return false;
        }

        var monthLength = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // Check the range of the day
        return day > 0 && day <= monthLength[month - 1];
    }

    function validatePhoneNumber(phone) {
        var maxLength = 30;
        var re = /^[0-9+().\/\\\-\s]*$/gm;
        if (phone.length <= maxLength) {
            var phoneArr = phone.split('');
            if (phoneArr.indexOf('+') !== -1) {
                if (phone.split('+').length - 1 > 1 || phoneArr.indexOf('+') !== 0) {
                    return false;
                }
            }
            return re.test(phone);
        }
        return false;
    }

    function validateEmail(email) {
        var maxLength = 255;
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return email.length <= maxLength && re.test(email) && !hasAnsii(email);
    }


    function isIE() {
        ua = navigator.userAgent;
        /* MSIE used to detect old browsers and Trident used to newer ones*/
        var is_ie = ua.indexOf("MSIE ") > -1 || ua.indexOf("Trident/") > -1;
        return is_ie; 
    }

    function isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    /**
     * Return 'new' or 'old' or 'not-viewed'
     * @param {*} event 
     */
    function getIncomingEventStatus(event) {
        var eventId = event.msg_id ? Number(event.msg_id) : NaN;
        var latestSentMsgId = Number(localStorage.getItem('bp-sent-message-id'));
        if (!isNaN(eventId) && eventId < latestSentMsgId) {
            return 'old';
        }
        var bpLastMessageTimestampData = sessionStorage.getItem('bp-last-message-timestamp');
        if (!bpLastMessageTimestampData) {
            return 'new';
        }
        bpLastMessageTimestampData = JSON.parse(bpLastMessageTimestampData);
        if (isDefined(event.timestamp)) {
            if (!bpLastMessageTimestampData.timestamp) {
                return 'new';
            }
            try {
                var newTimestampNumber = Number(event.timestamp);
                var lastTimestampMinNumber = Number(bpLastMessageTimestampData.timestampMin);
                var lastTimestampNumber = Number(bpLastMessageTimestampData.timestamp);
                if (bpLastMessageTimestampData.timestampMin) {
                    if (newTimestampNumber > lastTimestampNumber) {
                        return 'new';
                    } else if (newTimestampNumber > lastTimestampMinNumber) {
                        return 'not-viewed';
                    } else {
                        return 'old';
                    }
                }
                return (newTimestampNumber > lastTimestampNumber ? 'new' : 'old');
            } catch (e) {}
        }
        return 'old';
    }

    function saveLastEventTimestamp(event) {
        if (getIncomingEventStatus(event) === 'new' && event.fromName !== 'me') {
            var bpLastMessageTimestampData = sessionStorage.getItem('bp-last-message-timestamp');
            if (bpLastMessageTimestampData) {
                bpLastMessageTimestampData = JSON.parse(bpLastMessageTimestampData);
            }
            var timestampMin = null;
            if (bpLastMessageTimestampData && sessionStorage.getItem('bp-minimized') === 'true') {
                if (bpLastMessageTimestampData.timestampMin) {
                    timestampMin = bpLastMessageTimestampData.timestampMin;
                } else {
                    timestampMin = bpLastMessageTimestampData.timestamp;
                }
            }
            var timestamp = event.timestamp ? event.timestamp : bpLastMessageTimestampData ? bpLastMessageTimestampData.timestamp : null;
            sessionStorage.setItem('bp-last-message-timestamp', JSON.stringify({
                timestamp: timestamp,
                timestampMin: timestampMin
            }));
        }
    }

    function getPassedTimeText(timestampInSeconds) {
        timestampInSeconds = parseInt(timestampInSeconds);
        var i18n = clientChatUiI18n();
        var secondsNow = Math.floor(Date.now() / 1000);
        var ret;
        var label = '';
        try {
            var minutes = Math.floor((secondsNow - timestampInSeconds) / 60);
            if (minutes <= 1) {
                return i18n.justNowMessageArrivalTimeIndicator;
            } else if (minutes < 60) {
                ret = minutes;
                label = i18n.minutesAgoMessageArrivalTimeIndicator;
            } else {
                var hours = Math.floor(minutes / 60);
                if (hours < 24) {
                    ret = hours;
                    label = i18n.hoursAgoMessageArrivalTimeIndicator;
                } else {
                    var days = Math.floor(hours / 24);
                    ret = days;
                    label = i18n.daysAgoMessageArrivalTimeIndicator;
                }
            }
        } catch (e) {}
        if (!ret || isNaN(ret)) {
            return i18n.someTimeAgoMessageArrivalTimeIndicator;
        }
        return ret + label;
    }

    var defaultData = {
        height: {
            value: undefined,
            auto: true
        },
        width: {
            value: undefined,
            auto: true
        }
    };
    function updateParentDimensions(data) {
        if (!data) {
            data = defaultData;
        }
        var iter = 0;
        (function updateCall() {
            if (iter > 20) {
                return;
            }
            iter++;
            var minInnerChat = document.getElementById('min_inner_chat');
            if (!minInnerChat) {
                return;
            }
            var cmpStyle = getComputedStyle(minInnerChat);
            var boundingRect = minInnerChat.getBoundingClientRect();
            if (cmpStyle.display === 'none' || cmpStyle.height === 'auto') {
                return setTimeout(updateCall, 50);
            }
            var currentMsgNumber = Number(sessionStorage.getItem('bp-min-message-counter'));
            parent.postMessage(JSON.stringify({
                type: 'bp-dimensions',
                data: {
                    height: ((data.height && data.height.value) ? data.height.value : (data.height && data.height.auto) ? currentMsgNumber > 0 ? boundingRect.height + 'px' : '0' : undefined),
                    width: ((data.width && data.width.value) ? data.width.value : (data.width && data.width.auto) ? (cmpStyle.width !== 'auto' ? boundingRect.width + 'px' : undefined) : undefined)
                }
            }), '*');
        })();
    }

    /**
     * Obfuscate a plaintext string with a simple rotation algorithm similar to the rot13 cipher.
     * @param  {String} str incoming string
     * @param  {Number} key rotation index between 0 and n
     * @param  {Number} n   maximum char that will be affected by the algorithm
     * @return {String}     obfuscated string
    */
    function obfuscate(str, key, n) {
        if (n === undefined) {
            n = 126;
        }
        if (!(typeof key === 'number' && key % 1 === 0) || !(typeof key === 'number' && key % 1 === 0)) {
            return str;
        }
        var chars = str.split('');
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i].charCodeAt(0);
            if (c <= n) {
                chars[i] = String.fromCharCode((chars[i].charCodeAt(0) + key) % n);
            }
        }
        return chars.join('');
    }

    function deobfuscate(str, key, n) {
        if (n === undefined) {
            n = 126;
        }
        // return String itself if the given parameters are invalid
        if (!(typeof key === 'number' && key % 1 === 0) || !(typeof key === 'number' && key % 1 === 0)) {
            return str;
        }
        return obfuscate(str, n - key);
    }

    function extractHostname(url) {
        var hostname;
        if (url.indexOf('//') > -1) {
            hostname = url.split('/')[2];
        }
        else {
            hostname = url.split('/')[0];
        }
        hostname = hostname.split(':')[0];
        hostname = hostname.split('?')[0];
        return hostname;
    }

    function areDatesEqual(date1, date2) {
        try {
            date1 = new Date(parseInt(date1));
            date2 = new Date(parseInt(date2));
            var result = (
                date1.getFullYear() === date2.getFullYear() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getDate() === date2.getDate()
            );
            return result;
        } catch (e) {
            console.error('Unable to parse date: ', date1, ' or ', date2);
        }
        return false;
    }

    function fixTimestamp(timestamp) {
        if (typeof timestamp === 'string') {
            return timestamp.length === 10 ? timestamp + '000' : timestamp;
        } else if (typeof timestamp === 'number') {
            return timestamp < 9999999999 ? timestamp * 1000 : timestamp;
        }
        return timestamp;
    }

    return {
        includes: includes,
        isUndefined: isUndefined,
        isDefined: isDefined,
        isObject: isObject,
        isString: isString,
        isNumber: isNumber,
        isJsonString: isJsonString,
        forEach: forEach,
        merge: merge,
        startsWith: startsWith,
        endsWith: endsWith,
        stringIsTrue: stringIsTrue,
        stringIsFalse: stringIsFalse,
        isServiceAvailable: isServiceAvailable,
        isServiceNotAvailable: isServiceNotAvailable,
        isEWTExceedThreshold: isEWTExceedThreshold,
        validateDate: validateDate,
        validateEmail: validateEmail,
        validatePhoneNumber: validatePhoneNumber,
        isIE: isIE,
        isSafari: isSafari,
        getIncomingEventStatus: getIncomingEventStatus,
        saveLastEventTimestamp: saveLastEventTimestamp,
        getPassedTimeText: getPassedTimeText,
        updateParentDimensions: updateParentDimensions,
        obfuscate: obfuscate,
        deobfuscate: deobfuscate,
        extractHostname: extractHostname,
        areDatesEqual: areDatesEqual,
        fixTimestamp: fixTimestamp
    };
})();
