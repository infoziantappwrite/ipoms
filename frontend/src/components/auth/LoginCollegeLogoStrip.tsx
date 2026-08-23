'use client';

/**
 * Partner-college logos gliding right to left, same mechanism as
 * LoginModuleMarquee (shared @keyframes, so rows stay in visual sync). Full
 * color, full opacity — these are real partner marks and read as muddy or
 * fake when desaturated. Infozianthead.png is excluded — that's the app's
 * own mark, not a partner logo.
 */

const COLLEGE_LOGOS = [
  'aaa.png', 'acet.png', 'aiht.png', 'avs.png', 'christ.png', 'dsu.png',
  'hits.png', 'kamaraj.png', 'karpagam.png', 'karunya.png', 'kgisl.png',
  'kit.png', 'klu.png', 'kpr.png', 'kumaraguru.png', 'mkce.png',
  'narayanaguru.png', 'ngp.png', 'npr.png', 'psg.png', 'psna.png',
  'smvec.png', 'sona.png', 'vit.png',
];

export function LoginCollegeLogoStrip() {
  const doubled = [...COLLEGE_LOGOS, ...COLLEGE_LOGOS];
  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className="flex items-center gap-6 w-max login-marquee-track"
        style={{ animationDuration: '52s' }}
      >
        {doubled.map((file, i) => (
          <img
            key={`${file}-${i}`}
            src={encodeURI(`/college-logos/${file}`)}
            alt=""
            className="h-9 w-auto object-contain shrink-0"
          />
        ))}
      </div>
    </div>
  );
}
