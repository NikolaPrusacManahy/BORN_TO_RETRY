// Update 0.2.20 — the shop's Fate Card in the world (sim/cards/shopCard.ts; the designer: "the shop has only one fate
// card. floating near, cost 100"): the card floats past the end of the row of tiles, turning slowly and bobbing, lit in
// its rarity's colour, its price over it (red when you can't pay). Its face painted in code like the cards on the page:
// its rarity's frame, its rarity and move along the top, its mark, its name; its back the lobby stand's. Gone once
// bought. Blank where there's no page to paint on (the rule tests). (Update 0.3.21 — its face painter: cardFace.ts.)
import * as THREE from 'three';
import { CARD_FLOAT, CARD_PRICE_Y, cardPrice, ShopCard } from '../sim/cards/shopCard';
import type { CombatState } from '../sim/combat/state';
import { CARDS } from '../tuning/cards';
import { CARD } from '../sim/cards/cards';
import { RARITY_HEX } from '../ui/cardMarks';
import { cardFaceTexture } from './cardFace';
import { cardBackTexture } from './lobby/fateStand';

/** The card's size (m), how fast it turns (rad/s), its bob (m) and its light. */
const W = 0.55;
const H = 0.77;
const TURN = 0.8;
const BOB = 0.06;
const GLOW = 6;

type Tags = (price: number) => { cheap: THREE.SpriteMaterial; dear: THREE.SpriteMaterial };

/** The card's face (cardFace.ts; Update 0.3.21 — shared with the manor's cards gallery). */
const faceTexture = (card: ShopCard): THREE.Texture => (card.kind === null ? new THREE.Texture() : cardFaceTexture(card.kind));

export class ShopCardView {
  readonly group = new THREE.Group();
  private readonly card = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(W, H);
  private readonly faces: THREE.MeshBasicMaterial[] = [];
  private readonly price: THREE.Sprite | null = null;
  private readonly light: THREE.PointLight | null = null;

  constructor(
    private readonly shop: ShopCard | null | undefined,
    tags: Tags,
  ) {
    if (!shop || shop.kind === null) return;
    this.price = new THREE.Sprite(tags(CARDS.v.shopCard).cheap);
    const front = new THREE.MeshBasicMaterial({ map: faceTexture(shop), side: THREE.FrontSide });
    const back = new THREE.MeshBasicMaterial({ map: cardBackTexture(), side: THREE.FrontSide });
    this.faces.push(front, back);
    const behind = new THREE.Mesh(this.geo, back);
    behind.rotation.y = Math.PI;
    this.card.add(new THREE.Mesh(this.geo, front), behind);
    this.light = new THREE.PointLight(new THREE.Color(RARITY_HEX[CARD[shop.kind].rarity]), GLOW, 4, 1.6);
    this.price.scale.set(0.8, 0.3, 1);
    this.price.position.y = CARD_PRICE_Y;
    this.group.add(this.card, this.light, this.price);
    this.group.position.set(shop.x, 0, shop.z);
    this.card.position.y = CARD_FLOAT;
    this.light.position.y = CARD_FLOAT;
  }

  /** Each frame: it turns and bobs; its price as you can pay it; gone once bought (its light dark, not taken out: the
   *  scene's lights stay as many, so nothing is rebuilt as you buy). */
  update(time: number, state: CombatState, tags: Tags) {
    const c = this.shop;
    if (!c || c.kind === null || !this.price || !this.light) return;
    this.card.visible = this.price.visible = !c.sold;
    this.light.intensity = c.sold ? 0 : GLOW;
    if (c.sold) return;
    this.card.rotation.y = time * TURN;
    this.card.position.y = CARD_FLOAT + Math.sin(time * 1.6) * BOB;
    const price = cardPrice(state);
    const tag = tags(price);
    this.price.material = state.money < price ? tag.dear : tag.cheap;
  }

  dispose() {
    this.geo.dispose();
    for (const m of this.faces) {
      m.map?.dispose();
      m.dispose();
    }
    this.light?.dispose();
  }
}
