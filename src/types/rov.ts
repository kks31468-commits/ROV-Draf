export type Lane = 'dsl' | 'jg' | 'mid' | 'adl' | 'sp';

export type Role = 'Warrior' | 'Assassin' | 'Mage' | 'Marksman' | 'Tank' | 'Support';

export type Tier = 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C' | 'D';

export type DamageType = 'physical' | 'magic' | 'true' | 'mixed';

export interface HeroStats {
  cc: number; // 1-10
  burst: number; // 1-10
  mobility: number; // 1-10
  survivability: number; // 1-10
  waveClear: number; // 1-10
  lateGamePower: number; // 1-10
}

export interface Hero {
  id: string;
  name: string;
  nameTh: string;
  slug?: string;
  avatarUrl?: string;
  primaryLane: Lane;
  secondaryLanes: Lane[];
  role: Role;
  secondaryRole?: Role;
  tier: Tier;
  damageType: DamageType;
  playstyle: string;
  winRate: number; // % e.g. 52.8
  pickRate: number; // % e.g. 18.5
  banRate: number; // % e.g. 35.2
  counters: string[]; // Hero IDs this hero beats/counters
  counteredBy: string[]; // Hero IDs that counter this hero
  synergies: string[]; // Hero IDs that combo exceptionally with this hero
  prosTh: string[]; // จุดเด่น
  consTh: string[]; // ข้อจำกัด / จุดอ่อน
  draftTipsTh: string; // คำแนะนำการดราฟท์ตาม RoV Meta
  coreItemsTh: string[]; // ไอเทมหลักยอดนิยม
  challengerSpellTh: string; // สเปลที่แนะนำ
  stats: HeroStats;
}

export interface TeamDraftSlot {
  lane: Lane;
  hero: Hero | null;
  locked: boolean;
}

export interface DraftState {
  blueBans: (Hero | null)[];
  redBans: (Hero | null)[];
  bluePicks: {
    dsl: Hero | null;
    jg: Hero | null;
    mid: Hero | null;
    adl: Hero | null;
    sp: Hero | null;
  };
  redPicks: {
    dsl: Hero | null;
    jg: Hero | null;
    mid: Hero | null;
    adl: Hero | null;
    sp: Hero | null;
  };
  currentStepIndex: number;
  draftMode: 'ranked' | 'tournament' | 'free';
  activeTeam: 'blue' | 'red';
  activeAction: 'ban' | 'pick';
  selectedHeroForDetail: Hero | null;
}

export interface Recommendation {
  hero: Hero;
  score: number;
  reasons: {
    type: 'counter' | 'synergy' | 'team_need' | 'meta' | 'lane_fit';
    text: string;
  }[];
  counterTargets: Hero[];
  synergyAllies: Hero[];
}

export interface TeamAnalysis {
  physicalPct: number;
  magicPct: number;
  truePct: number;
  avgCc: number;
  avgSurvivability: number;
  avgMobility: number;
  avgWaveClear: number;
  avgLateGame: number;
  warnings: {
    level: 'danger' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
  }[];
  compArchetype: string;
  overallScore: number;
}
