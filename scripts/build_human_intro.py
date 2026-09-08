"""Bake the moving-book title into Della, before narration begins."""
import argparse
import subprocess
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('production',type=Path)
a=p.parse_args()
root=a.production.resolve()
ff=root/'tools/ffmpeg/bin/ffmpeg.exe'
book='production/magnific/gift-of-the-magi/scene-1/v11/s1-book-opening-v11-raw.mp4'
girl='production/magnific/gift-of-the-magi/scene-1/v10/s1-counting-clean-v10-raw.mp4'
title='production/magnific/gift-of-the-magi/opening-v17-title.ass'
output='production/human-cut/book-title-entry.mp4'
filters=(
    '[0:v]trim=end_frame=222,setpts=PTS-STARTPTS,scale=1920:1080,setsar=1,settb=AVTB[b];'
    "color=c=black:s=1920x1080:r=24:d=9.25,format=rgba,geq=r=0:g=0:b=0:a='195*pow(max(0,1-Y/760),0.7)',fade=t=out:st=5.2:d=1:alpha=1[shade];"
    f'[b][shade]overlay=shortest=1,subtitles={title}[book];'
    '[1:v]trim=end_frame=18,setpts=PTS-STARTPTS,scale=1920:1080,setsar=1,settb=AVTB[girl];'
    '[book][girl]xfade=transition=fade:duration=0.75:offset=8.5,format=yuv420p[out]'
)
subprocess.run([str(ff),'-hide_banner','-loglevel','error','-y','-threads','2','-i',book,
    '-threads','2','-i',girl,'-filter_complex_threads','1','-filter_complex',filters,
    '-map','[out]','-an','-frames:v','222','-c:v','libx264','-preset','fast','-crf','18',
    '-threads','2','-video_track_timescale','12288',output],cwd=root,check=True)
print(root/output)
