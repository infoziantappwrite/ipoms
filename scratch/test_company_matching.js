function normalizeComp(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|ltd\.?|limited|services|technologies|solutions|corp|india|inc\.?)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

const pairs = [
  ['BIBUS INDIA PRIVATE LIMITED', 'Bibus India Pvt Ltd'],
  ['Fristine Infotech Pvt. Ltd.', 'Fristine Infotech Private Limited'],
  ['ResNet Solutions Pvt. Ltd.', 'ResNet Solutions'],
  ['Crawl Corp India Pvt Ltd', 'Crawl corp India '],
  ['Ze AI Soft', 'ZeAI Soft'],
  ['AquaAirX', 'AquaAirX '],
];

console.log('🧪 Testing Company Name Normalization for Pending Task Matching:\n');
pairs.forEach(([a, b]) => {
  const normA = normalizeComp(a);
  const normB = normalizeComp(b);
  const match = normA === normB || normA.includes(normB) || normB.includes(normA);
  console.log(`"${a}" vs "${b}" => [${normA}] vs [${normB}] => Match? ${match ? '✅ YES' : '❌ NO'}`);
});
