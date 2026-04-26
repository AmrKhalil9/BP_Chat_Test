var bpVideoEnhancer = (function () {
    function Enhancer(config, logger) {
        this.config = config || {};
        this.logger = logger || function () {};

        this.sourceVideo = null;
        this.sourceStream = null;
        this.outputCanvas = null;
        this.outputCtx = null;
        this.blurCanvas = null;
        this.blurCtx = null;
        this.outputStream = null;
        this.segmentation = null;
        this.running = false;
        this.framePending = false;
        this.animationFrame = null;
        this.backgroundImage = null;
        this.mode = 'blur';
        this.activeProfile = null;
        this.lastSegmentationTs = 0;
    }

    Enhancer.prototype.log = function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[BP-Enhancer]');
        this.logger.apply(null, args);
    };

    Enhancer.prototype.ensureSourceVideo = function () {
        if (!this.sourceVideo) {
            var video = document.createElement('video');
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.style.display = 'none';
            document.body.appendChild(video);
            this.sourceVideo = video;
        }
        return this.sourceVideo;
    };

    Enhancer.prototype.setSourceStream = function (stream) {
        if (!stream) {
            return;
        }

        this.sourceStream = stream;
        var sourceVideo = this.ensureSourceVideo();

        try {
            sourceVideo.srcObject = stream;
        } catch (error) {
            sourceVideo.src = URL.createObjectURL(stream);
        }

        sourceVideo.play().catch(function () {});
    };

    Enhancer.prototype.selectAdaptiveProfile = function () {
        var memory = navigator.deviceMemory || 4;
        var cores = navigator.hardwareConcurrency || 4;
        var lowPower = memory <= 2 || cores <= 2;
        var midPower = memory <= 4 || cores <= 4;

        var profile = {
            fps: this.config.fps || 24,
            blurStrength: this.config.blurStrength || 14,
            segmentationScale: 1
        };

        if (lowPower) {
            profile.fps = Math.min(profile.fps, 12);
            profile.blurStrength = Math.min(profile.blurStrength, 8);
            profile.segmentationScale = 0.75;
        } else if (midPower) {
            profile.fps = Math.min(profile.fps, 18);
            profile.blurStrength = Math.min(profile.blurStrength, 12);
            profile.segmentationScale = 0.85;
        }

        this.activeProfile = profile;
        this.config.fps = profile.fps;
        this.config.blurStrength = profile.blurStrength;
    };

    Enhancer.prototype.ensureMediaPipe = function () {
        var self = this;

        if (window.SelfieSegmentation) {
            return Promise.resolve(window.SelfieSegmentation);
        }

        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-bp-selfie-segmentation]');
            if (existing) {
                existing.addEventListener('load', function () {
                    if (window.SelfieSegmentation) {
                        resolve(window.SelfieSegmentation);
                    } else {
                        reject(new Error('SelfieSegmentation script loaded without global export'));
                    }
                });
                existing.addEventListener('error', function () {
                    reject(new Error('Unable to load SelfieSegmentation script'));
                });
                return;
            }

            var script = document.createElement('script');
            script.src = self.config.selfieSegmentationUrl;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-bp-selfie-segmentation', 'true');
            script.onload = function () {
                if (window.SelfieSegmentation) {
                    resolve(window.SelfieSegmentation);
                } else {
                    reject(new Error('SelfieSegmentation script loaded without global export'));
                }
            };
            script.onerror = function () {
                reject(new Error('Unable to load SelfieSegmentation script'));
            };
            document.head.appendChild(script);
        });
    };

    Enhancer.prototype.ensureSegmentation = function () {
        var self = this;

        if (this.segmentation) {
            return Promise.resolve(this.segmentation);
        }

        return this.ensureMediaPipe().then(function (SelfieSegmentation) {
            var segmentation = new SelfieSegmentation({
                locateFile: function (file) {
                    var base = self.config.selfieSegmentationUrl;
                    return base.substring(0, base.lastIndexOf('/') + 1) + file;
                }
            });

            segmentation.setOptions({
                modelSelection: self.config.segmentationModelSelection || 1
            });

            segmentation.onResults(function (results) {
                self.onSegmentationResults(results);
            });

            self.segmentation = segmentation;
            return segmentation;
        });
    };

    Enhancer.prototype.prepareCanvases = function () {
        var sourceVideo = this.ensureSourceVideo();
        var width = sourceVideo.videoWidth || 640;
        var height = sourceVideo.videoHeight || 480;

        if (!this.outputCanvas) {
            this.outputCanvas = document.createElement('canvas');
            this.outputCanvas.style.display = 'none';
            document.body.appendChild(this.outputCanvas);
        }
        if (!this.blurCanvas) {
            this.blurCanvas = document.createElement('canvas');
            this.blurCanvas.style.display = 'none';
            document.body.appendChild(this.blurCanvas);
        }

        this.outputCanvas.width = width;
        this.outputCanvas.height = height;
        this.blurCanvas.width = width;
        this.blurCanvas.height = height;

        if (this.activeProfile && this.activeProfile.segmentationScale < 1) {
            this.blurCanvas.width = Math.max(320, Math.floor(width * this.activeProfile.segmentationScale));
            this.blurCanvas.height = Math.max(180, Math.floor(height * this.activeProfile.segmentationScale));
        }

        this.outputCtx = this.outputCanvas.getContext('2d');
        this.blurCtx = this.blurCanvas.getContext('2d');
    };

    Enhancer.prototype.onSegmentationResults = function (results) {
        if (!this.running || !this.outputCtx || !this.blurCtx) {
            return;
        }

        var width = this.outputCanvas.width;
        var height = this.outputCanvas.height;

        this.blurCtx.save();
        this.blurCtx.clearRect(0, 0, width, height);

        if (this.mode === 'image' && this.backgroundImage) {
            this.blurCtx.filter = 'none';
            this.blurCtx.drawImage(this.backgroundImage, 0, 0, width, height);
        } else {
            this.blurCtx.filter = 'blur(' + (this.config.blurStrength || 14) + 'px)';
            this.blurCtx.drawImage(results.image, 0, 0, width, height);
        }

        this.blurCtx.restore();

        this.outputCtx.save();
        this.outputCtx.clearRect(0, 0, width, height);

        this.outputCtx.drawImage(results.segmentationMask, 0, 0, width, height);
        this.outputCtx.globalCompositeOperation = 'source-out';
        this.outputCtx.drawImage(this.blurCanvas, 0, 0, width, height);
        this.outputCtx.globalCompositeOperation = 'destination-atop';
        this.outputCtx.drawImage(results.image, 0, 0, width, height);
        this.outputCtx.restore();
    };

    Enhancer.prototype.setVirtualBackground = function (imageUrl) {
        var self = this;

        if (!imageUrl) {
            this.mode = 'blur';
            this.backgroundImage = null;
            return Promise.resolve();
        }

        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                self.backgroundImage = img;
                self.mode = 'image';
                resolve();
            };
            img.onerror = function () {
                reject(new Error('Unable to load virtual background image'));
            };
            img.src = imageUrl;
        });
    };

    Enhancer.prototype.renderLoop = function () {
        var self = this;
        if (!this.running || !this.segmentation || !this.sourceVideo) {
            return;
        }

        var now = Date.now();
        var minFrameGap = Math.max(1, Math.floor(1000 / (this.config.fps || 24)));

        if (!this.framePending && this.sourceVideo.readyState >= 2 && (now - this.lastSegmentationTs >= minFrameGap)) {
            this.framePending = true;
            this.lastSegmentationTs = now;
            this.segmentation.send({ image: this.sourceVideo }).then(function () {
                self.framePending = false;
            }).catch(function () {
                self.framePending = false;
            });
        }

        this.animationFrame = window.requestAnimationFrame(function () {
            self.renderLoop();
        });
    };

    Enhancer.prototype.enable = function () {
        var self = this;

        if (this.running && this.outputStream) {
            return Promise.resolve(this.outputStream);
        }

        if (!this.sourceStream || this.sourceStream.getVideoTracks().length === 0) {
            return Promise.reject(new Error('Local stream is not available for enhancement'));
        }

        this.selectAdaptiveProfile();

        return this.ensureSegmentation().then(function () {
            self.prepareCanvases();

            if (self.config.virtualBackgroundUrl) {
                return self.setVirtualBackground(self.config.virtualBackgroundUrl).catch(function () {
                    self.mode = 'blur';
                });
            }
        }).then(function () {
            self.running = true;
            self.renderLoop();

            self.outputStream = self.outputCanvas.captureStream(self.config.fps || 24);
            return self.outputStream;
        });
    };

    Enhancer.prototype.disable = function () {
        this.running = false;

        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.outputStream) {
            this.outputStream.getTracks().forEach(function (track) {
                track.stop();
            });
            this.outputStream = null;
        }
    };

    return {
        create: function (config, logger) {
            return new Enhancer(config, logger);
        }
    };
})();
