# Update 0.3.33 — floor 8's martial artists (MD/FLOOR8_SHRINE_PLAN.md; the designer: "make sure enemies are indeed
# martial art experts, dashing, side steps"), each one of the More-enemies people with the Universal Animation Library's
# clips baked on (ual_people.py): `base` its exported model (tools/blender/export_people.py, its weapon in its fist),
# `out` the game's model, `clips` by library (a name; `!` kept in place, the game moving the body; `@0.5` a still
# moment; `a+b` one after the other; `=Name` its name in the game), `keep` its own clips kept, `weapon_turn` its weapon
# turned about its forearm (degrees: the blade forward in the library's sword stance, the bow upright in its aim).

# What every fighter has: a fighting stance (the stance's entry, held at its end), jogging every way round you (its
# side-steps), a sprint (its dash), side dodges, hit and knocked back, getting up with a kip-up, dying.
MOVING = ['Jog_Fwd_Loop!', 'Jog_Left_Loop!', 'Jog_Right_Loop!', 'Jog_Bwd_Loop!', 'Sprint_Loop!', 'Dodge_Left!', 'Dodge_Right!', 'Hit_Chest', 'Hit_Head']
HURT = ['Hit_Knockback', 'KipUp']

FIGHTERS = {
    # The Karateka: stance, a jab-cross-kick combo, a hook, a knee, an uppercut, a front kick; blocks and counters.
    'karateka': {
        'base': 'Kimono_Male', 'out': 'public/models/enemies/karateka.glb',
        'clips': {
            'UAL1': ['PunchKick_Enter@1=Stance', 'PunchKick_Enter'] + MOVING + ['Punch_Jab', 'Punch_Cross', 'Kick', 'Death01'],
            'UAL2': ['Melee_Combo', 'Melee_Hook', 'Melee_Knee', 'Melee_Uppercut', 'Sword_Block'] + HURT,
        },
    },
    # The Karate Girl: quicker; a flying knee, a kick, the combo; back-flips away; side-steps.
    'karateGirl': {
        'base': 'Kimono_Female', 'out': 'public/models/enemies/karate_girl.glb',
        'clips': {
            'UAL1': ['PunchKick_Enter@1=Stance', 'PunchKick_Enter'] + MOVING + ['Punch_Jab', 'Kick', 'BackFlip!', 'Death02'],
            'UAL2': ['Melee_Combo', 'Melee_Hook', 'Melee_Knee', 'JogToFlip!'] + HURT,
        },
    },
    # The Shinobi: his katana; shuriken thrown overhand; a dash slash through you; light cuts.
    'shinobi': {
        'base': 'Ninja_Male_Katana', 'out': 'public/models/enemies/shinobi.glb', 'weapon_turn': -90,
        'clips': {
            'UAL1': ['Sword_Idle', 'Crouch_Idle_Loop', 'Death01'] + MOVING,
            'UAL2': ['OverhandThrow', 'Sword_Dash!', 'Sword_Light_A', 'Sword_Light_B', 'Sword_Light_Combo'] + HURT,
        },
    },
    # The Kunoichi: her kunai; running along the walls and leaping off them; the ninja's double jump; kunai thrown.
    'kunoichi': {
        'base': 'Ninja_Female_Kunai', 'out': 'public/models/enemies/kunoichi.glb', 'weapon_turn': -90,
        'clips': {
            'UAL1': ['PunchKick_Enter@1=Stance', 'Spell_Simple_Shoot', 'Kick', 'Death02'] + MOVING,
            'UAL2': ['WallRun_L_Loop!', 'WallRun_R_Loop!', 'WallRun_Jump_L!', 'WallRun_Jump_R!', 'NinjaJump_Start!', 'NinjaJump_Double!', 'NinjaJump_Idle_Loop!',
                     'NinjaJump_Land!', 'Melee_Hook', 'Sword_Aerial_A'] + HURT,
        },
    },
    # The Sand Ninjas: smoke bombs thrown overhand, caltrops scattered, rolling away, low and quick.
    'sandNinja': {
        'base': 'Ninja_Sand', 'out': 'public/models/enemies/sand_ninja.glb',
        'clips': {
            'UAL1': ['Crouch_Idle_Loop', 'Crouch_Fwd_Loop!', 'Roll!', 'Punch_Jab', 'Death01'] + MOVING,
            'UAL2': ['OverhandThrow', 'Farm_ScatteringSeeds', 'Melee_Hook'] + HURT,
        },
    },
    'sandNinjaF': {
        'base': 'Ninja_Sand_Female', 'out': 'public/models/enemies/sand_ninja_f.glb',
        'clips': {
            'UAL1': ['Crouch_Idle_Loop', 'Crouch_Fwd_Loop!', 'Roll!', 'Punch_Jab', 'Death02'] + MOVING,
            'UAL2': ['OverhandThrow', 'Farm_ScatteringSeeds', 'Melee_Hook'] + HURT,
        },
    },
    # The Archer: her bow; nocking, drawing, loosing; a volley; backing away.
    'archer': {
        'base': 'Kimono_Female_Bow', 'out': 'public/models/enemies/archer.glb', 'weapon_turn': 90,
        'clips': {
            'UAL1': ['Idle_Loop', 'Death02'] + MOVING,
            'UAL2': ['Bow_Notch', 'Bow_Aim_Neutral', 'Bow_Shoot', 'Bow_RapidShoot_Loop', 'Bow_Aim_Down'] + HURT,
        },
    },
    # The Sensei: his bo staff; arms folded, waiting; his guard; staff flurries; a slam; a palm thrust of his ki.
    'sensei': {
        'base': 'Kimono_Male_Staff', 'out': 'public/models/enemies/sensei.glb',
        'clips': {
            'UAL1': ['Sword_Idle', 'Walk_Loop!', 'Spell_Simple_Shoot', 'Spell_Double_Enter', 'Death01'] + MOVING,
            'UAL2': ['Idle_FoldArms_Loop', 'Sword_Block', 'Sword_Regular_Combo', 'Sword_Heavy_Combo', 'Sword_GroundPound', 'Sword_UpperCut'] + HURT,
        },
    },
    # The Shadow: his katana; the dash slash across the room; light and aerial combos; his double jump; splitting.
    'shadow': {
        'base': 'Ninja_Male_Katana', 'out': 'public/models/enemies/shadow.glb', 'weapon_turn': -90,
        'clips': {
            'UAL1': ['Sword_Idle', 'BackFlip!', 'Spell_Double_Enter', 'Death01'] + MOVING,
            'UAL2': ['Sword_Dash!', 'Sword_Light_Combo', 'Sword_Heavy_A', 'NinjaJump_Start!', 'NinjaJump_Double!', 'NinjaJump_Land!', 'Sword_Aerial_Combo_Loop!'] + HURT,
        },
    },
}
