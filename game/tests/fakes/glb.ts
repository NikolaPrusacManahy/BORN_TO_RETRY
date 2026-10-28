// Update 0.0.15 — a textured .glb in Node: GLTFLoader can't decode images without a browser, so the textures are taken
// out of the file's JSON (the meshes, skins and clips stay) before it's parsed.
import { readFileSync } from 'node:fs';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

export async function parseUntextured(url: URL): Promise<GLTF> {
  const buf = readFileSync(url);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const m of json.materials ?? []) {
    delete m.pbrMetallicRoughness?.baseColorTexture;
    delete m.pbrMetallicRoughness?.metallicRoughnessTexture;
    delete m.normalTexture;
    delete m.emissiveTexture;
    delete m.occlusionTexture;
  }
  let text = JSON.stringify(json);
  while (text.length % 4) text += ' ';
  const head = Buffer.alloc(20);
  const bin = buf.subarray(20 + jsonLen);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + text.length + bin.length, 8);
  head.writeUInt32LE(text.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  const out = Buffer.concat([head, Buffer.from(text, 'utf8'), bin]);
  return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer, '');
}
