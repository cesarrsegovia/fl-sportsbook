export interface WorldCupTeam {
  name: string;
  code: string;
  confederation: string;
}

/** Returns the flag image URL for a given ISO country code */
export function getFlagUrl(code: string, size: number = 40): string {
  return `https://flagcdn.com/w${size}/${code}.png`;
}

export const worldCupTeams: WorldCupTeam[] = [
  // CONCACAF (Hosts + 3)
  { name: 'Mexico', code: 'mx', confederation: 'CONCACAF' },
  { name: 'USA', code: 'us', confederation: 'CONCACAF' },
  { name: 'Canada', code: 'ca', confederation: 'CONCACAF' },
  { name: 'Panama', code: 'pa', confederation: 'CONCACAF' },
  { name: 'Haiti', code: 'ht', confederation: 'CONCACAF' },
  { name: 'Curacao', code: 'cw', confederation: 'CONCACAF' },

  // CONMEBOL (6)
  { name: 'Argentina', code: 'ar', confederation: 'CONMEBOL' },
  { name: 'Brazil', code: 'br', confederation: 'CONMEBOL' },
  { name: 'Uruguay', code: 'uy', confederation: 'CONMEBOL' },
  { name: 'Colombia', code: 'co', confederation: 'CONMEBOL' },
  { name: 'Ecuador', code: 'ec', confederation: 'CONMEBOL' },
  { name: 'Paraguay', code: 'py', confederation: 'CONMEBOL' },

  // UEFA (16)
  { name: 'France', code: 'fr', confederation: 'UEFA' },
  { name: 'Spain', code: 'es', confederation: 'UEFA' },
  { name: 'England', code: 'gb-eng', confederation: 'UEFA' },
  { name: 'Germany', code: 'de', confederation: 'UEFA' },
  { name: 'Netherlands', code: 'nl', confederation: 'UEFA' },
  { name: 'Portugal', code: 'pt', confederation: 'UEFA' },
  { name: 'Belgium', code: 'be', confederation: 'UEFA' },
  { name: 'Croatia', code: 'hr', confederation: 'UEFA' },
  { name: 'Switzerland', code: 'ch', confederation: 'UEFA' },
  { name: 'Austria', code: 'at', confederation: 'UEFA' },
  { name: 'Scotland', code: 'gb-sct', confederation: 'UEFA' },
  { name: 'Norway', code: 'no', confederation: 'UEFA' },
  { name: 'Sweden', code: 'se', confederation: 'UEFA' },
  { name: 'Turkey', code: 'tr', confederation: 'UEFA' },
  { name: 'Czech Republic', code: 'cz', confederation: 'UEFA' },
  { name: 'Bosnia and Herzegovina', code: 'ba', confederation: 'UEFA' },

  // AFC - Asia (8 + 1)
  { name: 'Japan', code: 'jp', confederation: 'AFC' },
  { name: 'South Korea', code: 'kr', confederation: 'AFC' },
  { name: 'Iran', code: 'ir', confederation: 'AFC' },
  { name: 'Saudi Arabia', code: 'sa', confederation: 'AFC' },
  { name: 'Qatar', code: 'qa', confederation: 'AFC' },
  { name: 'Australia', code: 'au', confederation: 'AFC' },
  { name: 'Jordan', code: 'jo', confederation: 'AFC' },
  { name: 'Uzbekistan', code: 'uz', confederation: 'AFC' },
  { name: 'Iraq', code: 'iq', confederation: 'AFC' },

  // CAF - Africa (9 + 1)
  { name: 'Morocco', code: 'ma', confederation: 'CAF' },
  { name: 'Senegal', code: 'sn', confederation: 'CAF' },
  { name: 'Tunisia', code: 'tn', confederation: 'CAF' },
  { name: 'Algeria', code: 'dz', confederation: 'CAF' },
  { name: 'Egypt', code: 'eg', confederation: 'CAF' },
  { name: 'Nigeria', code: 'ng', confederation: 'CAF' },
  { name: 'Ivory Coast', code: 'ci', confederation: 'CAF' },
  { name: 'South Africa', code: 'za', confederation: 'CAF' },
  { name: 'Cape Verde', code: 'cv', confederation: 'CAF' },
  { name: 'DR Congo', code: 'cd', confederation: 'CAF' },

  // OFC - Oceania (1)
  { name: 'New Zealand', code: 'nz', confederation: 'OFC' }
];
