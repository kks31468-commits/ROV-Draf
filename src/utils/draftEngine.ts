import { Hero, Lane, Recommendation, TeamAnalysis } from '../types/rov';
import { ALL_HEROES } from '../data/allHeroes';

interface GetRecsParams {
  myPicks: (Hero | null)[];
  enemyPicks: (Hero | null)[];
  bannedHeroes: Hero[];
  targetLane: Lane | null;
}

export function calculateRecommendations({
  myPicks,
  enemyPicks,
  bannedHeroes,
  targetLane,
}: GetRecsParams): Recommendation[] {
  const activeMyPicks = myPicks.filter((h): h is Hero => h !== null);
  const activeEnemyPicks = enemyPicks.filter((h): h is Hero => h !== null);
  const bannedIds = new Set(bannedHeroes.map((h) => h.id.toLowerCase()));
  const pickedIds = new Set([...activeMyPicks, ...activeEnemyPicks].map((h) => h.id.toLowerCase()));

  // Filter available heroes
  const available = ALL_HEROES.filter(
    (h) => !bannedIds.has(h.id.toLowerCase()) && !pickedIds.has(h.id.toLowerCase())
  );

  // Check team needs
  const magicCount = activeMyPicks.filter((h) => h.damageType === 'magic').length;
  const avgSurvivability =
    activeMyPicks.length > 0
      ? activeMyPicks.reduce((acc, h) => acc + h.stats.survivability, 0) / activeMyPicks.length
      : 7;
  const totalCc = activeMyPicks.reduce((acc, h) => acc + h.stats.cc, 0);

  const results: Recommendation[] = [];

  for (const hero of available) {
    let score = 50;
    const reasons: { type: 'counter' | 'synergy' | 'team_need' | 'meta' | 'lane_fit'; text: string }[] = [];
    const counterTargets: Hero[] = [];
    const synergyAllies: Hero[] = [];

    // Lane Fit
    if (targetLane) {
      if (hero.primaryLane === targetLane) {
        score += 35;
        reasons.push({ type: 'lane_fit', text: `เหมาะกับตำแหน่ง ${targetLane.toUpperCase()} โดยตรง` });
      } else if (hero.secondaryLanes?.includes(targetLane)) {
        score += 20;
        reasons.push({ type: 'lane_fit', text: `เล่นตำแหน่ง ${targetLane.toUpperCase()} ได้ดี` });
      } else {
        score -= 45; // penalized if not suited for this lane
      }
    }

    // Counters against enemy picks
    for (const enemy of activeEnemyPicks) {
      if (hero.counters?.map((c) => c.toLowerCase()).includes(enemy.id.toLowerCase())) {
        score += 30;
        counterTargets.push(enemy);
        reasons.push({
          type: 'counter',
          text: `แก้ทาง ${enemy.nameTh} (${enemy.name}) ได้ดีมาก`,
        });
      }
      if (hero.counteredBy?.map((c) => c.toLowerCase()).includes(enemy.id.toLowerCase())) {
        score -= 25;
        reasons.push({
          type: 'counter',
          text: `ระวัง: แพ้ทาง ${enemy.nameTh} (${enemy.name})`,
        });
      }
    }

    // Synergies with ally picks
    for (const ally of activeMyPicks) {
      if (hero.synergies?.map((s) => s.toLowerCase()).includes(ally.id.toLowerCase())) {
        score += 25;
        synergyAllies.push(ally);
        reasons.push({
          type: 'synergy',
          text: `คอมโบเข้าคู่กับ ${ally.nameTh} (${ally.name})`,
        });
      }
    }

    // Team Needs: Magic Damage
    if (activeMyPicks.length >= 2 && magicCount === 0) {
      if (hero.damageType === 'magic') {
        score += 40;
        reasons.push({
          type: 'team_need',
          text: 'เติมเต็มดาเมจเวท (AP) ที่ทีมยังขาดอยู่',
        });
      } else if (hero.damageType === 'physical') {
        score -= 15;
      }
    }

    // Team Needs: Frontline / Tank
    if (activeMyPicks.length >= 2 && avgSurvivability < 6) {
      if (hero.role === 'Tank' || (hero.role === 'Warrior' && hero.stats.survivability >= 8)) {
        score += 30;
        reasons.push({
          type: 'team_need',
          text: 'เสริมความหนาแนวหน้า (Frontline) ป้องกันทีมบาง',
        });
      }
    }

    // Team Needs: Crowd Control
    if (activeMyPicks.length >= 2 && totalCc < 15 && hero.stats.cc >= 8) {
      score += 20;
      reasons.push({
        type: 'team_need',
        text: 'เพิ่มสกิลหยุดสตั๊น (Hard CC) สำหรับคุมทีมไฟต์',
      });
    }

    // Meta Tier weighting
    if (hero.tier === 'S+') {
      score += 22;
      reasons.push({ type: 'meta', text: 'ฮีโร่ Tier S+ เมต้าสูงสุดในเซิร์ฟเวอร์ไทย' });
    } else if (hero.tier === 'S') {
      score += 15;
      reasons.push({ type: 'meta', text: 'ฮีโร่ Tier S แข็งแกร่งสม่ำเสมอในทุกไฟต์' });
    } else if (hero.tier === 'A+') {
      score += 8;
    }

    // Win rate fine-tuning
    score += (hero.winRate - 50) * 1.5;

    results.push({
      hero,
      score: Math.round(score),
      reasons: reasons.slice(0, 4), // keep top reasons
      counterTargets,
      synergyAllies,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function analyzeTeamComp(
  picks: (Hero | null)[],
  enemyPicks?: (Hero | null)[]
): TeamAnalysis {
  const activePicks = picks.filter((h): h is Hero => h !== null);

  if (activePicks.length === 0) {
    return {
      physicalPct: 50,
      magicPct: 50,
      truePct: 0,
      avgCc: 0,
      avgSurvivability: 0,
      avgMobility: 0,
      avgWaveClear: 0,
      avgLateGame: 0,
      warnings: [],
      compArchetype: 'ยังไม่มีการเลือกฮีโร่',
      overallScore: 50,
    };
  }

  let physCount = 0;
  let magicCount = 0;
  let trueCount = 0;
  let sumCc = 0;
  let sumSurv = 0;
  let sumMob = 0;
  let sumWave = 0;
  let sumLate = 0;

  for (const h of activePicks) {
    if (h.damageType === 'physical') physCount += 1;
    else if (h.damageType === 'magic') magicCount += 1;
    else if (h.damageType === 'true') trueCount += 1;
    else {
      // mixed
      physCount += 0.5;
      magicCount += 0.5;
    }

    sumCc += h.stats.cc;
    sumSurv += h.stats.survivability;
    sumMob += h.stats.mobility;
    sumWave += h.stats.waveClear;
    sumLate += h.stats.lateGamePower;
  }

  const n = activePicks.length;
  const totalDmgWeight = physCount + magicCount + trueCount || 1;
  const physicalPct = Math.round((physCount / totalDmgWeight) * 100);
  const magicPct = Math.round((magicCount / totalDmgWeight) * 100);
  const truePct = Math.round((trueCount / totalDmgWeight) * 100);

  const avgCc = +(sumCc / n).toFixed(1);
  const avgSurvivability = +(sumSurv / n).toFixed(1);
  const avgMobility = +(sumMob / n).toFixed(1);
  const avgWaveClear = +(sumWave / n).toFixed(1);
  const avgLateGame = +(sumLate / n).toFixed(1);

  const warnings: TeamAnalysis['warnings'] = [];

  // Damage Balance
  if (n >= 3 && magicPct === 0 && truePct < 15) {
    warnings.push({
      level: 'danger',
      title: 'ขาดดาเมจเวท (Physical 100%)',
      description: 'ทีมไม่มีตัวทำดาเมจเวทเลย ฝ่ายตรงข้ามจะออกเกราะ Knight\'s Plate และ Shield of the Lost ได้เปรียบมหาศาล',
    });
  } else if (n >= 3 && physicalPct === 0) {
    warnings.push({
      level: 'danger',
      title: 'ขาดดาเมจกายภาพ (Magic ล้วน)',
      description: 'ทีมไม่มีตัวยิงทำดาเมจกายภาพ ฝ่ายตรงข้ามจะออก Medallion of Troy กันเวททั้งทีมและดันป้อมช้า',
    });
  } else if (n >= 3 && magicPct >= 20 && physicalPct >= 40) {
    warnings.push({
      level: 'success',
      title: 'สมดุลดาเมจยอดเยี่ยม',
      description: 'มีดาเมจผสมทั้งกายภาพและเวทมนตร์ บังคับให้ฝ่ายตรงข้ามต้องแบ่งออกไอเทมป้องกัน',
    });
  }

  // Frontline
  if (n >= 3 && avgSurvivability < 6.0) {
    warnings.push({
      level: 'danger',
      title: 'ทีมบางเกินไป ขาด Frontline',
      description: 'ไม่มีแทงค์หรือไฟต์เตอร์ตัวเปิด เสี่ยงโดนไฟต์ 5v5 สวนตายหมดทั้งทีม',
    });
  } else if (avgSurvivability >= 8.0) {
    warnings.push({
      level: 'success',
      title: 'แนวหน้าแข็งแกร่ง (High Durability)',
      description: 'มีตัวยืนค้ำไฟต์ที่อึดทนทาน เปิดวิชั่นและรับดาเมจแทนแครี่ได้ดีเยี่ยม',
    });
  }

  // Crowd Control
  if (n >= 3 && avgCc < 5.5) {
    warnings.push({
      level: 'warning',
      title: 'สกิลหยุด CC น้อย',
      description: 'ทีมมีสตั๊นน้อย เสี่ยงโดนฮีโร่คล่องตัวอย่าง Nakroth, Aoi, หรือ Liliana โฉบล้วงฟรี',
    });
  } else if (avgCc >= 7.8) {
    warnings.push({
      level: 'success',
      title: 'พลังสตั๊นคุมไฟต์สูง (Heavy CC)',
      description: 'มีสกิลล็อคและหยุดศัตรูต่อเนื่อง สามารถทำ Chain-CC สังหารเป้าหมายได้แน่นอน',
    });
  }

  // Wave clear
  if (n >= 3 && avgWaveClear < 6.2) {
    warnings.push({
      level: 'warning',
      title: 'เคลียร์เวฟช้า',
      description: 'อาจโดนกดดันดันเวฟเข้าป้อม เสียเปรียบเรื่องการคุมมังกรและดาร์คสเลเยอร์',
    });
  }

  // Enemy Counter Alerts
  if (enemyPicks && enemyPicks.length > 0) {
    const activeEnemy = enemyPicks.filter((h): h is Hero => h !== null);
    
    // Check if enemy has heavy heal (Helen, Taara)
    const hasHealers = activeEnemy.some((e) => ['helen', 'taara', 'lubu', 'biron'].includes(e.id));
    if (hasHealers) {
      warnings.push({
        level: 'info',
        title: 'คำแนะนำไอเทม: ออกตัดเลือด',
        description: 'ฝ่ายตรงข้ามมีตัวฟื้นฟูเลือดสูง เมจควรรีบออก Tome of the Reaper หรือแครี่/ไฟต์เตอร์ออก Curse of Death',
      });
    }

    // Check if enemy has high stealth (Kaine, Wukong)
    const hasStealth = activeEnemy.some((e) => ['kaine', 'wukong'].includes(e.id));
    if (hasStealth) {
      warnings.push({
        level: 'info',
        title: 'คำแนะนำไอเทม: เปิดวิชั่น',
        description: 'ฝ่ายตรงข้ามมีตัวล่องหน ซัพพอร์ตควรออกไอเทมเปิดเผยสายตา Ring of the Fiend',
      });
    }
  }

  // Archetype
  let archetype = 'Balanced Standard Comp';
  if (avgMobility >= 8.2) archetype = 'Dive & Fast Assassination (ทีมบุกล้วงเร็ว)';
  else if (avgSurvivability >= 8.2) archetype = 'Super Tank & Sustain (ทีมเน้นชนอึดทนทาน)';
  else if (avgCc >= 8.0) archetype = 'Wombocombo Chain-CC (ทีมคอมโบสตั๊นหมู่)';
  else if (avgLateGame >= 8.5) archetype = 'Late Game Hypercarry (ทีมหวังผลเลทเกม)';

  // Overall Score
  let score = 65;
  if (magicPct >= 20 && physicalPct >= 35) score += 10;
  if (avgSurvivability >= 6.5) score += 10;
  if (avgCc >= 6.5) score += 8;
  if (avgWaveClear >= 7.0) score += 7;
  score = Math.min(99, Math.max(40, score));

  return {
    physicalPct,
    magicPct,
    truePct,
    avgCc,
    avgSurvivability,
    avgMobility,
    avgWaveClear,
    avgLateGame,
    warnings,
    compArchetype: archetype,
    overallScore: score,
  };
}

export function compareLaneMatchup(
  blueHero: Hero | null,
  redHero: Hero | null,
  lane: Lane
): {
  winner: 'blue' | 'red' | 'even';
  advantageScore: number; // -100 to +100 (positive favors blue)
  notesTh: string;
} {
  if (!blueHero || !redHero) {
    return {
      winner: 'even',
      advantageScore: 0,
      notesTh: 'เลือกฮีโร่ทั้งสองฝั่งเพื่อวิเคราะห์การดวลในเลน',
    };
  }

  let score = 0;

  // Check direct counter
  if (blueHero.counters?.map((c) => c.toLowerCase()).includes(redHero.id.toLowerCase())) {
    score += 40;
  }
  if (blueHero.counteredBy?.map((c) => c.toLowerCase()).includes(redHero.id.toLowerCase())) {
    score -= 40;
  }
  if (redHero.counters?.map((c) => c.toLowerCase()).includes(blueHero.id.toLowerCase())) {
    score -= 40;
  }
  if (redHero.counteredBy?.map((c) => c.toLowerCase()).includes(blueHero.id.toLowerCase())) {
    score += 40;
  }

  // Compare stats according to lane
  if (lane === 'dsl') {
    score += (blueHero.stats.survivability - redHero.stats.survivability) * 3;
    score += (blueHero.stats.burst - redHero.stats.burst) * 2;
  } else if (lane === 'jg') {
    score += (blueHero.stats.mobility - redHero.stats.mobility) * 4;
    score += (blueHero.stats.burst - redHero.stats.burst) * 3;
  } else if (lane === 'mid') {
    score += (blueHero.stats.waveClear - redHero.stats.waveClear) * 4;
    score += (blueHero.stats.cc - redHero.stats.cc) * 2;
  } else if (lane === 'adl') {
    score += (blueHero.stats.lateGamePower - redHero.stats.lateGamePower) * 3;
    score += (blueHero.stats.burst - redHero.stats.burst) * 2;
  } else if (lane === 'sp') {
    score += (blueHero.stats.cc - redHero.stats.cc) * 4;
    score += (blueHero.stats.survivability - redHero.stats.survivability) * 3;
  }

  // Meta tier bonus
  const tierValue: Record<string, number> = { 'S+': 10, S: 6, 'A+': 3, A: 0, B: -4 };
  score += (tierValue[blueHero.tier] || 0) - (tierValue[redHero.tier] || 0);

  const clamped = Math.min(100, Math.max(-100, score));

  let winner: 'blue' | 'red' | 'even' = 'even';
  let notesTh = '';

  if (clamped >= 20) {
    winner = 'blue';
    notesTh = `${blueHero.nameTh} (${blueHero.name}) ได้เปรียบในเลนอย่างชัดเจน สามารถกดดันและชิงจังหวะเดินเกมได้เหนือกว่า`;
  } else if (clamped <= -20) {
    winner = 'red';
    notesTh = `${redHero.nameTh} (${redHero.name}) ถือความได้เปรียบในเลน แนะนำให้ฝั่ง ${blueHero.nameTh} เล่นปลอดภัยรอเพื่อนช่วยแก๊งค์`;
  } else {
    winner = 'even';
    notesTh = `การจับคู่สูสี เป็นศึกวัดฝีมือและจังหวะการเดินเกมของผู้เล่นทั้งสองฝั่ง`;
  }

  return { winner, advantageScore: clamped, notesTh };
}
