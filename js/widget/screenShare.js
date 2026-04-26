var bpScreenShare = (function () {
    function ScreenShare(config, logger) {
        this.config = config || {};
        this.logger = logger || function () {};
        this.webRtcApi = null;
        this.isSharing = false;
        this.screenTrack = null;
        this.originalVideoTrack = null;
        this.cachedCameraStream = null;
        this.currentDeviceIndex = 0;
    }

    ScreenShare.prototype.setWebRtcApi = function (webRtcApi) {
        this.webRtcApi = webRtcApi || null;
    };

    ScreenShare.prototype.start = function () {
        var self = this;

        if (this.isSharing) {
            return Promise.resolve(true);
        }

        if (this.config.preferBrightPatternCobrowse) {
            window.parent.postMessage('bp-start-cobrowsing', '*');
            return Promise.resolve(true);
        }

        if (!this.config.fallbackToDisplayMedia || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            return Promise.reject(new Error('Screen sharing is not available in this browser'));
        }

        return navigator.mediaDevices.getDisplayMedia(this.config.displayMediaConstraints || { video: true, audio: false })
            .then(function (displayStream) {
                var track = displayStream.getVideoTracks()[0];
                if (!track) {
                    throw new Error('Display media track is not available');
                }

                self.screenTrack = track;
                self.isSharing = true;

                if (self.webRtcApi && self.webRtcApi.getLocalStream) {
                    var localStream = self.webRtcApi.getLocalStream();
                    if (localStream && localStream.getVideoTracks().length > 0) {
                        self.originalVideoTrack = localStream.getVideoTracks()[0];
                    }
                }

                if (self.webRtcApi && self.webRtcApi.replaceOutgoingVideoTrack) {
                    self.webRtcApi.replaceOutgoingVideoTrack(track);
                }

                if (self.webRtcApi && self.webRtcApi.setLocalPreviewStream) {
                    self.webRtcApi.setLocalPreviewStream(new MediaStream([track]));
                }

                track.onended = function () {
                    self.stop();
                };

                return true;
            });
    };

    ScreenShare.prototype.stop = function () {
        if (this.config.preferBrightPatternCobrowse) {
            window.parent.postMessage('bp-stop-cobrowsing', '*');
            return Promise.resolve(true);
        }

        if (this.screenTrack) {
            this.screenTrack.stop();
            this.screenTrack = null;
        }

        this.isSharing = false;

        if (this.originalVideoTrack && this.webRtcApi && this.webRtcApi.replaceOutgoingVideoTrack) {
            this.webRtcApi.replaceOutgoingVideoTrack(this.originalVideoTrack);

            if (this.webRtcApi.setLocalPreviewStream) {
                this.webRtcApi.setLocalPreviewStream(new MediaStream([this.originalVideoTrack]));
            }
        }

        return Promise.resolve(true);
    };

    ScreenShare.prototype.switchCamera = function () {
        var self = this;

        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return Promise.reject(new Error('Camera enumeration is not supported'));
        }

        return navigator.mediaDevices.enumerateDevices().then(function (devices) {
            var videoInputs = devices.filter(function (device) {
                return device.kind === 'videoinput';
            });

            if (videoInputs.length < 2) {
                throw new Error('No alternative camera is available');
            }

            self.currentDeviceIndex = (self.currentDeviceIndex + 1) % videoInputs.length;
            var selected = videoInputs[self.currentDeviceIndex];

            return navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { deviceId: { exact: selected.deviceId } }
            }).then(function (stream) {
                var track = stream.getVideoTracks()[0];
                if (!track) {
                    throw new Error('Selected camera has no video track');
                }

                self.cachedCameraStream = stream;
                self.originalVideoTrack = track;

                if (self.webRtcApi && self.webRtcApi.replaceOutgoingVideoTrack) {
                    self.webRtcApi.replaceOutgoingVideoTrack(track);
                }

                if (self.webRtcApi && self.webRtcApi.setLocalPreviewStream) {
                    self.webRtcApi.setLocalPreviewStream(stream);
                }

                return true;
            });
        });
    };

    return {
        create: function (config, logger) {
            return new ScreenShare(config, logger);
        }
    };
})();
