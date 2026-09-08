"""Literary end credits over film stills, not frozen padding in the story."""
import argparse
import subprocess
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('production',type=Path)
a=p.parse_args()
root=a.production.resolve()
ff=root/'tools/ffmpeg/bin/ffmpeg.exe'
out=root/'production/human-cut'
out.mkdir(exist_ok=True)
sources=[
 ('production/magnific/gift-of-the-magi/scene-12/raw/01-magi-travel.mp4',3),
 ('production/magnific/gift-of-the-magi/scene-12/raw/05-supper.mp4',1),
 ('production/award-candidate/final-round-01/shared-ending.mp4',8),
]
def run(args):
    subprocess.run([str(ff),'-hide_banner','-loglevel','error','-y',*map(str,args)],cwd=root,check=True)
for i,(source,time) in enumerate(sources):
    framing=['-vf','crop=960:540:400:80,scale=1920:1080'] if i == 1 else []
    run(['-threads','1','-ss',time,'-i',source,*framing,'-frames:v','1','-threads','1',out/f'credit-v2-{i}.png'])
ass=out/'literary-credits.ass'
ass.write_text('''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,Georgia,64,&H00E3EDF3,&H00E3EDF3,&H900C100F,&H00000000,0,0,0,0,100,100,0,0,1,1,1,1,110,110,110,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:07.80,Main,,0,0,0,,{\\fad(700,600)\\fs88}The Gift of the Magi\\N{\\fs44}Story by O. Henry
Dialogue: 0,0:00:08.20,0:00:15.80,Main,,0,0,0,,{\\fad(600,600)\\fs38}THE CHARACTERS\\N{\\fs60}Della Young · Jim Young\\N{\\fs44}Madame Sofronie · The storyteller
Dialogue: 0,0:00:16.20,0:00:23.30,Main,,0,0,0,,{\\fad(600,900)\\fs54}Each gave up a treasure for the other.\\N{\\fs44}Their love is the gift that remains.\\N\\N{\\fs36}Adapted and edited by Dan Cockrell
''',encoding='utf-8')
filters=[]
for i,duration in enumerate([8.5,8.5,191/24]):
    filters.append(f'[{i}:v]trim=duration={duration},setpts=PTS-STARTPTS,scale=1920:1080,setsar=1,settb=AVTB,eq=brightness=-0.08[v{i}]')
filters += ['[v0][v1]xfade=transition=fade:duration=0.5:offset=8[a]',
            '[a][v2]xfade=transition=fade:duration=0.5:offset=16[b]',
            '[b]subtitles=production/human-cut/literary-credits.ass,fade=t=in:d=0.5,fade=t=out:st=22.5:d=1,format=yuv420p[out]']
inputs=[]
for i in range(3):
    inputs += ['-loop','1','-framerate','24','-threads','1','-i',out/f'credit-v2-{i}.png']
run([*inputs,'-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map','[out]',
     '-an','-frames:v','575','-c:v','libx264','-preset','fast','-crf','18','-threads','2',
     '-video_track_timescale','12288',out/'literary-credits-v2.mp4'])
print(out/'literary-credits-v2.mp4')
