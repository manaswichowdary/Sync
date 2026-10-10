const WORDS = [
  "maple", "river", "pebble", "citrus", "harbor", "linen",
  "sunny", "willow", "amber", "cedar", "coral", "daisy",
];

export function familyCodeWord(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `${WORDS[values[0] % WORDS.length]}-${WORDS[values[1] % WORDS.length]}`;
}
