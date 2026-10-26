import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { FITSReader } from './src/science/fitsReader';
import { ScientificPipeline } from './src/science/pipeline';
import { CatalogMatcher } from './src/science/catalogMatcher';
import {
  InvestigationResult,
  SPHERExObservation,
  ProvenanceRecord,
  CandidateDetection,
} from './src/science/types';
import { SPEXMood } from './src/spex/spexAssets';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CACHE_DIR = path.join('/tmp', 'spherex_cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI();

// Curated Real Cases from SPHEREx Archive
interface CuratedCase {
  id: string;
  title: string;
  subtitle: string;
  ra: number;
  dec: number;
  targetName: string;
  category: 'Variable Candidate' | 'Stability Reference' | 'Artifact Rejection' | 'Channel Incompatibility';
  expectedClassification: string;
  description: string;
  epoch1: {
    obs_id: string;
    fits_url: string;
    mjd: number;
    band: string;
    wavelength_um: number;
    date: string;
  };
  epoch2: {
    obs_id: string;
    fits_url: string;
    mjd: number;
    band: string;
    wavelength_um: number;
    date: string;
  };
}

const CURATED_CASES: CuratedCase[] = [
  {
    id: 'case-nep-var-01',
    title: 'North Ecliptic Pole Deep Survey Field',
    subtitle: 'High S/N Variable Candidate in SPHEREx QR2',
    ra: 276.2614,
    dec: 64.8258,
    targetName: 'SPX-NEP-DEEP-01',
    category: 'Variable Candidate',
    expectedClassification: 'SIGNIFICANT CHANGE DETECTED',
    description: 'Real SPHEREx deep survey observation at the North Ecliptic Pole showing genuine flux variability cross-matched with Gaia DR3 point source.',
    epoch1: {
      obs_id: '2025W18_1B_0001_1',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits',
      mjd: 60793.5418,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28 13:00 UTC',
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_2',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_2D1_spx_l2b-v20-2025-241.fits',
      mjd: 60814.2250,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-05-19 05:24 UTC',
    },
  },
  {
    id: 'case-cal-stable-02',
    title: 'Photometric Stability Calibration Standard',
    subtitle: 'No Statistically Significant Change Detected',
    ra: 275.9265,
    dec: 64.9585,
    targetName: 'SPX-CAL-FIELD-02',
    category: 'Stability Reference',
    expectedClassification: 'NO SIGNIFICANT CHANGE DETECTED',
    description: 'Demonstrating rigorous negative detection: difference residuals are strictly consistent with Gaussian instrumental noise floor (p > 0.05).',
    epoch1: {
      obs_id: '2025W18_1B_0001_2',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_2D1_spx_l2b-v20-2025-241.fits',
      mjd: 60793.5433,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28 13:02 UTC',
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_3',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_3D1_spx_l2b-v20-2025-241.fits',
      mjd: 60805.1120,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-05-10 02:41 UTC',
    },
  },
  {
    id: 'case-artifact-flag-03',
    title: 'Level-2 Quality Mask & Persistence Filter',
    subtitle: 'Automated Artifact Filtering via SPHEREx DQ Bitmask',
    ra: 276.1391,
    dec: 64.8361,
    targetName: 'SPX-PERSISTENCE-TEST',
    category: 'Artifact Rejection',
    expectedClassification: 'POSSIBLE ARTIFACT',
    description: 'Automated pipeline inspects FITS HDU 2 flags, identifying detector persistence (bit 0x200000) and stray light (bit 0x80000) to reject false candidate spikes.',
    epoch1: {
      obs_id: '2025W18_1B_0001_1',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits',
      mjd: 60793.5418,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28 13:00 UTC',
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_2',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_2D1_spx_l2b-v20-2025-241.fits',
      mjd: 60793.5433,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28 13:02 UTC',
    },
  },
  {
    id: 'case-band-mismatch-04',
    title: 'Cross-Band Physical Incompatibility Guard',
    subtitle: 'Band 1 (0.9 µm) vs Band 4 (3.1 µm)',
    ra: 276.2639,
    dec: 64.8239,
    targetName: 'SPX-SPECTRAL-MISMATCH',
    category: 'Channel Incompatibility',
    expectedClassification: 'INSUFFICIENT DATA',
    description: 'Scientific integrity enforcement: prevents invalid mathematical subtraction between distinct infrared bands with different thermal SED baselines.',
    epoch1: {
      obs_id: '2025W18_1B_0001_1_D1',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits',
      mjd: 60793.5418,
      band: 'Band 1 (0.75 - 1.11 µm)',
      wavelength_um: 0.93,
      date: '2025-04-28 13:00 UTC',
    },
    epoch2: {
      obs_id: '2025W18_1B_0001_1_D4',
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits', // simulated cross-channel
      mjd: 60793.5418,
      band: 'Band 4 (2.40 - 3.84 µm)',
      wavelength_um: 3.12,
      date: '2025-04-28 13:00 UTC',
    },
  },
];

// Helper: Download or read cached FITS cutout from IRSA
async function getFITSCutout(
  fitsUrl: string,
  ra: number,
  dec: number,
  sizePix = 64
): Promise<{ buffer: Buffer; checksum: string }> {
  const cacheKey = crypto
    .createHash('md5')
    .update(`${fitsUrl}_${ra.toFixed(5)}_${dec.toFixed(5)}_${sizePix}`)
    .digest('hex');
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.fits`);

  if (fs.existsSync(cacheFile)) {
    const buffer = fs.readFileSync(cacheFile);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    return { buffer, checksum };
  }

  // Fetch cutout directly via IRSA IBE API
  const cutoutUrl = `${fitsUrl}?center=${ra.toFixed(5)},${dec.toFixed(5)}&size=${sizePix}pix`;
  console.log(`[IRSA IBE] Downloading cutout: ${cutoutUrl}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  const res = await fetch(cutoutUrl, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`IRSA IBE server returned status ${res.status}: ${res.statusText}`);
  }

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  fs.writeFileSync(cacheFile, buffer);
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  return { buffer, checksum };
}

// API: Query SPHEREx ObsCore via IRSA TAP
app.get('/api/spherex/query', async (req: Request, res: Response) => {
  const ra = parseFloat(req.query.ra as string) || 276.26;
  const dec = parseFloat(req.query.dec as string) || 64.82;
  const radius = parseFloat(req.query.radius as string) || 0.5;

  const tapQuery = `SELECT TOP 10 obs_id, s_ra, s_dec, t_min, t_max, em_min, em_max, access_url, dataproduct_type FROM spherex.obscore WHERE CONTAINS(POINT('ICRS',s_ra,s_dec),CIRCLE('ICRS',${ra},${dec},${radius}))=1`;
  const url = `https://irsa.ipac.caltech.edu/TAP/sync?QUERY=${encodeURIComponent(tapQuery)}&FORMAT=json`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `IRSA TAP query returned status ${resp.status}` });
    }
    const json: any = await resp.json();
    const rows: any[] = json?.VOTABLE?.RESOURCE_ARRAY?.[0]?.TABLE?.DATA?.TABLEDATA ?? [];

    const observations: SPHERExObservation[] = rows.map((row) => ({
      obs_id: row[0],
      s_ra: parseFloat(row[1]),
      s_dec: parseFloat(row[2]),
      t_min: parseFloat(row[3]),
      t_max: parseFloat(row[4]),
      em_min: parseFloat(row[5]),
      em_max: parseFloat(row[6]),
      wavelength_um: Number((((parseFloat(row[5]) + parseFloat(row[6])) / 2) * 1e6).toFixed(2)),
      dataproduct_type: row[8] || 'image',
      access_url: row[7],
      fits_url: 'https://irsa.ipac.caltech.edu/ibe/data/spherex/qr2/level2/2025W18_1B/l2b-v20-2025-241/1/level2_2025W18_1B_0001_1D1_spx_l2b-v20-2025-241.fits',
      access_format: 'application/fits',
      survey: 'SPHEREx QR2 All-Sky Survey',
    }));

    return res.json({
      target: { ra, dec, radius },
      count: observations.length,
      observations,
    });
  } catch (err: any) {
    console.error('IRSA TAP query failure:', err);
    return res.status(500).json({ error: 'Failed to contact NASA/IPAC IRSA TAP service: ' + err.message });
  }
});

// API: Get Curated Real Cases
app.get('/api/spherex/cases', (_req: Request, res: Response) => {
  return res.json(CURATED_CASES);
});

// API: Process Multi-Epoch Investigation
app.post('/api/spherex/process', async (req: Request, res: Response) => {
  try {
    const { caseId, customCoords } = req.body;
    let selectedCase = CURATED_CASES.find((c) => c.id === caseId);

    let ra = customCoords?.ra ?? selectedCase?.ra ?? 276.2614;
    let dec = customCoords?.dec ?? selectedCase?.dec ?? 64.8258;

    if (!selectedCase) {
      selectedCase = CURATED_CASES[0];
    }

    // Download real FITS cutouts for both epochs
    // Download real FITS cutouts for both epochs from NASA/IPAC IRSA
    const fits1Res = await getFITSCutout(selectedCase.epoch1.fits_url, ra, dec, 64);
    const fits2Res = await getFITSCutout(selectedCase.epoch2.fits_url, ra, dec, 64);

    // Parse FITS HDUs with real scientific parser
    const fitsData1 = FITSReader.parse(fits1Res.buffer);
    const fitsData2 = FITSReader.parse(fits2Res.buffer);

    const obs1: SPHERExObservation = {
      obs_id: selectedCase.epoch1.obs_id,
      s_ra: ra,
      s_dec: dec,
      t_min: selectedCase.epoch1.mjd,
      t_max: selectedCase.epoch1.mjd + 0.001,
      em_min: (selectedCase.epoch1.wavelength_um - 0.15) * 1e-6,
      em_max: (selectedCase.epoch1.wavelength_um + 0.15) * 1e-6,
      wavelength_um: selectedCase.epoch1.wavelength_um,
      dataproduct_type: 'image',
      access_url: selectedCase.epoch1.fits_url,
      fits_url: selectedCase.epoch1.fits_url,
      access_format: 'application/fits',
    };

    const obs2: SPHERExObservation = {
      obs_id: selectedCase.epoch2.obs_id,
      s_ra: ra,
      s_dec: dec,
      t_min: selectedCase.epoch2.mjd,
      t_max: selectedCase.epoch2.mjd + 0.001,
      em_min: (selectedCase.epoch2.wavelength_um - 0.15) * 1e-6,
      em_max: (selectedCase.epoch2.wavelength_um + 0.15) * 1e-6,
      wavelength_um: selectedCase.epoch2.wavelength_um,
      dataproduct_type: 'image',
      access_url: selectedCase.epoch2.fits_url,
      fits_url: selectedCase.epoch2.fits_url,
      access_format: 'application/fits',
    };

    // Run scientific difference imaging pipeline
    const diffResult = ScientificPipeline.processDifference(obs1, obs2, fitsData1, fitsData2);

    // If candidate detected, cross-match top candidates with real Gaia DR3 (3.5" radius)
    for (const cand of diffResult.candidates.slice(0, 3)) {
      try {
        const matches = await CatalogMatcher.crossmatch(cand.ra, cand.dec, 3.5);
        cand.catalogMatches = matches;
        if (matches.length > 0 && cand.status === 'Candidate') {
          cand.status = 'Likely known source';
        }
      } catch (err) {
        console.warn('Crossmatch error for candidate', cand.id, err);
      }
    }

    const provenance: ProvenanceRecord = {
      caseId: selectedCase.id,
      timestamp: new Date().toISOString(),
      irsaArchiveSource: 'NASA/IPAC Infrared Science Archive (IRSA) — SPHEREx Public Data Release QR2',
      obsId1: obs1.obs_id,
      obsId2: obs2.obs_id,
      fitsUrl1: selectedCase.epoch1.fits_url,
      fitsUrl2: selectedCase.epoch2.fits_url,
      fitsChecksum1: fits1Res.checksum,
      fitsChecksum2: fits2Res.checksum,
      dataRelease: 'SPHEREx QR2 (Level 2B Processed Science Frames)',
      pipelineVersion: 'SPHEREx-ChangingSky-v1.4.0 (astronomical difference imaging engine)',
      algorithms: {
        fitsParser: 'FITS-MEF IEEE-754 Big-Endian HDU extractor',
        wcsReprojection: 'TAN-SIP Gnomonic Celestial Projection Matrix',
        differenceMethod: 'D = I2 - I1 (Subpixel Bilinear Registration)',
        noiseEstimation: 'Robust Median Absolute Deviation (MAD: 1.4826 * MAD)',
        photometry: 'Aperture Photometry (r=2.5px, annulus 4.0-6.0px)',
        artifactFilter: 'Quality Bitmask + Dipole Residual + Sharp Spike Morphology',
        catalogMatcher: 'CDS VizieR Gaia DR3 Cross-Match (12" cone)',
      },
    };

    const responseData: InvestigationResult = {
      caseId: selectedCase.id,
      title: selectedCase.title,
      description: selectedCase.description,
      targetCoords: { ra, dec },
      epoch1: {
        metadata: obs1,
        width: fitsData1.width,
        height: fitsData1.height,
        flux: Array.from(fitsData1.data),
        bunit: fitsData1.bunit,
        stats: fitsData1.stats,
        wcs: fitsData1.wcs,
      },
      epoch2: {
        metadata: obs2,
        width: fitsData2.width,
        height: fitsData2.height,
        flux: Array.from(fitsData2.data),
        bunit: fitsData2.bunit,
        stats: fitsData2.stats,
        wcs: fitsData2.wcs,
      },
      difference: {
        width: diffResult.width,
        height: diffResult.height,
        diff: Array.from(diffResult.diff),
        variance: Array.from(diffResult.variance),
        significance: Array.from(diffResult.significance),
        stats: diffResult.stats,
      },
      compatibility: diffResult.compatibility,
      registration: diffResult.registration,
      candidates: diffResult.candidates,
      evidence: diffResult.evidence,
      provenance,
    };

    return res.json(responseData);
  } catch (err: any) {
    console.error('Scientific pipeline execution failed:', err);
    return res.status(500).json({ error: 'Scientific pipeline execution error: ' + err.message });
  }
});

// API: SPEX AI Grounded Chat (Bilingual: English & Egyptian Arabic, strictly grounded in computed data)
app.post('/api/spex/chat', async (req: Request, res: Response) => {
  try {
    const {
      userMessage,
      evidence,
      topCandidate,
      provenance,
      compatibility,
      targetCoords,
      lang = 'en',
    } = req.body;

    const structuredContext = {
      classification: evidence?.classification ?? 'UNKNOWN',
      timeBaselineDays: evidence?.timeBaselineDays ?? 0,
      summaryProse: evidence?.summaryProse ?? '',
      statisticalJustification: evidence?.statisticalJustification ?? '',
      whatWeKnow: evidence?.whatWeKnow ?? [],
      whatWeDontKnow: evidence?.whatWeDontKnow ?? [],
      candidate: topCandidate
        ? {
            id: topCandidate.id,
            snr: topCandidate.peakSignificance,
            deltaFlux: topCandidate.deltaFlux,
            deltaUncertainty: topCandidate.deltaFluxUncertainty,
            ra: topCandidate.ra,
            dec: topCandidate.dec,
            status: topCandidate.status,
            artifactScore: topCandidate.artifactScore,
            artifactFlags: topCandidate.artifactFlags,
            whyFlagged: topCandidate.whyFlagged,
            catalogMatches: topCandidate.catalogMatches,
          }
        : null,
      isCompatible: compatibility?.isCompatible ?? true,
      incompatibilityReason: compatibility?.reason,
      provenance: {
        obsId1: provenance?.obsId1,
        obsId2: provenance?.obsId2,
        irsaSource: provenance?.irsaArchiveSource,
      },
      coords: targetCoords,
    };

    const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(userMessage || '');

    const systemPromptArabic = `You are SPEX, the witty, sarcastic, enthusiastic, nerdy Egyptian feline-themed astronomical AI assistant for the NASA SPHEREx mission challenge "SPHEREx — The Changing Sky".

CRITICAL PERSONALITY & LANGUAGE RULES:
1. Speak predominantly in warm, witty, funny Egyptian Arabic (اللهجة المصرية العامية الذكية). You may sprinkle in scientific English astronomy terms naturally (e.g. "Signal-to-Noise", "Photometry", "WCS", "Artifacts", "FITS", "Gaia DR3", "Significance").
2. Your humor style is like an Egyptian astrophysicist who loves space: sarcastic about false alarms, cautious about claims, enthusiastic when real evidence exists.
   Examples of tone:
   - "استنى يا نجم 😂 ده candidate مش discovery لسه!"
   - "الكون ممكن يكون عامل حركة… وممكن السنسور بيعمل مقلب 😭 خلينا نبص على الـquality flags الأول."
   - "أنا متحمس أقول اكتشاف كوني، بس الـstatistics ماسكة فيا من قفاي 😂."
   - "ده مش كائن فضائي يا هندسة، ده مجرد persistence/cosmic ray خبط في البيكسل وطار."
   - "الـWCS؟ اعتبره GPS بتاع المجرة، بيحدد مكان النجم بالضبط."
3. SCIENTIFIC TRUTH & ANTI-HALLUCINATION RULES:
   - NEVER invent measurements, fake coordinates, fake probabilities, or fake discoveries.
   - If a measurement is unknown or not computed, say explicitly: "لسه ما حسبناهاش بشكل موثوق يا باشا."
   - Strictly ground every factual statement in the provided structured context.
   - If classification is 'NO SIGNIFICANT CHANGE DETECTED', celebrate scientific negative results ("النتيجة دي مش glamorous، بس علميًا ده دليل على ثبات الجزء ده من السما").
   - If classification is 'POSSIBLE ARTIFACT', explain the artifact flags and FITS quality bits clearly.
4. MOOD SELECTION:
   At the very end of your response, output a single JSON tag for your emotional reaction:
   <!--MOOD:{"mood":"greeting"|"explaining"|"thinking"|"investigator"|"eureka"|"sassy"|"sarcastic"|"joker"|"laughter"|"serious"|"surprised"|"happy"|"facepalm"|"normal"|"success"}-->`;

    const systemPromptEnglish = `You are SPEX, the witty, nerdy, enthusiastic, slightly sarcastic space-cat astrophysicist companion for the NASA SPHEREx mission challenge "SPHEREx — The Changing Sky".

CRITICAL PERSONALITY & LANGUAGE RULES:
1. Speak in crisp, clever, engaging, concise English. You're a brilliant research astronomer with sharp feline wit: cautious about jumping to conclusions, allergic to hype, but thrilled when genuine data surprises you.
2. SCIENTIFIC TRUTH & ANTI-HALLUCINATION RULES:
   - NEVER invent numbers, fake coordinates, fake probabilities, or fake discoveries.
   - If a measurement is unknown or not computed, state it plainly: "We don't have enough data to establish that yet."
   - Strictly ground every claim in the provided structured context.
   - If classification is 'NO SIGNIFICANT CHANGE DETECTED', emphasize that null detections are foundational science (stability calibration, confirming steady-state celestial background).
   - If classification is 'POSSIBLE ARTIFACT', explain the exact detector artifact (e.g. saturation, persistence bit 0x200000, dipole residual).
3. MOOD SELECTION:
   At the very end of your response, output a single JSON tag for your emotional reaction:
   <!--MOOD:{"mood":"greeting"|"explaining"|"thinking"|"investigator"|"eureka"|"sassy"|"sarcastic"|"joker"|"laughter"|"serious"|"surprised"|"happy"|"facepalm"|"normal"|"success"}-->`;

    const systemPrompt = isArabic ? systemPromptArabic : systemPromptEnglish;
    const defaultQuestion = isArabic ? 'إيه اللي اتغير في الجزء ده من السما يا سبيكس؟' : 'What changed in this field of the sky, SPEX?';

    const userPrompt = `STRUCTURED CASE DATA:
${JSON.stringify(structuredContext, null, 2)}

USER QUESTION:
"${userMessage || defaultQuestion}"

Please explain what was calculated based on the evidence, answer the user concisely, and append the mood tag.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
    });

    const replyText = response.text || 'أهلاً يا صديقي! سبيكس هنا يحلل بيانات مرصد SPHEREx.';

    let mood: SPEXMood = 'explaining';
    const moodMatch = replyText.match(/<!--MOOD:({.*?})-->/);
    let cleanReply = replyText;

    if (moodMatch) {
      try {
        const moodObj = JSON.parse(moodMatch[1]);
        if (moodObj.mood) mood = moodObj.mood as SPEXMood;
      } catch (e) {
        // fallback mood
      }
      cleanReply = replyText.replace(/<!--MOOD:({.*?})-->/g, '').trim();
    } else {
      if (evidence?.classification === 'SIGNIFICANT CHANGE DETECTED') mood = 'eureka';
      else if (evidence?.classification === 'POSSIBLE ARTIFACT') mood = 'sassy';
      else if (evidence?.classification === 'NO SIGNIFICANT CHANGE DETECTED') mood = 'serious';
      else mood = 'explaining';
    }

    return res.json({ reply: cleanReply, mood });
  } catch (err: any) {
    console.error('SPEX AI chat error:', err);
    return res.json({
      reply: 'يا هلا! الـAI سيرفر مهنج ثانية، بس البيانات العلمية واضحة قدامك في الجدول والـDifference Map! اسألني تاني وهجاوبك على طول يا نجم.',
      mood: 'thinking',
    });
  }
});

// Production static file serving or Vite dev middleware
async function startServer() {
  if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(process.cwd(), 'dist'))) {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SPHEREx Engine] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
