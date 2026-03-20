const fs = require('fs');
const iconv = require('iconv-lite');

const file = 'D:\\StockMovement\\src\\app\\(dashboard)\\maintenance\\MaintenanceClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// The garbled text has 'š', which is 0x9A in windows-1252.
// E0 B8 A3 was decoded as windows-1252 to give "เธฃ"
try {
  // Let's test treating it as windows-1252 interpretation of UTF-8 encoded TIS-620
  const buf1252 = iconv.encode(content, 'windows-1252'); // This should give back the original E0 B8 A3 etc mapped to bytes
  
  // Now we have the original UTF-8 bytes that represent Thai characters.
  const fixedContent = iconv.decode(buf1252, 'utf8');
  
  const pendingLabelMatch = fixedContent.match(/pending: \{ label: '(.*?)'/);
  console.log('Fixed pending label with 1252:', pendingLabelMatch ? pendingLabelMatch[1] : 'not found');

  if (fixedContent.includes('รอรับเรื่อง')) {
     fs.writeFileSync(file + '.fixed.tsx', fixedContent);
     console.log('Success! Wrote to .fixed.tsx');
  } else {
     console.log('Did not find the correct thai string. Let\'s try raw decoding.');
     // Wait, what if the string is simply windows-874 decoded as UTF-8?
     const buf874 = iconv.encode(content, 'windows-874'); // but 874 doesn't have 0x9A 'š'!
     const fixed874 = iconv.decode(buf874, 'utf8');
     console.log('Fixed pending label with 874:', fixed874.match(/pending: \{ label: '(.*?)'/)?.[1]);
  }
} catch (e) {
  console.error(e);
}
