import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  'src/components/SearchableSelect.tsx',
  'src/components/dashboard/RoleHeader.tsx',
  'src/components/VehicleLicensePlateSelector.tsx',
  'src/components/HierarchicalRoomSelector.tsx',
  'src/app/(dashboard)/admin/rooms/RoomClient.tsx',
  'src/app/(dashboard)/maintenance/dashboard/MaintenanceUnifiedClient.tsx',
];

const BAD_PATTERNS = [
  /\u0E40\u0E18/, // "เธ" marker
  /\u0E40\u0E19\u20AC/, // "เน€" marker
  /\u0E42\u0082/, // "โ€" marker
  /\uFFFD/, // replacement char
];

describe('mojibake guard', () => {
  it('does not contain mojibake markers in critical UI files', () => {
    for (const relPath of FILES) {
      const fullPath = path.join(ROOT, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of BAD_PATTERNS) {
        expect(content, `${relPath} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

