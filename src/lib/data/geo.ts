/**
 * Reference data for registration. Countries follow the ISO 3166-1 short-name
 * list; time zones come from the runtime's own IANA database so the options can
 * never drift out of date.
 */

const COUNTRY_NAMES =
  'Afghanistan|Albania|Algeria|Andorra|Angola|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cambodia|Cameroon|Canada|Cape Verde|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo (Republic of the)|Congo (Democratic Republic of the)|Costa Rica|Côte d’Ivoire|Croatia|Cuba|Cyprus|Czechia|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Türkiye|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe'

export const COUNTRIES: string[] = COUNTRY_NAMES.split('|')

/** Common zones are pinned to the top of the list for usability. */
const COMMON_TIME_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
]

export function timeZoneOptions(): { common: string[]; all: string[] } {
  let all: string[] = []
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
    all = typeof supported === 'function' ? supported('timeZone') : []
  } catch {
    all = []
  }
  const merged = [...new Set([...COMMON_TIME_ZONES, ...all])].sort()
  return { common: COMMON_TIME_ZONES.filter((zone) => merged.includes(zone)), all: merged }
}

export const PARTICIPANT_CATEGORIES = [
  { value: 'school', label: 'School student', description: 'Currently enrolled at a secondary school.' },
  { value: 'university', label: 'University student', description: 'Currently enrolled at a college or university.' },
  { value: 'independent', label: 'Independent participant', description: 'Taking part outside a school or university delegation.' },
  { value: 'other', label: 'Other', description: 'None of the above — tell us more in your application.' },
]

export const MUN_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'No previous experience', description: 'This would be your first MUN or debate conference.' },
  { value: 'school', label: 'School or club level', description: 'Debate clubs, school simulations, in-class MUN.' },
  { value: 'conference', label: 'One or more conferences', description: 'You have participated in at least one MUN conference.' },
  { value: 'multiple', label: 'Experienced delegate', description: 'Multiple conferences, or chair/secretariat experience.' },
]

export const ROLE_OPTIONS = [
  { value: 'delegate', label: 'Delegate', description: 'Represent a country or body in a committee.' },
  { value: 'chair', label: 'Chair / committee team', description: 'Subject to organizer approval and prior experience.' },
  { value: 'observer', label: 'Observer / press', description: 'Attend sessions without a voting seat.' },
]
