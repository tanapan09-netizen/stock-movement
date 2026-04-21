import { describe, expect, it } from 'vitest';
import {
    GENERAL_REQUEST_ONLY_TAG,
    hasGeneralRequestOnlyTag,
    markAsGeneralRequestOnly,
    unmarkGeneralRequestOnly,
} from './maintenance-request-scope';

describe('maintenance-request-scope', () => {
    it('marks and detects general-only tag', () => {
        const tagged = markAsGeneralRequestOnly('urgent,room:a101');
        expect(tagged).toContain(GENERAL_REQUEST_ONLY_TAG);
        expect(hasGeneralRequestOnlyTag(tagged)).toBe(true);
    });

    it('does not duplicate general-only tag', () => {
        const tagged = markAsGeneralRequestOnly(`${GENERAL_REQUEST_ONLY_TAG},urgent`);
        expect(tagged).toBe(`${GENERAL_REQUEST_ONLY_TAG},urgent`);
    });

    it('removes general-only tag cleanly', () => {
        const untagged = unmarkGeneralRequestOnly(`${GENERAL_REQUEST_ONLY_TAG},urgent`);
        expect(untagged).toBe('urgent');
        expect(hasGeneralRequestOnlyTag(untagged)).toBe(false);
    });
});
