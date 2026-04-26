var snippetDraggable = function () {
    var selected = null,
        x_pos = 0, y_pos = 0,
        x_elem = 0, y_elem = 0;

    function _drag_init(elem, handler) {
        selected = elem;
        x_elem = x_pos - selected.offsetLeft;
        y_elem = y_pos - selected.offsetTop;
    }

    function _move_elem(e) {
        x_pos = document.all ? window.event.clientX : e.pageX;
        y_pos = document.all ? window.event.clientY : e.pageY;
        w = window.innerWidth;
        h = window.innerHeight;
        if (selected !== null) {
            ew = selected.offsetWidth;
            eh = handler.offsetHeight;
            var eLeft = x_pos - x_elem,
                eTop = y_pos - y_elem,
                leftBorder = 1,
                topBorder = 1,
                bottomBorder = h - eh,
                rightBorder = w - ew;

            eTop = (eTop > bottomBorder) ? bottomBorder : eTop;
            eTop = (eTop < topBorder) ? topBorder: eTop;
            eLeft = (eLeft > rightBorder) ? rightBorder : eLeft;
            eLeft = (eLeft < leftBorder) ? leftBorder : eLeft;

            eLeft = eLeft + 'px';
            eTop = eTop + 'px';

            selected.style.left = eLeft;
            selected.style.top = eTop;
            sessionStorage.setItem('chatLeft', eLeft);
            sessionStorage.setItem('chatTop', eTop);
        }
    }

    function _destroy() {
        selected = null;
    }

    var target = document.querySelector('[data-draggable]');
    var handler = document.getElementById(target.getAttribute('data-draggable'));

    handler.onmousedown = function () {
        _drag_init(target, handler);
        return false;
    };

    document.onmousemove = _move_elem;
    document.onmouseup = _destroy;
};
