var bpUiControls = (function () {
    function Controls(config, logger) {
        this.config = config || {};
        this.logger = logger || function () {};
        this.root = null;
        this.handlers = {};
    }

    Controls.prototype.mount = function () {
        if (this.root || this.config.overlayEnabled === false) {
            return;
        }

        var target = document.getElementById('videoWrapper') || document.getElementById('chat-body');
        if (!target) {
            return;
        }

        var root = document.createElement('div');
        root.className = 'bp-enhancer-controls';
        root.innerHTML = [
            '<button type="button" class="bp-enhancer-btn" data-action="blur" title="Toggle blur">Blur</button>',
            '<button type="button" class="bp-enhancer-btn" data-action="screen" title="Toggle screen share">Screen</button>',
            this.config.showSwitchCamera === false ? '' : '<button type="button" class="bp-enhancer-btn" data-action="camera" title="Switch camera">Camera</button>',
            '<button type="button" class="bp-enhancer-btn danger" data-action="end" title="End call">End</button>'
        ].join('');

        target.appendChild(root);
        this.root = root;

        this.bindEvents();
    };

    Controls.prototype.bindEvents = function () {
        var self = this;
        if (!this.root) {
            return;
        }

        this.root.addEventListener('click', function (event) {
            var button = event.target.closest('.bp-enhancer-btn');
            if (!button) {
                return;
            }

            var action = button.getAttribute('data-action');
            var handler = self.handlers[action];
            if (handler) {
                handler(button);
            }
        });
    };

    Controls.prototype.on = function (action, handler) {
        this.handlers[action] = handler;
    };

    Controls.prototype.setActive = function (action, active) {
        if (!this.root) {
            return;
        }

        var button = this.root.querySelector('[data-action="' + action + '"]');
        if (!button) {
            return;
        }

        if (active) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    };

    return {
        create: function (config, logger) {
            return new Controls(config, logger);
        }
    };
})();
