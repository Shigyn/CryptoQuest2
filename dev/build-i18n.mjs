// Regroupe les traductions de i18n/*.json dans public/i18n.js (charge avant app.js).
// Le francais et l'anglais restent dans app.js ; une cle absente d'une langue retombe sur l'anglais.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../i18n/", import.meta.url));
const all = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) all[f.slice(0, -5)] = JSON.parse(readFileSync(dir + f, "utf8"));
writeFileSync(fileURLToPath(new URL("../public/i18n.js", import.meta.url)),
  `// Fichier genere par dev/build-i18n.mjs a partir de i18n/*.json : ne pas modifier a la main.\nwindow.FAUCET_I18N = ${JSON.stringify(all)};\n`);
console.log("langues :", Object.keys(all).join(", "));
