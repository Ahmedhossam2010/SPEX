import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from './translations.js';

describe('Translations Key Parity and Completeness', () => {
  it('has identical keys for English and Arabic', () => {
    const enKeys = Object.keys(translations.en).sort();
    const arKeys = Object.keys(translations.ar).sort();

    const missingInAr = enKeys.filter(k => !(k in translations.ar));
    const missingInEn = arKeys.filter(k => !(k in translations.en));

    assert.deepStrictEqual(missingInAr, [], `Keys present in en but missing in ar: ${missingInAr.join(', ')}`);
    assert.deepStrictEqual(missingInEn, [], `Keys present in ar but missing in en: ${missingInEn.join(', ')}`);
  });

  it('contains non-empty strings for all English values', () => {
    for (const [key, value] of Object.entries(translations.en)) {
      assert.ok(typeof value === 'string' && value.trim().length > 0, `English key ${key} is empty`);
    }
  });

  it('contains non-empty strings for all Arabic values', () => {
    for (const [key, value] of Object.entries(translations.ar)) {
      assert.ok(typeof value === 'string' && value.trim().length > 0, `Arabic key ${key} is empty`);
    }
  });

  it('contains valid Arabic characters in Arabic strings', () => {
    // Check that Arabic dictionary is genuinely localized (contains Arabic unicode \u0600-\u06FF)
    let arabicCharCount = 0;
    const arabicRegex = /[\u0600-\u06FF]/;
    for (const value of Object.values(translations.ar)) {
      if (arabicRegex.test(value)) {
        arabicCharCount++;
      }
    }
    // At least 90% of strings should have authentic Arabic characters
    const totalKeys = Object.keys(translations.ar).length;
    assert.ok(
      arabicCharCount > totalKeys * 0.9,
      `Only ${arabicCharCount}/${totalKeys} Arabic strings contain Arabic characters`
    );
  });
});
