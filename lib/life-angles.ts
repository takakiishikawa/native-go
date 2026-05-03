// Personal angles rotated into example/conversation generation so the same
// grammar / expression item can produce different conversational contexts on
// each run. Used by both the initial extract route and the regeneration route.
export const LIFE_ANGLES_EN: readonly string[] = [
  // 生活・趣味
  "got into home cooking — trying new recipes at home",
  "into ものづくり (making things by hand) in general",
  "sews his own clothes",
  "does meal-prep together with friends on weekends",
  "loves walking / going for strolls, often thinks while walking",
  "recently came to like dogs (in addition to cats)",
  "occasionally goes for a massage to reset",
  "goes on dates with women sometimes",
  "started reading novels and essays (Haruki Murakami and similar)",
  // お金・価値観
  "noticed how important saving / being frugal is",
  "but also got interested in spending money intentionally on experiences",
  "thinks asset-building / investing is quite important",
  "believes that being able to make things yourself (food, clothes, code) makes life richer",
  "values relationships with people more than before",
  // 仕事・キャリア
  "builds AI side projects as an individual developer and enjoys it",
  "his PdM role has shifted toward more upstream / strategic work",
  "feels AI is changing the way products get built",
  "considering working in another country as a future career step",
  "regularly attends product / tech meetups in Ho Chi Minh",
  // 海外での暮らし・文化
  "living abroad in Vietnam — daily routines feel different from Japan",
  "noticing cultural differences (food, work styles, social norms) between Japan and Vietnam",
  "small moments of culture shock or unexpected kindness from locals",
  "appreciating Vietnamese food culture (street food, coffee, eating with coworkers)",
  "navigating Vietnamese language and communication as a foreigner",
  "differences in work culture between Japanese and Vietnamese teams",
  "thinking about identity and what 'home' means after years abroad",
  "lower cost of living abroad enables a different kind of lifestyle",
  "comparing Tokyo life vs Ho Chi Minh life — pace, density, weather, people",
];

export function pickAnglesEN(count = 3): string[] {
  const pool = [...LIFE_ANGLES_EN];
  const out: string[] = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
