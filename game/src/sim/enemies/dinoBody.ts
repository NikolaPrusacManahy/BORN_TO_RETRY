// Update 0.3.60 — what the Velociraptor keeps by the Boss Design Bible (spec MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md): when it next clicks,
// when its eyes flash in the dark, when it may call its pack, whether it's on its back. Pure.
export interface DinoBody {
  /** Seconds till its next click. */
  clickIn: number;
  /** Its way round you, unseen (rad a second: which way). */
  way: number;
  /** When in its Apex Hunt its eyes flash (s into its stalk), and till its next heartbeat. */
  flashAt: number;
  beatIn: number;
  /** Seconds till it may call its pack. */
  callIn: number;
  /** Blinded, on its back. */
  flipped: boolean;
  /** Where it was aiming to come from round you (rad). */
  bearing: number;
}

export const createDinoBody = (): DinoBody => ({ clickIn: 0, way: 1, flashAt: 0, beatIn: 0, callIn: 0, flipped: false, bearing: 0 });
