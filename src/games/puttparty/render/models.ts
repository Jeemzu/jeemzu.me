import { Box3, Group, Vector3, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Optional generated models. `public/puttparty/models/manifest.json` maps a slot to a GLB file
 * (e.g. `{ "tree": { "file": "tree.glb", "height": 2.4 } }`). Missing slots, a missing manifest or
 * a failed load fall back to the procedural meshes, so the game never depends on these assets.
 */
export type ModelSlot = "tree" | "rock" | "flag";

export interface ModelSpec {
  file: string;
  /** World-unit height the model is scaled to; its base is moved to y = 0. */
  height: number;
}

export type LoadedModels = Partial<Record<ModelSlot, Object3D>>;

const BASE = `${import.meta.env.BASE_URL}puttparty/models/`;

export async function loadModels(signal: AbortSignal): Promise<LoadedModels> {
  let manifest: Partial<Record<ModelSlot, ModelSpec>>;
  try {
    const res = await fetch(`${BASE}manifest.json`, { signal });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return {};
    manifest = await res.json();
  } catch {
    return {};
  }
  const loader = new GLTFLoader();
  const out: LoadedModels = {};
  await Promise.all(
    (Object.entries(manifest) as [ModelSlot, ModelSpec][]).map(async ([slot, spec]) => {
      try {
        const gltf = await loader.loadAsync(BASE + spec.file);
        if (signal.aborted) return;
        out[slot] = normalize(gltf.scene, spec.height);
      } catch (err) {
        console.warn(`[puttparty] model "${slot}" unavailable, using fallback`, err);
      }
    }),
  );
  return out;
}

/** Wraps the model so callers can position/scale the wrapper freely. */
function normalize(model: Object3D, height: number): Object3D {
  model.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  const size = new Box3().setFromObject(model).getSize(new Vector3());
  if (size.y > 0) model.scale.multiplyScalar(height / size.y);
  const box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);
  const wrapper = new Group();
  wrapper.add(model);
  return wrapper;
}
