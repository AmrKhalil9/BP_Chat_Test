var snippetCheckDeviceSupport = function () {
    navigator.enumerateDevices = (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) ? function(cb) {navigator.mediaDevices.enumerateDevices().then(cb)} : navigator.enumerateDevices;

    var f = (typeof MediaStreamTrack !== 'undefined' && 'getSources' in MediaStreamTrack) ? true : (navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices) ? true : false;

    var handleErrors = function(cam, mic) {
        if(!cam){ $('#call-prompt .error.camera').show() } else { $('#call-prompt .error.camera').hide() }
        if(!mic){ $('#call-prompt .error.microphone').show() } else { $('#call-prompt .error.microphone').hide() }
        return;
    }

    var dev = new Array(), mic = false, micFlag = false, speaker = false, speakerFlag = false, cam = false, camFlag = false;

    if (!f) { return }

    if (!navigator.enumerateDevices) {
        handleErrors (cam, mic);
    } else {
        navigator.enumerateDevices = (!navigator.enumerateDevices && window.MediaStreamTrack && window.MediaStreamTrack.getSources) ?
            navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(window.MediaStreamTrack) :
            (!navigator.enumerateDevices && navigator.enumerateDevices) ?
                navigator.enumerateDevices = navigator.enumerateDevices.bind(navigator) :
                navigator.enumerateDevices;
    }

    navigator.enumerateDevices(function(elements) {
        elements.forEach(function(props) {

            dev.forEach(function(d) {
                if (d.id === props.id && d.kind === props.kind) { return }
            });

            props.deviceId = (!props.deviceId) ? props.id : props.deviceId;
            props.id = (!props.id) ? props.deviceId : props.id;

            switch (props.kind) {
                case 'audio':
                    props.kind = 'audioinput';
                case 'video':
                    props.kind = 'videoinput';
                case 'videoinput':
                    cam = true;
                    camFlag = (!camFlag) ? true : false;
                    break;
                case 'audioinput':
                    mic = true;
                    micFlag = (!micFlag) ? true : false;
                    break;
                case 'audiooutput':
                    speaker = true;
                    break;
            }

            dev.push(props);
        });

        handleErrors(cam, mic);
    });
};
