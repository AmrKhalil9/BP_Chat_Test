var snippetHelperFunctions = function () {
    return {

        hasClass: function(el, className) {
            if (el.classList)
                return el.classList.contains(className)
            else
                return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
        },

        addClass: function(el, className) {
            if (el.classList)
                el.classList.add(className)
            else if (!hasClass(el, className)) el.className += " " + className
        },

        removeClass: function(el, className) {
            if (el.classList)
                el.classList.remove(className)
            else if (hasClass(el, className)) {
                var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
                el.className = el.className.replace(reg, ' ')
            }
        },

        getRealDisplay: function(elem) {
            if (elem.currentStyle) {
                return elem.currentStyle.display
            } else if (window.getComputedStyle) {
                var computedStyle = window.getComputedStyle(elem, null)
                return computedStyle.getPropertyValue('display')
            }
        },

        hide: function(el) {
            if (!el.getAttribute('displayOld')) {
                el.setAttribute("displayOld", el.style.display)
            }
            el.style.display = "none"
        },

        isHidden: function(el) {
            var width = el.offsetWidth,
                height = el.offsetHeight,
                tr = el.nodeName.toLowerCase() === "tr"
            return width === 0 && height === 0 && !tr ?
                true : width > 0 && height > 0 && !tr ? false : this.getRealDisplay(el)
        },

        toggle: function(el) {
            this.isHidden(el) ? this.show(el) : this.hide(el)
        },

        show: function(el) {
            var displayCache = {}
            if (this.getRealDisplay(el) != 'none') return
            var old = el.getAttribute("displayOld");
            el.style.display = old || "";
            if (this.getRealDisplay(el) === "none") {
                var nodeName = el.nodeName,
                    body = document.body,
                    display
                if (displayCache[nodeName]) {
                    display = displayCache[nodeName]
                } else {
                    var testElem = document.createElement(nodeName)
                    body.appendChild(testElem)
                    display = this.getRealDisplay(testElem)
                    if (display === "none") {
                        display = "block"
                    }
                    body.removeChild(testElem)
                    displayCache[nodeName] = display
                }
                el.setAttribute('displayOld', display)
                el.style.display = display
            }
        },

    }
};
