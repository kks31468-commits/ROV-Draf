import { Hero, Lane } from '../types/rov';
import { LANE_CONFIG } from './heroesData';
import { ALL_131_HEROES } from './all131Heroes';

export { LANE_CONFIG };

export const ALL_HEROES: Hero[] = ALL_131_HEROES;

export const HERO_MAP = new Map<string, Hero>(
  ALL_HEROES.map((h) => [h.id.toLowerCase(), h])
);

export function getHeroById(id: string): Hero | undefined {
  return HERO_MAP.get(id.toLowerCase());
}

export function getHeroesByLane(lane: Lane): Hero[] {
  return ALL_HEROES.filter(
    (h) => h.primaryLane === lane || h.secondaryLanes?.includes(lane)
  );
}

export interface PresetComp {
  id: string;
  nameTh: string;
  nameEn: string;
  descriptionTh: string;
  archetype: string;
  heroes: {
    dsl: string;
    jg: string;
    mid: string;
    adl: string;
    sp: string;
  };
}

export const PRESET_COMPS: PresetComp[] = [
  {
    id: 'comp-dive-assassin',
    nameTh: 'ไดฟ์ล้วงหลังมหาประลัย (Dive & Delete)',
    nameEn: 'Dive & Backline Assassination',
    descriptionTh: 'คอมพ์บุกทะลวงกำแพงแนวหลัง Aoi กับ Florentino ล็อคเป้าแครี่คู่ต่อสู้ ขณะที่ Raz และ Stuart กดดันจากระยะกลาง',
    archetype: 'Dive & Burst',
    heroes: {
      dsl: 'florentino',
      jg: 'aoi',
      mid: 'raz',
      adl: 'stuart',
      sp: 'thane',
    },
  },
  {
    id: 'comp-protect-carry',
    nameTh: '4 ปกป้อง 1 แครี่ยืนกราด (Protect the Hypercarry)',
    nameEn: 'Hypercarry Protection Engine',
    descriptionTh: 'เน้นให้ Helen และ TeeMee คอยฮีลและชุบชีวิต Capheny เพื่อให้เดินยิงไฟต์ได้อย่างมั่นคง พร้อม Biron และ Iggy คอยดันเลน',
    archetype: 'Sustain & Protect',
    heroes: {
      dsl: 'biron',
      jg: 'keera',
      mid: 'iggy',
      adl: 'capheny',
      sp: 'helen',
    },
  },
  {
    id: 'comp-global-portal',
    nameTh: 'วาร์ปด่วนทั่วแมพ (Rouie Global Rotation)',
    nameEn: 'Global Portal Rotation',
    descriptionTh: 'ใช้วงวาร์ปของ Rouie ส่งเพื่อนกลับบ่อเลือดเต็มแล้ววาร์ปกลับมาไฟต์ต่อทันที พร้อม Bijan ขี่สัตว์เปิดไฟต์ข้ามแมพ',
    archetype: 'Macro & Rotation',
    heroes: {
      dsl: 'bijan',
      jg: 'nakroth',
      mid: 'yue',
      adl: 'violet',
      sp: 'rouie',
    },
  },
  {
    id: 'comp-heavy-cc-wombo',
    nameTh: 'ล็อคหมู่ระเบิดพลัง (Wombocombo Chain CC)',
    nameEn: 'Heavy Wombocombo CC',
    descriptionTh: 'Lorion รวบศัตรูลอยเคว้งกลางอากาศ Baldum ฝังดิน Maloch โดดฟัน True Damage และ Hayate หมุนพายุสังหารหมู่อย่างหมดจด',
    archetype: 'AoE Wombocombo',
    heroes: {
      dsl: 'maloch',
      jg: 'paine',
      mid: 'lorion',
      adl: 'hayate',
      sp: 'baldum',
    },
  },
  {
    id: 'comp-poke-siege',
    nameTh: 'สไนเปอร์กดเลนดักตีป้อม (Poke & High Siege)',
    nameEn: 'Long Range Poke & Siege',
    descriptionTh: 'Elsu กับ Iggy สาดสกิลจากระยะไกลไม่ให้ฝ่ายตรงข้ามเข้าใกล้ป้อม Omen ขังเดี่ยวตัวหลุด และ Zip อมเซฟเพื่อน',
    archetype: 'Poke & Siege',
    heroes: {
      dsl: 'omen',
      jg: 'murad',
      mid: 'iggy',
      adl: 'elsu',
      sp: 'zip',
    },
  },
];
