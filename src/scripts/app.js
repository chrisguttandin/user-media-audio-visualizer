import { AnalyserNode, AudioContext, MediaStreamTrackAudioSourceNode } from 'standardized-audio-context';
import { mediaDevices } from 'subscribable-things';

const DISPLAY_HEIGHT = 400;
const FFT_SIZE = 2048;
const analysers = [];
const arrayBuffer = new ArrayBuffer(FFT_SIZE * Float32Array.BYTES_PER_ELEMENT);
const audioContext = new AudioContext();
const audioNodes = [];
const frequencyData = new Uint8Array(arrayBuffer);
const timeDomainData = new Float32Array(arrayBuffer);

let audioTrack;
let gainNode;
let renderType = 'time-domain';

const $autoGainControl = document.getElementById('auto-gain-control');
const $channelCount = document.getElementById('channel-count');
const $channelCountValue = document.getElementById('channel-count-value');
const $displayCanvas = document.getElementById('display-canvas');
const $enableAudio = document.getElementById('enable-audio');
const $echoCancellation = document.getElementById('echo-cancellation');
const $inputDevice = document.getElementById('input-device');
const $latency = document.getElementById('latency');
const $latencyValue = document.getElementById('latency-value');
const $monitorAudio = document.getElementById('monitor-audio');
const $noiseSuppression = document.getElementById('noise-suppression');
const $typeFrequencyDomainInput = document.getElementById('type-frequency-domain-input');
const $typeTimeDomainInput = document.getElementById('type-time-domain-input');

$displayCanvas.height = DISPLAY_HEIGHT;
$displayCanvas.width = 2048;

const displayContext = $displayCanvas.getContext('2d');

function applyDeviceIdConstraints() {
    audioTrack.stop();

    getUserMedia().finally(() => {
        const settings = audioTrack.getSettings();

        if (settings.deviceId !== undefined) {
            $inputDevice.querySelector(`[value="${settings.deviceId}"]`).selected = true;
        }
    });
}

mediaDevices()((mediaDeviceInfos) => {
    const audioInputDeviceInfos = mediaDeviceInfos
        .filter(({ deviceId, kind }) => deviceId !== '' && kind === 'audioinput')
        .concat([{ deviceId: 'no-selection', label: '' }]);
    const $options = Array.from($inputDevice.children);

    for (const { deviceId, label } of audioInputDeviceInfos) {
        const $existingOption = $inputDevice.querySelector(`[value="${deviceId}"]`);

        if ($existingOption === null) {
            const $newOption = document.createElement('option');

            $newOption.textContent = label === '' ? 'unknown input device' : label;
            $newOption.value = deviceId;

            $inputDevice.append($newOption);
        } else {
            if (label !== '' && $existingOption.textContent !== label) {
                $existingOption.textContent = label;
            }

            $options.splice($options.indexOf($existingOption), 1);
        }
    }

    $options.forEach(($option) => {
        if ($option.selected) {
            $inputDevice.querySelector('option').selected = true;

            if (audioTrack !== undefined) {
                applyDeviceIdConstraints();
            }
        }

        $option.remove();
    });
});

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

$channelCount.addEventListener('change', () => {
    if (audioTrack !== undefined) {
        const channelCountValue = parseInt($channelCountValue.value, 10);

        audioTrack
            .applyConstraints({
                channelCount: $channelCount.checked ? channelCountValue : null
            })
            .then(() => {
                const settings = audioTrack.getSettings();

                // @todo Circumvent Chrome's disability to change the constraints of an audio track.
                if (
                    settings.channelCount !== undefined &&
                    (($channelCount.checked && settings.channelCount !== channelCountValue) ||
                        (!$channelCount.checked && settings.channelCount === channelCountValue))
                ) {
                    return getUserMedia();
                }
            })
            .finally(() => {
                const settings = audioTrack.getSettings();

                if (settings.channelCount !== undefined) {
                    if ($channelCount.checked) {
                        const isRequestedValue = settings.channelCount === channelCountValue;

                        $channelCount.checked = isRequestedValue;
                        $channelCountValue.disabled = isRequestedValue;
                    } else {
                        $channelCountValue.disabled = false;
                    }
                }
            });
    }
});

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

$inputDevice.addEventListener('change', () => {
    if (audioTrack !== undefined) {
        const inputDeviceId = $inputDevice.options[$inputDevice.selectedIndex].value;
        const settings = audioTrack.getSettings();

        if (settings.deviceId !== undefined && settings.deviceId !== inputDeviceId) {
            applyDeviceIdConstraints();
        }
    }
});

$latency.addEventListener('change', () => {
    if (audioTrack !== undefined) {
        const latencyValue = parseFloat($latencyValue.value);

        audioTrack
            .applyConstraints({
                latency: $latency.checked ? latencyValue : null
            })
            .then(() => {
                const settings = audioTrack.getSettings();

                // @todo Circumvent Chrome's disability to change the constraints of an audio track.
                if (
                    settings.latency !== undefined &&
                    (($latency.checked && settings.latency !== latencyValue) || (!$latency.checked && settings.latency === latencyValue))
                ) {
                    return getUserMedia();
                }
            })
            .finally(() => {
                const settings = audioTrack.getSettings();

                if (settings.latency !== undefined) {
                    if ($latency.checked) {
                        const isRequestedValue = settings.latency === latencyValue;

                        $latency.checked = isRequestedValue;
                        $latencyValue.disabled = isRequestedValue;
                    } else {
                        $latencyValue.disabled = false;
                    }
                }
            });
    }
});

$monitorAudio.addEventListener('change', () => {
    if (gainNode !== undefined) {
        gainNode.gain.value = $monitorAudio.checked ? 1 : 0;
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

$typeFrequencyDomainInput.addEventListener('change', () => {
    if ($typeFrequencyDomainInput.checked) {
        renderType = 'frequency-domain';
    }
});

$typeTimeDomainInput.addEventListener('change', () => {
    if ($typeTimeDomainInput.checked) {
        renderType = 'time-domain';
    }
});

function drawLevels(context, data, frequencyBinCount, xOffset, width) {
    let level = 0;

    for (let i = 0; i < frequencyBinCount; i += 1) {
        level += data[i] ** 2;
    }

    level = Math.sqrt(level / frequencyBinCount);

    const value = DISPLAY_HEIGHT * level;

    context.fillRect(xOffset, DISPLAY_HEIGHT - value, width, value);
}

function drawSpectrum(context, data, frequencyBinCount, xOffset, width) {
    const widthOfOneBin = width / frequencyBinCount;

    for (let i = 0; i < frequencyBinCount; i += 1) {
        const value = data[i];

        context.fillRect(xOffset + i * widthOfOneBin, DISPLAY_HEIGHT - value, widthOfOneBin, value);
    }
}

function draw() {
    displayContext.fillStyle = 'white';
    displayContext.fillRect(0, 0, $displayCanvas.width, DISPLAY_HEIGHT);

    displayContext.fillStyle = 'black';

    const length = analysers.length;
    const width = $displayCanvas.width / length;

    if (length > 0) {
        for (let i = 0; i < length; i += 1) {
            const analyser = analysers[i];
            const xOffset = i * width;

            if (renderType === 'frequency-domain') {
                analyser.getByteFrequencyData(frequencyData);

                drawSpectrum(displayContext, frequencyData, analyser.frequencyBinCount, xOffset, width);
            } else {
                analyser.getFloatTimeDomainData(timeDomainData);

                drawLevels(displayContext, timeDomainData, analyser.frequencyBinCount, xOffset, width);
            }
        }
    }

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

function errorCallback() {
    document.body.innerHTML = '<p>Please allow the site to access your audio input. Refresh the page to get asked again.</p>';
}

function successCallback(mediaStream) {
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

    if (settings.channelCount === undefined) {
        $channelCount.disabled = true;
    } else {
        $channelCountValue.value = settings.channelCount.toString();
    }

    if (settings.deviceId !== undefined) {
        const $option = $inputDevice.querySelector(`[value="${settings.deviceId}"]`);

        if ($option !== null) {
            $option.selected = true;
        }
    }

    if (settings.echoCancellation === undefined) {
        $echoCancellation.disabled = true;
    }

    if (settings.latency === undefined) {
        $latency.disabled = true;
    } else {
        $latencyValue.value = settings.latency.toString();
    }

    if (settings.noiseSuppression === undefined) {
        $noiseSuppression.disabled = true;
    }

    const [mediaStreamTrack] = mediaStream.getAudioTracks();
    const input = new MediaStreamTrackAudioSourceNode(audioContext, { mediaStreamTrack });
    const { channelCount } = mediaStreamTrack.getSettings();
    const splitter = audioContext.createChannelSplitter(channelCount);
    const merger = audioContext.createChannelMerger(channelCount);

    gainNode = audioContext.createGain();

    gainNode.gain.value = $monitorAudio.checked ? 1 : 0;

    input.connect(splitter);

    for (let i = 0; i < channelCount; i += 1) {
        const analyser = new AnalyserNode(audioContext, { fftSize: FFT_SIZE, smoothingTimeConstant: 0 });

        splitter.connect(analyser, i);
        analyser.connect(merger, 0, i);

        analysers.push(analyser);
    }

    merger.connect(gainNode);
    gainNode.connect(audioContext.destination);

    audioNodes.push(input, splitter, merger);
}

function getUserMedia() {
    const constraints = {
        audio: {
            autoGainControl: $autoGainControl.checked,
            channelCount: $channelCount.checked ? parseInt($channelCountValue.value, 10) : null,
            echoCancellation: $echoCancellation.checked,
            latency: $latency.checked ? parseFloat($latencyValue.value) : null,
            noiseSuppression: $noiseSuppression.checked
        }
    };
    const $selectedOption = $inputDevice.options[$inputDevice.selectedIndex];
    const inputDeviceId = $selectedOption !== undefined ? $selectedOption.value : undefined;

    if (inputDeviceId !== undefined && inputDeviceId !== 'no-selection') {
        constraints.audio.deviceId = { exact: inputDeviceId };
    }

    return navigator.mediaDevices.getUserMedia(constraints).then(successCallback).catch(errorCallback);
}

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

if ('navigator' in window && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    getUserMedia();
} else {
    document.body.innerHTML = '<p>Your browser does not support GetUserMedia. :-(</p>';
}
