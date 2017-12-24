const analysers = [];

let gainNode;
let getUserMedia;

const $monitorAudio = document.querySelector('#monitor-audio');

$monitorAudio.addEventListener('change', () => {
    if (gainNode !== undefined) {
        gainNode.gain.value = ($monitorAudio.checked) ? 1 : 0;
    }
});

function displayLevels () {
    const fftSize = analysers[0].fftSize;
    const dataArray = new Float32Array(fftSize);
    const length = analysers.length;
    const levels = [];

    for (let i = 0; i < length; i += 1) {
        const analyser = analysers[i];

        let level = 0;

        analyser.getFloatTimeDomainData(dataArray);

        for (let j = 0; j < fftSize; j += 1) {
            level += Math.pow(dataArray[j], 2);
        }

        level = Math.sqrt(level / fftSize);

        levels.push(`<li style="height: ${ Math.round(level * 100) }%"></li>`);

    }

    const $ul = document.body.querySelector('ul');

    if ($ul === null) {
        document.body.querySelector('form').insertAdjacentHTML('afterend', `<ul>${ levels.join('') }</ul>`);
    } else {
        $ul.innerHTML = levels.join('');
    }

    requestAnimationFrame(displayLevels);
}

function errorCallback () {
    document.body.innerHTML = '<p>Please allow the site to access your audio input. Refresh the page to get asked again.</p>';
}

function successCallback (mediaStream) {
    const audioContext = new AudioContext();
    const input = audioContext.createMediaStreamSource(mediaStream);
    const channelCount = input.channelCount;
    const splitter = audioContext.createChannelSplitter(channelCount);
    const merger = audioContext.createChannelMerger(channelCount);

    gainNode = audioContext.createGain();

    gainNode.gain.value = ($monitorAudio.checked) ? 1 : 0;

    input.connect(splitter);

    for (let i = 0; i < channelCount; i += 1) {
        const analyser = audioContext.createAnalyser();

        splitter.connect(analyser, i);
        analyser.connect(merger, 0, i);

        analysers.push(analyser);
    }

    merger.connect(gainNode);
    gainNode.connect(audioContext.destination);

    requestAnimationFrame(displayLevels);
}

if (!('navigator' in window) ||
        (!('mozGetUserMedia' in window.navigator || 'webkitGetUserMedia' in window.navigator))) {

    document.body.innerHTML = '<p>Your browser does not support GetUserMedia. :-(</p>';

} else {

    if ('mediaDevices' in navigator) {
        navigator.mediaDevices
            .getUserMedia({
                audio: true
            })
            .then(successCallback)
            .catch(errorCallback);
    } else {
        getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
        getUserMedia = getUserMedia.bind(navigator);

        getUserMedia({
            audio: true
        }, successCallback, errorCallback);
    }

}
