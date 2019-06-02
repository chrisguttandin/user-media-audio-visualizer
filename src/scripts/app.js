import { AudioContext } from 'standardized-audio-context';

const analysers = [];
const audioContext = new AudioContext();
const audioNodes = [];

let audioTrack;
let constraints;
let gainNode;

const $autoGainControl = document.getElementById('auto-gain-control');
const $enableAudio = document.getElementById('enable-audio');
const $echoCancellation = document.getElementById('echo-cancellation');
const $monitorAudio = document.getElementById('monitor-audio');
const $noiseSuppression = document.getElementById('noise-suppression');

$autoGainControl.addEventListener('change', () => {
    if (audioTrack !== undefined) {
        audioTrack
            .applyConstraints({
                autoGainControl: $autoGainControl.checked
            })
            .then(() => {
                const settings = audioTrack.getSettings();

                // @todo Circumvent Chrome's disability to change the constraints of an audio track.
                if (settings.autoGainControl !== undefined && settings.autoGainControl !== $autoGainControl.checked) {
                    constraints.audio.autoGainControl = $autoGainControl.checked;

                    return getUserMedia();
                }
            })
            .finally(() => {
                const settings = audioTrack.getSettings();

                if (settings.autoGainControl !== undefined) {
                    $autoGainControl.checked = settings.autoGainControl;
                }
            });
    }
});

if (audioContext.state === 'suspended') {
    $enableAudio.addEventListener('click', () => {
        audioContext.resume();
    });

    audioContext.onstatechange = () => {
        if (audioContext.state !== 'suspended') {
            $enableAudio.style.display = 'none';
        }
    };

    $enableAudio.style.display = 'block';
}

$echoCancellation.addEventListener('change', () => {
    if (audioTrack !== undefined) {
        audioTrack
            .applyConstraints({
                echoCancellation: $echoCancellation.checked
            })
            .then(() => {
                const settings = audioTrack.getSettings();

                // @todo Circumvent Chrome's disability to change the constraints of an audio track.
                if (settings.echoCancellation !== undefined && settings.echoCancellation !== $echoCancellation.checked) {
                    constraints.audio.echoCancellation = $echoCancellation.checked;

                    return getUserMedia();
                }
            })
            .finally(() => {
                const settings = audioTrack.getSettings();

                if (settings.echoCancellation !== undefined) {
                    $echoCancellation.checked = settings.echoCancellation;
                }
            });
    }
});

$monitorAudio.addEventListener('change', () => {
    if (gainNode !== undefined) {
        gainNode.gain.value = ($monitorAudio.checked) ? 1 : 0;
    }
});

$noiseSuppression.addEventListener('change', () => {
    if (audioTrack !== undefined) {
        audioTrack
            .applyConstraints({
                noiseSuppression: $noiseSuppression.checked
            })
            .then(() => {
                const settings = audioTrack.getSettings();

                // @todo Circumvent Chrome's disability to change the constraints of an audio track.
                if (settings.noiseSuppression !== undefined && settings.noiseSuppression !== $noiseSuppression.checked) {
                    constraints.audio.noiseSuppression = $noiseSuppression.checked;

                    return getUserMedia();
                }
            })
            .finally(() => {
                const settings = audioTrack.getSettings();

                if (settings.noiseSuppression !== undefined) {
                    $noiseSuppression.checked = settings.noiseSuppression;
                }
            });
    }
});

function displayLevels () {
    if (analysers.length > 0) {
        const fftSize = analysers[0].fftSize;
        const dataArray = new Float32Array(fftSize);
        const length = analysers.length;
        const levels = [];

        for (let i = 0; i < length; i += 1) {
            const analyser = analysers[i];

            let level = 0;

            analyser.getFloatTimeDomainData(dataArray);

            for (let j = 0; j < fftSize; j += 1) {
                level += dataArray[j] ** 2;
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
    }

    requestAnimationFrame(displayLevels);
}

requestAnimationFrame(displayLevels);

function errorCallback () {
    document.body.innerHTML = '<p>Please allow the site to access your audio input. Refresh the page to get asked again.</p>';
}

function successCallback (mediaStream) {
    if (audioTrack !== undefined) {
        audioTrack.stop();
    }

    for (const analyser of analysers) {
        analyser.disconnect();
    }

    analysers.length = 0;

    for (const audioNode of audioNodes) {
        audioNode.disconnect();
    }

    audioNodes.length = 0;

    audioTrack = mediaStream.getAudioTracks()[0];

    const settings = audioTrack.getSettings();

    if (settings.autoGainControl === undefined) {
        $autoGainControl.disabled = true;
    }

    if (settings.echoCancellation === undefined) {
        $echoCancellation.disabled = true;
    }

    if (settings.noiseSuppression === undefined) {
        $noiseSuppression.disabled = true;
    }

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

    audioNodes.push(input, splitter, merger);
}

function getUserMedia () {
    constraints = {
        audio: {
            autoGainControl: $autoGainControl.checked,
            echoCancellation: $echoCancellation.checked,
            noiseSuppression: $noiseSuppression.checked
        }
    };

    return navigator.mediaDevices
        .getUserMedia(constraints)
        .then(successCallback)
        .catch(errorCallback);
}

if ('navigator' in window && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    getUserMedia();
} else {
    document.body.innerHTML = '<p>Your browser does not support GetUserMedia. :-(</p>';
}
