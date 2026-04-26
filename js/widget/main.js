var bpWidgetMain = (function () {
    var state = {
        config: null,
        enhancer: null,
        screenShare: null,
        controls: null,
        initialized: false,
        blurEnabled: false,
        verificationInProgress: false,
        localOriginalStream: null,
        webRtcApi: null,
        verificationModal: null
    };

    function log() {
        if (!state.config || !state.config.debug) {
            return;
        }
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[BP-Enhancer]');
        if (window.console && window.console.log) {
            window.console.log.apply(window.console, args);
        }
    }

    function ensureInitialized() {
        if (state.initialized) {
            return;
        }

        state.config = bpWidgetConfig.read();

        if (!state.config.enabled) {
            state.initialized = true;
            return;
        }

        state.enhancer = bpVideoEnhancer.create(state.config.blur, log);
        state.screenShare = bpScreenShare.create(state.config.screenShare, log);
        state.controls = bpUiControls.create(state.config.ui, log);

        state.controls.mount();
        bindControlActions();

        state.initialized = true;
        log('enhancer initialized');
    }

    function ensureVerificationModal() {
        if (state.verificationModal) {
            return state.verificationModal;
        }

        var modal = document.createElement('div');
        modal.className = 'bp-verify-modal';
        modal.innerHTML = [
            '<div class="bp-verify-modal__backdrop"></div>',
            '<div class="bp-verify-modal__dialog">',
            '<div class="bp-verify-modal__title">Identity verification required</div>',
            '<div class="bp-verify-modal__message"></div>',
            '<div class="bp-verify-modal__actions">',
            '<button type="button" class="bp-verify-modal__btn">OK</button>',
            '</div>',
            '</div>'
        ].join('');

        modal.querySelector('.bp-verify-modal__btn').addEventListener('click', function () {
            hideVerificationStatus();
        });

        document.body.appendChild(modal);
        state.verificationModal = modal;
        return modal;
    }

    function showVerificationStatus(message, type) {
        var modal = ensureVerificationModal();
        var messageEl = modal.querySelector('.bp-verify-modal__message');
        var dialog = modal.querySelector('.bp-verify-modal__dialog');

        messageEl.textContent = message || '';
        dialog.classList.remove('success');
        dialog.classList.remove('error');
        dialog.classList.add(type === 'success' ? 'success' : 'error');
        modal.classList.add('visible');
    }

    function hideVerificationStatus() {
        if (state.verificationModal) {
            state.verificationModal.classList.remove('visible');
        }
    }

    function bindControlActions() {
        if (!state.controls) {
            return;
        }

        state.controls.on('blur', function () {
            if (state.blurEnabled) {
                disableBlur();
            } else {
                enableBlur();
            }
        });

        state.controls.on('screen', function () {
            if (state.screenShare.isSharing) {
                state.screenShare.stop().then(function () {
                    state.controls.setActive('screen', false);
                });
            } else {
                state.screenShare.start().then(function () {
                    state.controls.setActive('screen', true);
                }).catch(function (error) {
                    log('screen share failed', error && error.message ? error.message : error);
                });
            }
        });

        state.controls.on('camera', function () {
            state.screenShare.switchCamera().catch(function (error) {
                log('switch camera failed', error && error.message ? error.message : error);
            });
        });

        state.controls.on('end', function () {
            if (state.webRtcApi && state.webRtcApi.closeConnection) {
                state.webRtcApi.closeConnection();
            }
        });
    }

    function setWebRtcApi(webRtcApi) {
        ensureInitialized();
        state.webRtcApi = webRtcApi || null;

        if (state.screenShare) {
            state.screenShare.setWebRtcApi(webRtcApi);
        }
    }

    function onLocalStream(stream, webRtcApi) {
        ensureInitialized();

        if (!state.config.enabled || !stream) {
            return;
        }

        if (!state.localOriginalStream) {
            state.localOriginalStream = stream;
        }

        setWebRtcApi(webRtcApi);

        if (state.enhancer) {
            state.enhancer.setSourceStream(stream);
        }
    }

    function onCallEnded() {
        if (!state.config || !state.config.enabled) {
            return;
        }

        disableBlur();

        if (state.screenShare && state.screenShare.isSharing) {
            state.screenShare.stop();
        }

        if (state.controls) {
            state.controls.setActive('screen', false);
            state.controls.setActive('blur', false);
        }

        state.localOriginalStream = null;
        state.webRtcApi = null;
    }

    function enableBlur() {
        if (!state.config.enabled || !state.config.blur.enabled || !state.enhancer || !state.webRtcApi) {
            return Promise.resolve(false);
        }

        return state.enhancer.enable().then(function (processedStream) {
            var processedTrack = processedStream.getVideoTracks()[0];
            if (!processedTrack) {
                throw new Error('Processed video track is unavailable');
            }

            state.webRtcApi.replaceOutgoingVideoTrack(processedTrack);
            state.webRtcApi.setLocalPreviewStream(processedStream);
            state.blurEnabled = true;

            if (state.controls) {
                state.controls.setActive('blur', true);
            }

            return true;
        }).catch(function (error) {
            log('enable blur failed', error && error.message ? error.message : error);
            return false;
        });
    }

    function disableBlur() {
        if (!state.enhancer) {
            return;
        }

        state.enhancer.disable();

        if (state.localOriginalStream && state.webRtcApi) {
            var originalTrack = state.localOriginalStream.getVideoTracks()[0];
            if (originalTrack) {
                state.webRtcApi.replaceOutgoingVideoTrack(originalTrack);
                state.webRtcApi.setLocalPreviewStream(state.localOriginalStream);
            }
        }

        state.blurEnabled = false;

        if (state.controls) {
            state.controls.setActive('blur', false);
        }
    }

    function shouldAllowSessionStart() {
        ensureInitialized();

        if (!state.config.enabled || !state.config.identity.enabled) {
            return Promise.resolve(true);
        }

        if (state.verificationInProgress) {
            return Promise.resolve(false);
        }

        state.verificationInProgress = true;
        hideVerificationStatus();
        return bpWidgetIdentity.verifyUser(state.config.identity)
            .then(function (result) {
                state.verificationInProgress = false;

                if (result && result.allowed) {
                    return true;
                }

                showVerificationStatus('We could not verify your identity. Please retry verification to start chat.', 'error');
                return false;
            })
            .catch(function () {
                state.verificationInProgress = false;
                showVerificationStatus('Identity verification failed due to a network or provider error.', 'error');
                return false;
            });
    }

    return {
        init: ensureInitialized,
        setWebRtcApi: setWebRtcApi,
        onLocalStream: onLocalStream,
        onCallEnded: onCallEnded,
        enableBlur: enableBlur,
        disableBlur: disableBlur,
        shouldAllowSessionStart: shouldAllowSessionStart,
        showVerificationStatus: showVerificationStatus,
        hideVerificationStatus: hideVerificationStatus
    };
})();
