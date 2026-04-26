var bpWidgetConfig = (function () {
    function readEnhancementsConfig() {
        var config = window.SERVICE_PATTERN_CHAT_CONFIG || {};
        var enhancements = config.enhancements || {};

        return {
            enabled: enhancements.enabled !== false,
            blur: {
                enabled: enhancements.blurEnabled !== false,
                segmentationModelSelection: enhancements.segmentationModelSelection || 1,
                selfieSegmentationUrl: enhancements.selfieSegmentationUrl || 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js',
                blurStrength: enhancements.blurStrength || 14,
                fps: enhancements.blurFps || 24,
                virtualBackgroundUrl: enhancements.virtualBackgroundUrl || ''
            },
            screenShare: {
                preferBrightPatternCobrowse: enhancements.preferBrightPatternCobrowse !== false,
                fallbackToDisplayMedia: enhancements.fallbackToDisplayMedia !== false,
                displayMediaConstraints: enhancements.displayMediaConstraints || {
                    video: { frameRate: 24 },
                    audio: false
                }
            },
            identity: {
                enabled: enhancements.identityVerificationEnabled === true,
                endpoint: enhancements.identityVerificationEndpoint || '',
                method: enhancements.identityVerificationMethod || 'POST',
                timeoutMs: enhancements.identityVerificationTimeoutMs || 15000,
                verifyOncePerTab: enhancements.verifyOncePerTab !== false,
                provider: enhancements.identityProvider || 'custom',
                requestPayload: enhancements.identityRequestPayload || {}
            },
            ui: {
                overlayEnabled: enhancements.overlayControlsEnabled !== false,
                showSwitchCamera: enhancements.showSwitchCamera !== false
            },
            debug: enhancements.debug === true
        };
    }

    return {
        read: readEnhancementsConfig
    };
})();
