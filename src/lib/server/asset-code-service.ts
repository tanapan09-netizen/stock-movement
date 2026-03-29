import { prisma } from '@/lib/prisma';
import { getAssetPolicyFromDb } from '@/lib/server/asset-policy-service';

type ResolvedCodeTemplate =
    | {
        mode: 'sequence';
        prefix: string;
        suffix: string;
        digits: number;
      }
    | {
        mode: 'static';
        value: string;
      };

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveCodeTemplate(
    format: string,
    date = new Date(),
): ResolvedCodeTemplate {
    const yyyy = String(date.getFullYear());
    const yy = yyyy.slice(-2);
    const resolved = format
        .replaceAll('{YYYY}', yyyy)
        .replaceAll('{YY}', yy);

    const sequenceTokenMatch = resolved.match(/\{0+\}/);
    if (!sequenceTokenMatch) {
        return { mode: 'static', value: resolved };
    }

    const token = sequenceTokenMatch[0];
    const digits = token.length - 2;
    const index = sequenceTokenMatch.index || 0;
    const prefix = resolved.slice(0, index);
    const suffix = resolved.slice(index + token.length);

    return {
        mode: 'sequence',
        prefix,
        suffix,
        digits,
    };
}

async function getNextSequenceCode(
    prefix: string,
    suffix: string,
    digits: number,
) {
    const regex = new RegExp(
        `^${escapeRegExp(prefix)}(\\d{${digits}})${escapeRegExp(suffix)}$`,
    );

    const where = suffix
        ? { asset_code: { startsWith: prefix, endsWith: suffix } }
        : { asset_code: { startsWith: prefix } };

    const rows = await prisma.tbl_assets.findMany({
        where,
        select: { asset_code: true },
    });

    let maxSequence = 0;
    for (const row of rows) {
        const match = row.asset_code.match(regex);
        if (!match) continue;
        const value = Number(match[1]);
        if (Number.isFinite(value) && value > maxSequence) {
            maxSequence = value;
        }
    }

    const nextSequence = String(maxSequence + 1).padStart(digits, '0');
    return `${prefix}${nextSequence}${suffix}`;
}

async function getNextStaticCode(baseCode: string) {
    const exists = await prisma.tbl_assets.findFirst({
        where: { asset_code: baseCode },
        select: { asset_id: true },
    });
    if (!exists) return baseCode;

    let counter = 2;
    while (counter < 10000) {
        const candidate = `${baseCode}-${String(counter).padStart(2, '0')}`;
        const candidateExists = await prisma.tbl_assets.findFirst({
            where: { asset_code: candidate },
            select: { asset_id: true },
        });
        if (!candidateExists) {
            return candidate;
        }
        counter += 1;
    }

    return `${baseCode}-${Date.now()}`;
}

export async function generateNextAssetCodeByPolicy() {
    const policy = await getAssetPolicyFromDb();
    const template = resolveCodeTemplate(policy.asset_code_format);

    if (template.mode === 'sequence') {
        return getNextSequenceCode(template.prefix, template.suffix, template.digits);
    }

    return getNextStaticCode(template.value);
}

