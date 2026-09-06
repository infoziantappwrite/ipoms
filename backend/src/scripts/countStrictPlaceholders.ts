import fs from 'fs';
import path from 'path';

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../scratch/september_placeholder_enrichments.json'), 'utf8'));

const strictPlaceholders = data.filter((item: any) => 
  item.matchedMetadataDocs.some((d: any) => d.sno >= 3807 && d.sno <= 3998)
);

console.log(`Total enrichable items: ${data.length}`);
console.log(`Strict 3807-3998 Placeholder Matches: ${strictPlaceholders.length}`);
console.log(JSON.stringify(strictPlaceholders.slice(0, 10), null, 2));
