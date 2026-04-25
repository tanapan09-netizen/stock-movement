import { describe, expect, it } from 'vitest';
import {
    GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX,
    GENERAL_REQUEST_ONLY_TAG,
    hasGeneralRequestForwardedByTag,
    hasGeneralRequestOnlyTag,
    markGeneralRequestForwardedBy,
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

    it('adds and detects forwarded-by tag', () => {
        const tagged = markGeneralRequestForwardedBy('urgent', 'Admin User');
        expect(tagged).toContain(`${GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX}admin_user`);
        expect(hasGeneralRequestForwardedByTag(tagged)).toBe(true);
    });

    it('replaces old forwarded-by tag', () => {
        const tagged = markGeneralRequestForwardedBy(
            `${GENERAL_REQUEST_ONLY_TAG},${GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX}old_user`,
            'New User',
        );
        expect(tagged).toBe(`${GENERAL_REQUEST_ONLY_TAG},${GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX}new_user`);
    });
});
