"""三条短片分别配器；只使用本地合成波形，不调用音乐生成服务。"""
from pathlib import Path
import argparse
import json
import wave
import numpy as np

ROOT=Path(__file__).resolve().parent
SR=48000


def hz(note): return 440*2**((note-69)/12)


def make_score(folder,style):
    project=ROOT/folder
    spec=json.loads((project/'project.json').read_text(encoding='utf-8'))
    duration=spec['duration']
    out=project/'audio/score.wav'
    if out.exists(): raise SystemExit(f'配乐已存在，不覆盖：{out}')
    rng=np.random.default_rng(708+style)
    audio=np.zeros((int(SR*duration),2),dtype=np.float64)

    def put(s,start,gain=1,pan=0):
        offset=round(start*SR)
        trim=max(0,-offset);s=s[trim:];offset=max(0,offset)
        n=min(len(s),len(audio)-offset)
        if n<=0:return
        audio[offset:offset+n,0]+=s[:n]*gain*np.sqrt((1-pan)/2)
        audio[offset:offset+n,1]+=s[:n]*gain*np.sqrt((1+pan)/2)

    def tone(note,seconds,kind='pluck'):
        t=np.arange(round(SR*seconds))/SR
        f=hz(note)
        if kind=='pad':
            s=np.sin(2*np.pi*f*t)+.33*np.sin(2*np.pi*f*1.0018*t+.4)+.12*np.sin(2*np.pi*f*2*t)
            env=np.minimum(1,t/1.1)*np.minimum(1,(seconds-t)/1.3)
        elif kind=='bell':
            s=np.sin(2*np.pi*f*t)*np.exp(-1.8*t)+.22*np.sin(2*np.pi*f*2.002*t)*np.exp(-4*t)+.08*np.sin(2*np.pi*f*3.98*t)*np.exp(-5*t)
            env=(1-np.exp(-t*140))*np.minimum(1,(seconds-t)/.1)
        elif kind=='metal':
            s=np.sin(2*np.pi*f*t)*np.exp(-4*t)+.25*np.sin(2*np.pi*f*2.76*t)*np.exp(-8*t)+.07*np.sin(2*np.pi*f*5.42*t)*np.exp(-18*t)
            env=(1-np.exp(-t*300))*np.minimum(1,(seconds-t)/.1)
        else:
            s=np.sin(2*np.pi*f*t)*np.exp(-3*t)+.19*np.sin(2*np.pi*f*2*t)*np.exp(-6*t)
            env=(1-np.exp(-t*160))*np.minimum(1,(seconds-t)/.1)
        return s*env

    def wind(start,length,gain,pan=0):
        t=np.arange(round(length*SR))/SR
        noise=rng.normal(0,1,len(t))
        filtered=np.convolve(noise,np.ones(47)/47,mode='same')
        env=np.sin(np.pi*t/length)**2
        put(filtered*env,start,gain,pan)

    if style==0:
        chords=[(0,[45,52,57,60]),(4,[48,55,60,64]),(9,[43,50,57,62]),(14,[48,55,59,64])]
        melody=[69,72,76,72,67,69,64,67]
        for i,start in enumerate(np.arange(.4,19,.5)):
            gain=.046 if start<4 else .07
            s=tone(melody[i%8],1.8)
            put(s,start,gain,np.sin(i)*.45);put(s,start+.25,gain*.17,-np.sin(i)*.45)
        for start in np.arange(.5,13.5,.25):
            t=np.arange(int(.045*SR))/SR
            s=rng.normal(0,1,len(t))*np.exp(-t*140)*(1-np.exp(-t*700))
            put(s,start,.006*(1-start/15),float(rng.uniform(-.8,.8)))
        for cut in [4,9,14]:wind(cut-.55,.8,.13)
        wind(0,3.6,.09)
    elif style==1:
        chords=[(0,[50,57,61,66]),(4,[47,54,59,62]),(9.5,[43,50,57,62]),(14,[45,52,59,64]),(17,[50,57,61,66])]
        melody=[78,76,73,69,73,76,81,78]
        for i,start in enumerate(np.arange(.8,22.6,.82)):
            s=tone(melody[i%8],3.0,'bell');gain=.046 if start<9.5 else .063
            put(s,start,gain,np.sin(i*.8)*.6)
            put(s,start+.43,gain*.23,-np.sin(i*.8)*.6)
            put(s,start+.91,gain*.09,np.sin(i*.8)*.6)
        for cut in [4,6.5,9.5,17]:wind(cut-.4,.9,.12,(-1)**int(cut)*.35)
        # 飞行段的气流缓慢横穿声场。
        wind(10,6,.055,-.6);wind(14,7,.06,.6)
    else:
        chords=[(0,[38,45,50,57]),(5,[41,48,53,57]),(11,[43,50,55,62]),(16,[45,52,57,60]),(20,[50,57,61,66])]
        beat=60/110
        melody=[62,69,65,57,62,72,69,65]
        for i,start in enumerate(np.arange(.6,23,beat)):
            gain=.055 if start<5 else .075
            s=tone(melody[i%8],1.2,'metal');put(s,start,gain,(-1)**i*.38)
            if i%2==0:
                t=np.arange(int(.42*SR))/SR
                kick=np.sin(2*np.pi*(44*t+28*.036*(1-np.exp(-t/.036))))*np.exp(-t*10)*(1-np.exp(-t*250))
                put(kick,start,.14 if start>5 else .065)
            t=np.arange(int(.065*SR))/SR
            tick=rng.normal(0,1,len(t))*np.exp(-t*85)*(1-np.exp(-t*400))
            put(tick,start+beat/2,.004,(-1)**i*.65)
        for rank in range(8):
            moment=6.6+rank*.66
            put(tone(69+rank%5,1,'metal'),moment,.042,(-1)**rank*.5)
        for cut in [5,11,16,20]:wind(cut-.65,.85,.15)

    for i,(start,notes) in enumerate(chords):
        end=chords[i+1][0] if i+1<len(chords) else duration
        seconds=end-start+1.2
        for k,note in enumerate(notes):
            put(tone(note,seconds,'pad'),start-.2,.018 if style!=1 else .021,(k/(len(notes)-1)-.5)*1.3)
        put(tone(notes[0]-12,seconds,'pad'),start-.2,.028 if style!=1 else .019)
    t=np.arange(len(audio))/SR
    fade=np.minimum(1,t/.45)*np.minimum(1,np.maximum(0,(duration-t)/1.35))**1.4
    audio*=fade[:,None]
    audio=np.tanh(audio*1.4)
    audio*=.72/max(float(np.max(np.abs(audio))),1e-9)
    out.parent.mkdir(exist_ok=True)
    with wave.open(str(out),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR)
        wav.writeframes(np.clip(audio*32767,-32768,32767).astype('<i2').tobytes())
    print(f'{folder}: {duration}s stereo, peak={20*np.log10(np.max(np.abs(audio))):.2f} dBFS')


def main():
    examples={'signal':0,'paper-flight':1,'together-arch':2}
    parser=argparse.ArgumentParser(description='合成三个原创示例的配乐；不覆盖已有音轨。')
    parser.add_argument('--example',choices=examples,help='只生成指定示例；省略则生成全部三个示例')
    args=parser.parse_args()
    selected=[args.example] if args.example else list(examples)
    for folder in selected:
        out=ROOT/folder/'audio/score.wav'
        if out.exists(): raise SystemExit(f'配乐已存在，不覆盖：{out}')
    for folder in selected:
        make_score(folder,examples[folder])


if __name__=='__main__':
    main()
