"""为影片离线合成配乐；所有音色来自波形，不使用外部音频素材。"""
from pathlib import Path
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
if (ROOT / 'audio/score-original.wav').exists():
    raise SystemExit('配乐已存在，请直接复用；如需重做，请先另存旧音轨。')
SR = 48000
DURATION = 36
rng = np.random.default_rng(7731)
audio = np.zeros((SR * DURATION, 2), dtype=np.float64)


def place(signal, start, gain=1.0, pan=0.0):
    offset = round(start * SR)
    if offset >= len(audio):
        return
    trim = max(0, -offset)
    signal = signal[trim:]
    offset = max(0, offset)
    n = min(len(signal), len(audio) - offset)
    if n <= 0:
        return
    audio[offset:offset+n, 0] += signal[:n] * gain * np.sqrt((1-pan)/2)
    audio[offset:offset+n, 1] += signal[:n] * gain * np.sqrt((1+pan)/2)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def pad(note, seconds, phase):
    t = np.arange(round(seconds*SR))/SR
    freq = hz(note)
    signal = np.zeros_like(t)
    for harmonic, level in [(1, 1), (2, .2), (3, .10), (4, .035)]:
        signal += level * (np.sin(2*np.pi*freq*harmonic*t+phase)
                           + .42*np.sin(2*np.pi*freq*harmonic*1.0018*t+phase*.7))
    envelope = np.minimum(1, t/1.3) ** 1.4 * np.minimum(1, (seconds-t)/1.6) ** 1.3
    return signal * envelope * (.8+.2*np.sin(2*np.pi*.19*t+phase))


def pluck(note, seconds=2.4):
    t = np.arange(round(seconds*SR))/SR
    freq = hz(note)
    signal = np.sin(2*np.pi*freq*t)*np.exp(-2.0*t)
    signal += .25*np.sin(2*np.pi*freq*2.001*t)*np.exp(-4*t)
    signal += .10*np.sin(2*np.pi*freq*3.997*t)*np.exp(-7*t)
    return signal * (1-np.exp(-t*180)) * np.minimum(1, (seconds-t)/.15)


# 配器逐步展开，而不是全片保持相同的循环音量。
chords = [(0,[50,57,60,65]), (4.5,[46,53,57,62]), (8.5,[43,50,57,62]),
          (12.5,[48,55,62,65]), (16.5,[45,52,55,60]), (19.5,[50,57,62,65]),
          (23.25,[46,53,60,65]), (27,[43,50,57,62]), (31,[41,48,57,60,65])]
for i,(start,notes) in enumerate(chords):
    end = chords[i+1][0] if i+1 < len(chords) else 36
    seconds = end-start+1.5
    gain = .019 if start < 19.5 else .028
    for k,note in enumerate(notes):
        place(pad(note, seconds, k*.81), start-.35, gain, (k/(len(notes)-1)-.5)*1.4)
    place(pad(notes[0]-12, seconds, .3), start-.35, .026)

motif = [74,69,65,72,69,62,65,69]
for i,start in enumerate(np.arange(.75,34.0,.75)):
    gain=.048 if start<16.5 else .032 if start<19.5 else .065
    note=motif[i%len(motif)]
    if start>31: note=[72,69,65,60][i%4]
    sound=pluck(note)
    pan=np.sin(i*1.9)*.48
    place(sound,start,gain,pan)
    place(sound,start+.375,gain*.24,-pan)
    place(sound,start+.75,gain*.10,pan)

# 柔和的低鼓和细碎高频，仅在中后段建立推进感。
for i,start in enumerate(np.arange(9,33.1,.75)):
    strength=.6 if start<19.5 else 1
    if 16.5<start<19.5:
        continue
    if i%2==0:
        t=np.arange(round(.44*SR))/SR
        phase=2*np.pi*(45*t+40*.028*(1-np.exp(-t/.028)))
        kick=np.sin(phase)*np.exp(-t*11)*(1-np.exp(-t*200))
        place(kick,start,.12*strength)
    t=np.arange(round(.095*SR))/SR
    noise=rng.normal(0,1,len(t))
    hiss=np.concatenate(([0],np.diff(noise)))
    place(hiss*np.exp(-t*65)*(1-np.exp(-t*700)),start+.375,.0045*strength,(-1)**i*.4)

# 与切镜时刻对齐的空气吸入和低频冲击。
for index,cut in enumerate([4.5,8.5,12.5,16.5,19.5,27,31]):
    seconds=1.0
    t=np.arange(round(seconds*SR))/SR
    white=rng.normal(0,1,len(t))
    smooth=np.convolve(white,np.ones(31)/31,mode='same')
    env=np.sin(np.pi*np.minimum(t/.82,1)/2)**3
    env*=np.minimum(1,(seconds-t)/.18)
    place(smooth*env,cut-.82,.10 if cut!=19.5 else .19,index%2*.7-.35)
    t=np.arange(round(1.5*SR))/SR
    impact=np.sin(2*np.pi*(38*t+20*.12*(1-np.exp(-t/.12))))*np.exp(-t*4)*(1-np.exp(-t*250))
    place(impact,cut,.085 if cut!=19.5 else .16)

# 收束处留出尾音与安静，而不是突然截断。
t=np.arange(len(audio))/SR
fade=np.minimum(1,t/.6)*np.minimum(1,np.maximum(0,(36-t)/1.25))**1.5
audio*=fade[:,None]
peak=np.max(np.abs(audio))
audio*=.78/max(peak,1e-9)
path=ROOT/'audio';path.mkdir(exist_ok=True)
out=path/'score-original.wav'
with wave.open(str(out),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes(np.clip(audio*32767,-32768,32767).astype('<i2').tobytes())
(path/'score-info.json').write_text(json.dumps({'sample_rate':SR,'duration':DURATION,'channels':2,'peak_dbfs':float(20*np.log10(np.max(np.abs(audio)))),'external_samples':False,'voice':False},indent=2),encoding='utf-8')
print(out)
