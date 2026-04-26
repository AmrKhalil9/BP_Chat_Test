var loadWebRtcIceServers = function (cp, o) {
    var iceServersEndpoint = '/iceservers'
        + '?tenantUrl=' + encodeURIComponent(cp.tenantUrl)
        + '&domain=' + encodeURIComponent(window.location.host)
        + '&appId=' + encodeURIComponent(cp.appId)
        + '&sessionId=' + encodeURIComponent(o.sessionId);

    function base64ToUint8Array(base64) {
        var binaryString = atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    function decryptAesGcmWithPbkdf2(sessionId, encryptedData) {
        var encryptedByteArray = base64ToUint8Array(encryptedData);
        var salt = encryptedByteArray.slice(0, 16);
        var iv =  encryptedByteArray.slice(16, 28);
        var ciphertext = encryptedByteArray.slice(28);

        // 1. Derive the AES-GCM Key
        return crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(sessionId),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        ).then(function (passwordKey) {
            return crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt:  salt, // salt should be an ArrayBuffer
                    iterations: 65536,
                    hash: "SHA-256"
                },
                passwordKey,
                { name: "AES-GCM", length: 256 },
                false,
                ["decrypt"]
            );
        }).then(function (aesGcmKey) {
            return crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv, // iv should be an ArrayBuffer
                },
                aesGcmKey,
                ciphertext // ciphertext should be an ArrayBuffer
            );
        }).then(function (decryptedBuffer) {
            return new TextDecoder().decode(decryptedBuffer);;
        }).catch(function (err) {
            console.error('Decryption error:', err);
        });
    }


    return chatApiSessionSendXhr(cp, iceServersEndpoint, "GET").pipe(function (response) {
        decryptAesGcmWithPbkdf2(o.sessionId, response).then(function (decryptedText) {
            var iceServersConfiguration = JSON.parse(decryptedText);
            sessionStorage.setItem('iceServersConfiguration', JSON.stringify(iceServersConfiguration));
        });
    });
};
