import {
  matchTargetFacts,
  SPHEREX_MISSION_FACTS,
  BEGINNER_TERMS_MAP,
} from './targetFacts';

export type SpexExplainLevel = 'kid' | 'beginner' | 'scientist';

export interface SpexNearbySource {
  id: string;
  catalog: string;
  magnitude?: string | number | null;
  distanceArcsec: number;
  x?: number;
  y?: number;
}

export interface SpexSpotSelection {
  x: number;
  y: number;
  ra?: number | null;
  dec?: number | null;
  fluxMjySr?: number | null;
  snr?: number | null;
  flagsBitmask?: number;
  flagsPlain?: string[];
  isNearTarget?: boolean;
  isNearPredicted?: boolean;
  nearbySources?: SpexNearbySource[];
}

export interface SpexExplainContext {
  targetName?: string;
  caseId?: string;
  frameWidth?: number;
  frameHeight?: number;
  frameIndex?: number;
  totalFrames?: number;
  dateObs?: string;
  detector?: string;
  wavelengthUm?: number;
  release?: string;
  dataSourceType?: 'live' | 'snapshot' | 'cached' | 'demo';
  snapshotDate?: string;
  renderMode?: string;
  targetPixel?: { x: number; y: number } | null;
  predictedPixel?: { x: number; y: number } | null;
  measuredCentroidPixel?: { x: number; y: number } | null;
  motionSummary?: {
    measuredDxArcsec?: number;
    measuredDyArcsec?: number;
    measuredTotalArcsec?: number;
    measuredErrorArcsec?: number;
    expectedTotalArcsec?: number;
    sigma?: number;
    motionSignificant?: boolean;
    motionVerdict?: string;
    targetDetectedInDetector?: boolean;
    wingFitUsed?: boolean;
    saturatedAllDetectors?: boolean;
    errorBudgetLabel?: string;
  } | null;
  nearestCatalogSources?: SpexNearbySource[];
}

export interface SpexHighlight {
  x: number;
  y: number;
  r: number;
  label: string;
}

export interface SpexExplainRequest {
  language?: 'en' | 'ar';
  level?: SpexExplainLevel;
  question?: string;
  selection?: SpexSpotSelection | null;
  context?: SpexExplainContext | null;
}

export interface SpexExplainResponse {
  answer: string;
  highlights: SpexHighlight[];
  followUps: string[];
  terms: string[];
  offlineMode?: boolean;
  modeLabel?: string;
  engine?: 'gemini' | 'offline_fallback' | 'cache';
}

export function decodeFlagsPlainWords(bitmask: number | undefined, language: 'en' | 'ar'): string[] {
  const mask = Number(bitmask ?? 0);
  if (!Number.isFinite(mask) || mask === 0) {
    return [language === 'ar' ? 'بكسل سليم بدون تحذيرات' : 'Clean pixel (no bad-pixel warnings)'];
  }
  const msgs: string[] = [];
  if (mask & 0x01) {
    msgs.push(language === 'ar' ? 'ضربة أشعة كونية عابرة (0x01)' : 'Cosmic ray / transient glitch (0x01)');
  }
  if (mask & 0x02) {
    msgs.push(language === 'ar' ? 'ساطع جداً وأشبع الكاشف (0x02)' : 'Too bright — saturated detector pixel (0x02)');
  }
  if (mask & 0x04) {
    msgs.push(language === 'ar' ? 'استجابة غير خطية للمستشعر (0x04)' : 'Non-linear detector response (0x04)');
  }
  if (mask & 0x10) {
    msgs.push(language === 'ar' ? 'بكسل لا يعمل في الكاشف (0x10)' : 'Non-functional detector pixel (0x10)');
  }
  if (mask & 0x20) {
    msgs.push(language === 'ar' ? 'بقعة ظل أو تداخل ضوئي (0x20)' : 'Persistence / ghost artifact (0x20)');
  }
  if (mask & 0x80000) {
    msgs.push(language === 'ar' ? 'قيمة شاذة إحصائياً (0x80000)' : 'Statistical outlier pixel (0x80000)');
  }
  if (msgs.length === 0) {
    msgs.push(
      language === 'ar'
        ? `تحذير جودة رقمي (0x${mask.toString(16).toUpperCase()})`
        : `Data-quality warning (0x${mask.toString(16).toUpperCase()})`
    );
  }
  return msgs;
}

export function clampHighlights(
  highlights: unknown,
  width = 64,
  height = 64,
  defaultLabel = 'SPEX points here'
): SpexHighlight[] {
  if (!Array.isArray(highlights)) return [];
  const valid: SpexHighlight[] = [];
  for (const h of highlights) {
    if (!h || typeof h !== 'object') continue;
    const x = Number((h as any).x);
    const y = Number((h as any).y);
    const r = Number((h as any).r);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    valid.push({
      x: Math.max(0, Math.min(width - 1, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(height - 1, Number(y.toFixed(2)))),
      r: Number.isFinite(r) ? Math.max(1.5, Math.min(12, Number(r.toFixed(2)))) : 3.2,
      label: typeof (h as any).label === 'string' && (h as any).label.trim()
        ? (h as any).label.trim().slice(0, 48)
        : defaultLabel,
    });
    if (valid.length >= 4) break;
  }
  return valid;
}

export function buildSpexSystemInstruction(
  language: 'en' | 'ar',
  level: SpexExplainLevel,
  context: SpexExplainContext | null | undefined
): string {
  const matchedFact = matchTargetFacts(context?.caseId || context?.targetName);
  const factsBlock = [
    ...(language === 'ar' ? SPHEREX_MISSION_FACTS.factsAr : SPHEREX_MISSION_FACTS.factsEn),
    ...(matchedFact ? (language === 'ar' ? matchedFact.factsAr : matchedFact.factsEn) : []),
  ];

  const levelTone =
    level === 'kid'
      ? 'Explain like talking to a curious 10-year-old using super simple words.'
      : level === 'scientist'
      ? 'Keep it crisp and accurate while still staying readable and clear.'
      : 'Explain for a curious beginner with zero astronomy background.';

  const langRule =
    language === 'ar'
      ? 'Write in simple, friendly everyday Arabic (أسلوب عربي بسيط وواضح بدون تعقيد لغوي). Include the suggested follow-up in simple Arabic too.'
      : 'Write in clear, warm plain English.';

  return `You are SPEX, the guide for NASA SPHEREx "The Changing Sky".
STRICT GROUNDING RULES:
1. Use ONLY the facts present in the provided JSON context, selection, and verified target facts below.
2. NEVER invent numbers, coordinates, magnitudes, star IDs, or scientific claims.
3. If the user asks about something not present in the context or verified facts, say "${language === 'ar' ? 'لست متأكداً' : "I'm not sure"}" honestly.
4. Structure your "answer": 3 to 5 short sentences total, include ONE everyday analogy, and end with ONE short follow-up suggestion.
5. ${levelTone}
6. ${langRule}
7. Only place "highlights" at valid pixel coordinates (0..${(context?.frameWidth || 64) - 1}) taken directly from selection, targetPixel, predictedPixel, measuredCentroidPixel, or catalog sources in context. Leave highlights as [] if no specific pixel applies.
8. For "terms", choose relevant keys strictly from: ${BEGINNER_TERMS_MAP.map((t) => t.key).join(', ')}.

VERIFIED FACTS FOR THIS SESSION:
${factsBlock.map((f, i) => `- (${i + 1}) ${f}`).join('\n')}`;
}

export function buildOfflineSpexExplain(req: SpexExplainRequest): SpexExplainResponse {
  const language: 'en' | 'ar' = req.language === 'ar' ? 'ar' : 'en';
  const level: SpexExplainLevel =
    req.level === 'kid' || req.level === 'scientist' ? req.level : 'beginner';
  const question = (req.question || '').trim();
  const qLower = question.toLowerCase();
  const sel = req.selection || null;
  const ctx = req.context || {};
  const w = ctx.frameWidth || 64;
  const h = ctx.frameHeight || 64;
  const matchedFact = matchTargetFacts(ctx.caseId || ctx.targetName);
  const targetLabel =
    ctx.targetName || (language === 'ar' ? matchedFact?.nameAr : matchedFact?.nameEn) || (language === 'ar' ? 'هذا الجزء من السماء' : 'this sky patch');

  const isAr = language === 'ar';
  const defaultPointLabel = isAr ? 'سبيكس يشير هنا' : 'SPEX points here';

  const highlights: SpexHighlight[] = [];
  if (sel && Number.isFinite(sel.x) && Number.isFinite(sel.y)) {
    highlights.push({
      x: Math.max(0, Math.min(w - 1, sel.x)),
      y: Math.max(0, Math.min(h - 1, sel.y)),
      r: 3.4,
      label: defaultPointLabel,
    });
  } else if (ctx.predictedPixel && Number.isFinite(ctx.predictedPixel.x) && Number.isFinite(ctx.predictedPixel.y)) {
    highlights.push({
      x: Math.max(0, Math.min(w - 1, ctx.predictedPixel.x)),
      y: Math.max(0, Math.min(h - 1, ctx.predictedPixel.y)),
      r: 3.6,
      label: isAr ? 'موقع الهدف هنا' : 'Target spot',
    });
  } else if (ctx.targetPixel && Number.isFinite(ctx.targetPixel.x) && Number.isFinite(ctx.targetPixel.y)) {
    highlights.push({
      x: Math.max(0, Math.min(w - 1, ctx.targetPixel.x)),
      y: Math.max(0, Math.min(h - 1, ctx.targetPixel.y)),
      r: 3.6,
      label: isAr ? 'موقع الهدف هنا' : 'Target spot',
    });
  }

  const terms = new Set<string>();
  const motion = ctx.motionSummary;

  const followUps = isAr
    ? [
        'هل هذا الجرم يتحرك فعلاً؟',
        'ماذا يعني "مدى تأكدنا"؟',
        'اشرح لي كأن عمري 10 سنوات',
      ]
    : [
        'Is it really moving?',
        "What does 'how sure' mean?",
        "Explain like I'm 10",
      ];

  let answer = '';

  // 1. Spot selection / "what is this spot"
  if (sel && (qLower.includes('spot') || qLower.includes('this') || qLower.includes('pixel') || qLower.includes('بقعة') || qLower.includes('هذا') || !question)) {
    const flags = sel.flagsBitmask ?? 0;
    const hasGlitch = (flags & (0x01 | 0x02 | 0x04 | 0x10 | 0x20 | 0x80000)) !== 0;
    const nearest = sel.nearbySources?.[0];
    const snrStr = sel.snr != null && Number.isFinite(sel.snr) ? sel.snr.toFixed(1) : null;
    const fluxStr = sel.fluxMjySr != null && Number.isFinite(sel.fluxMjySr) ? sel.fluxMjySr.toFixed(2) : null;

    if (hasGlitch) {
      terms.add('dq_flags');
      if (flags & 0x02) terms.add('saturated');
      const flagText = (sel.flagsPlain && sel.flagsPlain.length > 0 ? sel.flagsPlain : decodeFlagsPlainWords(flags, language)).join(', ');
      answer = isAr
        ? `هذه البقعة عند (${sel.x.toFixed(1)}, ${sel.y.toFixed(1)}) عليها تحذير جودة: ${flagText}. ${flags & 0x02 ? 'الضوء كان قوياً جداً فامتلأ البكسل مثل كوب ماء فاض.' : 'قد يكون أثراً في الكاميرا وليس ضوءاً صافياً.'} ${fluxStr ? `الشدة المسجلة ${fluxStr} MJy/sr.` : ''} جرب الضغط على "اعرض ما تغير" لترى بقية الإطارات.`
        : `This spot at (${sel.x.toFixed(1)}, ${sel.y.toFixed(1)}) carries a bad-pixel warning: ${flagText}. ${flags & 0x02 ? 'So much infrared light hit this pixel that it overflowed, like a rain gauge spilling over in a heavy storm.' : 'Think of it like a tiny speck of dust on a camera lens rather than a steady star.'} ${fluxStr ? `Measured brightness here is ${fluxStr} MJy/sr${snrStr ? ` (S/N ${snrStr})` : ''}.` : ''} Try pressing "Show what changed" to see if it vanishes across dates.`;
    } else if (sel.isNearTarget || sel.isNearPredicted) {
      terms.add('proper_motion');
      terms.add('epoch');
      const factLine = matchedFact
        ? isAr
          ? matchedFact.factsAr[0]
          : matchedFact.factsEn[0]
        : isAr
        ? `أنت تشير إلى الهدف الرئيسي ${targetLabel}.`
        : `You tapped right on our main target, ${targetLabel}.`;
      const analogy = matchedFact
        ? isAr
          ? matchedFact.analogyAr
          : matchedFact.analogyEn
        : isAr
        ? 'مثل مصباح تنظر إليه في أوقات مختلفة لترى هل تحرك أم تغير سطوعه.'
        : 'Think of taking photos of a runner at different seconds to track where they go.';
      answer = isAr
        ? `${factLine} ${sel.isNearPredicted && !sel.isNearTarget ? 'الدائرة تشير إلى الموضع المتوقع لهذا الجرم.' : ''} ${snrStr ? `قوة الإشارة هنا حوالي ${snrStr}.` : ''} ${analogy} هل تريد أن تعرف هل يتحرك فعلاً عبر الزمن؟`
        : `${factLine} ${sel.isNearPredicted && !sel.isNearTarget ? 'This marks the predicted spot where the object should be on this date.' : ''} ${snrStr ? `The local signal-to-noise here is ${snrStr}.` : ''} ${analogy} Would you like to ask whether it is really moving?`;
    } else if (nearest) {
      answer = isAr
        ? `أنت تشير إلى جرم مسجل في فهرس ${nearest.catalog} (${nearest.id}) يبعد نحو ${nearest.distanceArcsec.toFixed(1)} ثانية قوسية${nearest.magnitude != null ? ` بلمعان ${nearest.magnitude}` : ''}. إنه أحد جيران الحقل الفلكي الذين نستخدمهم كنقاط ثابتة في الخلفية، مثل علامات الطرق الثابتة التي نقيس بها حركة السيارات. جرب النقر على الهدف في المركز لمقارنته!`
        : `You tapped near a known catalog source: ${nearest.id} in ${nearest.catalog} (${nearest.distanceArcsec.toFixed(1)} arcsec away${nearest.magnitude != null ? `, mag ${nearest.magnitude}` : ''}). Background catalog stars act like fixed mileposts along a highway so astronomers can check if anything nearby shifted. Next, try tapping the target near the center!`;
    } else {
      answer = isAr
        ? `هذه بقعة هادئة من السماء عند الإحداثيات (${sel.x.toFixed(1)}, ${sel.y.toFixed(1)})${snrStr ? ` بقوة إشارة ${snrStr}` : ''}. في هذا البكسل لا يوجد نجم معروف قريب جداً في كتالوجات جايا أو وايز، وهو يشبه الفضاء الداكن بين أضواء الشوارع البعيدة. جرب الضغط على النقطة المضيئة قرب المركز لتفحص ${targetLabel}.`
        : `This is a quiet patch of sky at pixel (${sel.x.toFixed(1)}, ${sel.y.toFixed(1)})${snrStr ? ` (S/N ${snrStr})` : ''}. No bright Gaia DR3 or AllWISE neighbor sits right on this spot—it is dark sky between distant stars, like the dark grass between streetlights at night. Try tapping a bright glowing dot or pressing "Play the sky"!`;
    }
  }
  // 2. Button questions / blinking / show what changed
  else if (qLower.includes('blink') || qLower.includes('play') || qLower.includes('button') || qLower.includes('يومض') || qLower.includes('شغل') || qLower.includes('زر') || qLower.includes('تغير')) {
    terms.add('epoch');
    terms.add('image_subtraction');
    answer = isAr
      ? `كل إطار في المشغل هو صورة حقيقية التقطها تلسكوب سبيراكس في تاريخ مختلف، لذا فالتشغيل السريع يشبه تقليب صفحات دفتر رسوم متحركة لترى النجوم وهي تقفز أو تومض. زر "اعرض ما تغير" يطرح الإطار الأول من الإطار الحالي لتختفي النجوم الثابتة ويبرز التغير. هل تحب أن تفحص هل الحركة مؤكدة هنا؟`
      : `Each frame is a real infrared snapshot taken by SPHEREx on a different date, so pressing "Play the sky" works like flipping a flipbook to spot objects drifting or pulsing. "Show what changed" subtracts the first frame so steady stars fade away and changes stand out. Next, ask "Is it really moving?" to check the numbers!`;
  }
  // 3. Sigma / "how sure" / error bars
  else if (qLower.includes('sure') || qLower.includes('sigma') || qLower.includes('noise') || qLower.includes('error') || qLower.includes('تأكد') || qLower.includes('سيجما') || qLower.includes('ضوضاء') || qLower.includes('خطأ')) {
    terms.add('sigma');
    const sigStr = motion?.sigma != null ? motion.sigma.toFixed(2) : null;
    const errStr = motion?.measuredErrorArcsec != null ? motion.measuredErrorArcsec.toFixed(2) : null;
    answer = isAr
      ? `"مدى تأكدنا" (سيجما) يقيس حجم التغير مقارنة بهامش الخطأ العشوائي في الكاميرا. ${sigStr ? `لهذا الهدف الدرجة الحالية هي ${sigStr} سيجما` : 'نحتاج عادة إلى 3 سيجما على الأقل'}${errStr ? ` مع هامش خطأ ± ${errStr} ثانية قوسية` : ''}. تخيل أنك تقيس طول نبتة بمسطرة تهتز قليلاً: لا تؤكد أنها نمت إلا إذا كبرت أكثر من ثلاث مرات قدر اهتزاز المسطرة! جرب النقر على مصطلح سيجما في القاموس لمثال آخر.`
      : `"How sure we are" (sigma) compares how big a measured shift is against the random wobble in our measurement. ${sigStr ? `Right now ${targetLabel} is at ${sigStr} sigma` : 'Scientists wait for at least 3 sigma'}${errStr ? ` with an uncertainty of ±${errStr} arcsec` : ''}. It is like measuring if a plant grew using a slightly shaky ruler—you only trust it grew once the change is more than three times the ruler's wobble. Try tapping "Is it really moving?" next!`;
  }
  // 4. Motion question / "Is it really moving?"
  else if (qLower.includes('mov') || qLower.includes('drift') || qLower.includes('يتحرك') || qLower.includes('حركة')) {
    terms.add('proper_motion');
    terms.add('sigma');
    if (motion?.wingFitUsed) terms.add('wing_fit');
    const dispStr = motion?.measuredTotalArcsec != null ? motion.measuredTotalArcsec.toFixed(2) : null;
    const errStr = motion?.measuredErrorArcsec != null ? motion.measuredErrorArcsec.toFixed(2) : null;
    const sigStr = motion?.sigma != null ? motion.sigma.toFixed(1) : null;
    if (motion?.motionSignificant) {
      answer = isAr
        ? `نعم، سبيكس يظهر هنا حركة حقيقية! ${dispStr && errStr ? `الإزاحة المقاسة ${dispStr} ± ${errStr} ثانية قوسية (${sigStr} سيجما).` : ''} ${matchedFact ? matchedFact.analogyAr : 'يتحرك مثل سيارة تمر أمام جبال ثابتة بعيدة.'} ${motion.wingFitUsed ? 'تنبيه علمي صادق: بعض الإطارات استخدمت قياس الهالة الخارجية بسبب السطوع العالي.' : ''} جرب زر "اعرض ما تغير" لترى الفارق بنفسك.`
        : `Yes, the data shows a real shift across dates! ${dispStr && errStr ? `Measured motion is ${dispStr} ± ${errStr} arcsec (${sigStr} sigma).` : ''} ${matchedFact ? matchedFact.analogyEn : 'Like a boat gliding past distant harbor lights.'} ${motion.wingFitUsed ? 'Note: because the star core is bright, some frames estimate position from the outer glow (lower confidence).' : ''} Try pressing "Show what changed" to compare the first and later frames!`;
    } else {
      answer = isAr
        ? `حتى الآن لم تثبت البيانات حركة أكيدة هنا${sigStr ? ` (${sigStr} سيجما، أقل من 3 سيجما)` : ''}${dispStr && errStr ? `، والقياس ${dispStr} ± ${errStr} ثانية قوسية` : ''}. ${matchedFact ? matchedFact.analogyAr : 'الأمر مثل مراقبة شخص يمشي من بعيد في ضباب خفيف: الخطوة أصغر من ضوضاء الصورة الواحدة.'} نعرض لذلك الموضع المتوقع بكل أمانة. جرب اختيار نجم بارنارد أو إبسيلون إندي B للمقارنة!`
        : `Not proven in these frames yet—the measured shift is below our 3-sigma rule${sigStr ? ` (${sigStr} sigma` : ''}${dispStr && errStr ? `, ${dispStr} ± ${errStr} arcsec` : ''}${sigStr ? ')' : ''}. ${matchedFact ? matchedFact.analogyEn : 'Like spotting tiny footsteps in soft sand during wind—noise can hide small steps.'} That is why we honestly track the predicted spot here. Next, try checking Epsilon Indi B or RW Aurigae to compare!`;
    }
  }
  // 5. General / fallback / "Explain like I'm 10"
  else {
    terms.add('epoch');
    if (matchedFact) {
      const f1 = isAr ? matchedFact.factsAr[0] : matchedFact.factsEn[0];
      const f2 = isAr ? (matchedFact.factsAr[1] || '') : (matchedFact.factsEn[1] || '');
      const ana = isAr ? matchedFact.analogyAr : matchedFact.analogyEn;
      answer = level === 'kid'
        ? (isAr
            ? `أهلاً يا مستكشف الفضاء! ${f1} ${ana} تلسكوب سبيكس التقط صوراً حرارية له في تواريخ مختلفة ليرى هل يغير مكانه أو سطوعه. اضغط "شغّل السماء" وشاهد النقطة المضيئة!`
            : `Hey space explorer! ${f1} ${ana} NASA's SPHEREx telescope took heat-vision photos on different dates to watch what changes. Press "Play the sky" and see what happens!`)
        : (isAr
            ? `${f1} ${f2} ${ana} هذا العرض يعرض صوراً حقيقية من مهمة SPHEREx في أوقات مختلفة. جرب النقر على أي نقطة في الصورة لأشرحها لك!`
            : `${f1} ${f2} ${ana} You are viewing real SPHEREx infrared exposures taken across different dates. Tap any spot on the sky image to inspect what is there!`);
    } else {
      answer = isAr
        ? `أنت تنظر إلى رقعة حقيقية من السماء في الأشعة تحت الحمراء من تلسكوب SPHEREx. ${ctx.detector ? `البيانات من الكاشف ${ctx.detector}.` : ''} تخيل أنك تنظر بنظارة حرارية ترى الدفء الخفي بدلاً من الضوء العادي. اضغط على أي نقطة في الصورة أو اسألني "هل هذا الجرم يتحرك فعلاً؟"`
        : `You are looking at a real infrared sky patch observed by NASA's SPHEREx space telescope${ctx.detector ? ` on detector ${ctx.detector}` : ''}. Think of infrared light like heat-vision goggles that reveal cool worlds invisible to regular eyes. Tap any bright dot in the image or ask "Is it really moving?" to investigate!`;
    }
  }

  // Grounded "not sure" guard if user asks something wildly outside astronomy/context
  const outOfScopeHints = ['recipe', 'weather tomorrow', 'stock price', 'who won', 'password', 'طقس الغد', 'وصفة'];
  if (outOfScopeHints.some((k) => qLower.includes(k))) {
    answer = isAr
      ? `لست متأكداً — أنا هنا فقط لشرح بيانات سبيراكس الظاهرة أمامك الآن لـ ${targetLabel}. يمكنك سؤالي عن أي نقطة تضغط عليها في الصورة أو عن الحركة والسطوع. جرب الضغط على "هل هذا الجرم يتحرك فعلاً؟"`
      : `I'm not sure — I can only answer using the real SPHEREx sky data loaded for ${targetLabel}. Think of me like a museum guide who only knows the exhibit right in front of us. Try tapping a spot on the image or asking "Is it really moving?"`;
  }

  return {
    answer,
    highlights,
    followUps,
    terms: Array.from(terms).slice(0, 4),
    offlineMode: true,
    modeLabel: isAr ? 'سبيكس في الوضع غير المتصل' : 'SPEX offline mode',
    engine: 'offline_fallback',
  };
}
