/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const GENERAL_REQUEST_ONLY_TAG = 'source:general_request';
const GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX = 'forwarded_by:';
const ACK_HISTORY_ACTION = 'general_request_acknowledged';
const ACKNOWLEDGED_LIKE_STATUSES = new Set(['approved', 'confirmed', 'completed', 'verified']);

function parseTagList(tags) {
  if (!tags) return [];
  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasTag(tags, expectedTag) {
  return parseTagList(tags).some((tag) => tag.toLowerCase() === expectedTag.toLowerCase());
}

function hasForwardedByTag(tags) {
  return parseTagList(tags).some((tag) =>
    tag.toLowerCase().startsWith(GENERAL_REQUEST_FORWARDED_BY_TAG_PREFIX),
  );
}

function appendGeneralRequestOnlyTag(tags) {
  const nextTags = parseTagList(tags);
  if (!hasTag(tags, GENERAL_REQUEST_ONLY_TAG)) {
    nextTags.push(GENERAL_REQUEST_ONLY_TAG);
  }
  return nextTags.length > 0 ? nextTags.join(',') : null;
}

async function main() {
  const shouldExecute = process.argv.includes('--execute');
  const useLegacyHeuristic = process.argv.includes('--legacy-heuristic');
  const modeLabel = shouldExecute ? 'EXECUTE' : 'DRY-RUN';
  console.log(
    `[${modeLabel}] Backfill informational general-request tags${useLegacyHeuristic ? ' (legacy heuristic enabled)' : ''}`,
  );

  const ackHistoryRows = await prisma.tbl_maintenance_history.findMany({
    where: { action: ACK_HISTORY_ACTION },
    select: { request_id: true },
  });

  const acknowledgedRequestIds = Array.from(
    new Set(ackHistoryRows.map((row) => row.request_id).filter((value) => Number.isFinite(value))),
  );

  if (acknowledgedRequestIds.length === 0 && !useLegacyHeuristic) {
    console.log('No acknowledged general-request history found. Nothing to backfill.');
    return;
  }

  if (acknowledgedRequestIds.length === 0 && useLegacyHeuristic) {
    console.log('No acknowledged history found. Continuing with legacy heuristic scan.');
  }

  const candidates = await prisma.tbl_maintenance_requests.findMany({
    where: {
      deleted_at: null,
      status: { in: Array.from(ACKNOWLEDGED_LIKE_STATUSES) },
      OR: [{ category: 'general' }, { tags: { contains: GENERAL_REQUEST_ONLY_TAG } }],
    },
    select: {
      request_id: true,
      request_number: true,
      status: true,
      category: true,
      tags: true,
      assigned_to: true,
    },
    orderBy: { request_id: 'asc' },
  });

  const strictRowsToTag = candidates.filter((row) => {
    if (!acknowledgedRequestIds.includes(row.request_id)) return false;
    if (hasTag(row.tags, GENERAL_REQUEST_ONLY_TAG)) return false;
    if (hasForwardedByTag(row.tags)) return false;
    if ((row.assigned_to || '').trim().length > 0) return false;
    return true;
  });

  const legacyRowsToTag = candidates.filter((row) => {
    if (acknowledgedRequestIds.includes(row.request_id)) return false;
    if (hasTag(row.tags, GENERAL_REQUEST_ONLY_TAG)) return false;
    if (hasForwardedByTag(row.tags)) return false;
    if ((row.assigned_to || '').trim().length > 0) return false;
    if (String(row.category || '').trim().toLowerCase() !== 'general') return false;
    return true;
  });

  const rowsToTag = useLegacyHeuristic
    ? [...strictRowsToTag, ...legacyRowsToTag]
    : strictRowsToTag;

  console.log(`Acknowledged history ids: ${acknowledgedRequestIds.length}`);
  console.log(`Candidate requests: ${candidates.length}`);
  console.log(`Strict rows to tag (history-based): ${strictRowsToTag.length}`);
  console.log(`Legacy heuristic rows to tag: ${legacyRowsToTag.length}`);
  console.log(`Rows to tag (current mode): ${rowsToTag.length}`);

  if (rowsToTag.length > 0) {
    const preview = rowsToTag.slice(0, 20).map((row) => ({
      request_id: row.request_id,
      request_number: row.request_number,
      mode: acknowledgedRequestIds.includes(row.request_id) ? 'strict' : 'legacy',
      status: row.status,
      category: row.category,
      assigned_to: row.assigned_to,
      tags: row.tags,
      next_tags: appendGeneralRequestOnlyTag(row.tags),
    }));
    console.table(preview);
    if (rowsToTag.length > preview.length) {
      console.log(`...and ${rowsToTag.length - preview.length} more rows`);
    }
  }

  if (!shouldExecute) {
    console.log('Dry run only. Re-run with --execute to apply changes.');
    return;
  }

  let updatedCount = 0;
  for (const row of rowsToTag) {
    const nextTags = appendGeneralRequestOnlyTag(row.tags);
    await prisma.tbl_maintenance_requests.update({
      where: { request_id: row.request_id },
      data: { tags: nextTags },
    });
    updatedCount += 1;
  }

  console.log(`Backfill completed. Updated rows: ${updatedCount}`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
