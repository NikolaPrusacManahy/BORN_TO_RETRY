# Update 0.3.19 — a music track (the designer's WAVs, ASSETS/AUDIO/COMBAT) encoded for the game: Ogg Vorbis (its
# loop seamless, unlike an MP3's), stereo, 44.1 kHz, through Blender's own encoder (no ffmpeg on the PC).
#   blender --background --factory-startup --python tools/blender/encode_music.py -- <in.wav> <out.ogg> [kbps]
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
kbps = int(args[2]) if len(args) > 2 else 192
scene = bpy.context.scene
scene.sequence_editor_create()
strips = scene.sequence_editor.strips if hasattr(scene.sequence_editor, 'strips') else scene.sequence_editor.sequences
strip = strips.new_sound('track', src, 1, 1)
scene.render.fps = 100
scene.render.fps_base = 1
scene.frame_start = 1
scene.frame_end = strip.frame_final_end - 1
scene.render.ffmpeg.audio_mixrate = 44100
scene.render.ffmpeg.audio_channels = 'STEREO'
bpy.ops.sound.mixdown(filepath=out, check_existing=False, container='OGG', codec='VORBIS', format='S16', bitrate=kbps, split_channels=False)
print(f'ENCODED {out}: {(scene.frame_end - scene.frame_start + 1) / 100:.2f} s')
