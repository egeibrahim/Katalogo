import { useQuery } from "@tanstack/react-query";

const GOOGLE_FONTS_JSON_URL =
  "https://cdn.jsdelivr.net/gh/jonathantneal/google-fonts-complete@master/google-fonts.json";

const FALLBACK_FONTS = [
  "Instrument Sans",
  "Newsreader",
  "Arial",
  "Open Sans",
  "Roboto",
  "Lato",
  "Oswald",
  "Montserrat",
  "Source Sans 3",
  "Poppins",
];

/** En çok kullanılan Google Fonts (liste A–Z içinde bu isimler öne alınır). */
const POPULAR_FONT_NAMES = new Set([
  "Abel", "Abril Fatface", "Aclonica", "Acme", "Actor", "Adamina", "Advent Pro", "Alegreya", "Alegreya Sans",
  "Alfa Slab One", "Alice", "Almarai", "Amatic SC", "Andada Pro", "Anton", "Archivo", "Archivo Black",
  "Arimo", "Arsenal", "Artifika", "Arvo", "Asap", "Asap Condensed", "Assistant", "Atkinson Hyperlegible",
  "Barlow", "Barlow Condensed", "Bebas Neue", "Bitter", "Bodoni Moda", "Bree Serif", "Cabin", "Cairo",
  "Cardo", "Catamaran", "Caveat", "Chakra Petch", "Chivo", "Cinzel", "Comfortaa", "Commissioner",
  "Cormorant Garamond", "Crimson Pro", "Cuprum", "Dancing Script", "Didact Gothic", "DM Sans", "DM Serif Display",
  "Domine", "Dosis", "DynaPuff", "EB Garamond", "Edu SA Beginner", "Epilogue", "Exo 2", "Fira Code",
  "Fira Sans", "Fira Sans Condensed", "Fjalla One", "Fraunces", "Fredoka", "Gabarito", "Genos", "Georgia",
  "Gluten", "Great Vibes", "Gupter", "Hahmlet", "Heebo", "Hind", "Inconsolata", "Indie Flower", "Inknut Antiqua",
  "Instrument Sans", "Instrument Serif", "Inter", "IBM Plex Mono", "IBM Plex Sans", "IBM Plex Serif",
  "Josefin Sans", "Josefin Slab", "Jost", "Julius Sans One", "Kanit", "Karla", "Kdam Thmor Pro", "Klee One",
  "Labrada", "Lato", "League Spartan", "Libre Baskerville", "Libre Franklin", "Literata", "Lobster", "Lora",
  "Manrope", "Marcellus", "Martel", "Merriweather", "Merriweather Sans", "Montserrat", "Mooli", "M PLUS 1",
  "M PLUS Rounded 1c", "Mulish", "Nanum Gothic", "Nanum Myeongjo", "Newsreader", "Noto Sans", "Noto Serif",
  "Nunito", "Nunito Sans", "Oswald", "Outfit", "Overpass", "Pacifico", "Padauk", "Pangolin", "Parisienne",
  "Passion One", "Patua One", "Permanent Marker", "Petemoss", "Phudu", "Playfair Display", "Playfair Display SC",
  "Plus Jakarta Sans", "Poppins", "Port Lligat Slab", "Prata", "Prompt", "PT Sans", "PT Serif", "Public Sans",
  "Quicksand", "Raleway", "Recursive", "Red Hat Display", "Red Rose", "Reem Kufi", "REM", "Roboto",
  "Roboto Condensed", "Roboto Flex", "Roboto Mono", "Roboto Slab", "RocknRoll One", "Rubik", "Ruda",
  "Rufina", "Russo One", "Saira", "Saira Condensed", "Satisfy", "Schibsted Grotesk", "Scope One", "Secular One",
  "Sen", "Shantell Sans", "Signika", "Signika Negative", "Silkscreen", "Source Code Pro", "Source Sans 3",
  "Source Serif 4", "Space Grotesk", "Space Mono", "Spectral", "Spline Sans Mono", "Squada One", "Stick No Bills",
  "Syne", "Tajawal", "Tangerine", "Taviraj", "Tilt Neon", "Tinos", "Titan One", "Tomorrow", "Tourney",
  "Trirong", "Truculenta", "Tsukimi Rounded", "Ubuntu", "Ubuntu Condensed", "Ubuntu Mono", "Unbounded",
  "Unna", "Urbanist", "Varela Round", "Vollkorn", "Voltaire", "Work Sans", "Xanh Mono", "Yanone Kaffeesatz",
  "Yeseva One", "Yrsa", "Zeyada", "Zilla Slab",
]);

/** Tüm font isimlerini al; popüler olanları öne koy, sonra A–Z sırala. Limit yok – geniş liste. */
function sortFontsWithPopularFirst(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const aPop = POPULAR_FONT_NAMES.has(a) ? 0 : 1;
    const bPop = POPULAR_FONT_NAMES.has(b) ? 0 : 1;
    if (aPop !== bPop) return aPop - bPop;
    return a.localeCompare(b, "en");
  });
}

async function fetchFontNames(): Promise<string[]> {
  const res = await fetch(GOOGLE_FONTS_JSON_URL);
  if (!res.ok) throw new Error("Could not load font list");
  const data = (await res.json()) as Record<string, unknown>;
  const names = Object.keys(data).filter((k) => typeof k === "string" && k.length > 0);
  return sortFontsWithPopularFirst(names);
}

export function useGoogleFonts() {
  const query = useQuery({
    queryKey: ["google-fonts-list"],
    queryFn: fetchFontNames,
    staleTime: 1000 * 60 * 60 * 24, // 24 saat
    placeholderData: FALLBACK_FONTS,
    retry: 1,
  });
  return {
    fonts: query.data ?? FALLBACK_FONTS,
    isLoading: query.isLoading,
    error: query.error,
  };
}

const loadedFonts = new Set<string>();

export function ensureGoogleFontLoaded(fontFamily: string): void {
  if (loadedFonts.has(fontFamily)) return;
  const id = `gf-${fontFamily.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontFamily);
}
