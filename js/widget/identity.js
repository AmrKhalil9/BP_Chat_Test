var bpWidgetIdentity = (function () {
    var verificationCacheKey = 'bp-identity-verified';

    function withTimeout(promise, timeoutMs) {
        return new Promise(function (resolve, reject) {
            var timer = window.setTimeout(function () {
                reject(new Error('Identity verification timeout'));
            }, timeoutMs);

            promise.then(function (result) {
                window.clearTimeout(timer);
                resolve(result);
            }).catch(function (error) {
                window.clearTimeout(timer);
                reject(error);
            });
        });
    }

    function getVerificationState() {
        return sessionStorage.getItem(verificationCacheKey) === 'true';
    }

    function setVerificationState(value) {
        sessionStorage.setItem(verificationCacheKey, value ? 'true' : 'false');
    }

    function verifyUser(identityConfig) {
        if (!identityConfig || !identityConfig.enabled) {
            return Promise.resolve({ allowed: true, reason: 'identity-disabled' });
        }

        if (!identityConfig.endpoint) {
            return Promise.resolve({ allowed: false, reason: 'identity-endpoint-missing' });
        }

        if (identityConfig.verifyOncePerTab && getVerificationState()) {
            return Promise.resolve({ allowed: true, reason: 'already-verified' });
        }

        var payload = {
            provider: identityConfig.provider,
            timestamp: Date.now(),
            context: {
                tenantUrl: (window.SERVICE_PATTERN_CHAT_CONFIG || {}).tenantUrl || '',
                clientId: (window.SERVICE_PATTERN_CHAT_CONFIG || {}).clientId || 'WebChat',
                userAgent: window.navigator.userAgent
            },
            data: identityConfig.requestPayload || {}
        };

        var request = fetch(identityConfig.endpoint, {
            method: identityConfig.method || 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Identity verification failed: ' + response.status);
            }
            return response.json();
        }).then(function (result) {
            var allowed = !!(result && (result.verified === true || result.allowed === true));
            if (allowed && identityConfig.verifyOncePerTab) {
                setVerificationState(true);
            }
            return {
                allowed: allowed,
                reason: allowed ? 'verified' : 'rejected',
                response: result
            };
        });

        return withTimeout(request, identityConfig.timeoutMs || 15000);
    }

    return {
        verifyUser: verifyUser,
        getVerificationState: getVerificationState,
        setVerificationState: setVerificationState
    };
})();
