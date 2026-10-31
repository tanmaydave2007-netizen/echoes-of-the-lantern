# Echoes of the Lantern: Setup Guide (Windows + Antigravity)

આ guide પ્રમાણે જ કરો. Project codeમાં કોઈ API key નાખવાની જરૂર નથી.

## Part 1: Project open કરો

1. `echoes-of-the-lantern.zip` ને Desktop પર Extract કરો.
2. Antigravity ખોલો.
3. **Open Folder** પસંદ કરો.
4. Extract કરેલો `echoes-of-the-lantern` folder પસંદ કરો.
5. Antigravity માં Terminal ખોલો.

## Part 2: Laptop પર project run કરો

Terminal માં એક પછી એક command લખો:

```powershell
node -v
npm -v
```

Node.js 20.19+ અથવા 22.12+ (અથવા તેનાથી નવું supported version) હોવું જોઈએ. જો `node` અથવા `npm` ઓળખાતું ન હોય તો Node.js LTS install કરીને Antigravity ફરી ખોલો.

હવે:

```powershell
npm install
npm run dev
```

Terminal માં `http://localhost:5173/` જેવી link દેખાશે. Ctrl પર click કરો અથવા browser માં link paste કરો.

## Part 3: AI model પહેલી વાર load કરો

1. Internet ચાલુ રાખો.
2. Website ના ઉપરના ભાગમાં **LOAD LOCAL AI** દબાવો.
3. Model download અને preparation પૂરું થાય ત્યાં સુધી browser બંધ ન કરો.
4. **LOCAL AI READY** દેખાય એટલે model તૈયાર છે.
5. Model Q4 weights આશરે 181 MB છે. Runtime ની વધારાની files પણ download થઈ શકે છે.

## Part 4: Demo કરો

1. **Create memory** tab ખોલો.
2. **Try an example** દબાવો.
3. **Weave this memory** દબાવો.
4. **Memory archive** માં saved card દેખાશે.
5. **Ask the Echo** ખોલો અને `What food did they love?` પૂછો.
6. Archive માંથી Backup, Restore, Download note અને Print/PDF ચકાસો.

Demo માટે Example memory વાપરો. કોઈની private photo અથવા real personal story video માં ન બતાવો.

## Part 5: GitHub પર upload કરો

GitHub પર `echoes-of-the-lantern` નામની ખાલી repository બનાવો. README add કરવાનું option બંધ રાખો.

Antigravity terminal માં project folder ની અંદર આ commands ચલાવો:

```powershell
git init
git add .
git commit -m "Build Echoes of the Lantern"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/echoes-of-the-lantern.git
git push -u origin main
```

`YOUR-USERNAME` ને તમારા GitHub username થી બદલો.

## Part 6: Render પર deploy કરો

1. Render માં login કરો.
2. **New + → Static Site** પસંદ કરો.
3. GitHub connect કરો અને `echoes-of-the-lantern` repository પસંદ કરો.
4. Branch `main` પસંદ કરો.
5. આ settings નાખો:

   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables: કંઈ નહીં

6. **Create Static Site** દબાવો.
7. Deploy complete થયા પછી Render HTTPS URL આપશે.
8. એ URL ખોલો અને **LOAD LOCAL AI** ફરી દબાવો. Live website પર model cache અલગથી બનશે.

આ React + Vite static website છે. Render માં **Static Site** જ પસંદ કરવો, Python Web Service નહીં.

## Part 7: Offline test

1. Render website એકવાર online ખોલો.
2. Local AI model ready થાય તેની રાહ જુઓ.
3. Website reload કરો જેથી app shell service worker cacheમાં આવે.
4. પછી Wi-Fi બંધ કરીને website reload અને AI load test કરો.
5. Browser cache/site data delete કરશો તો model ફરી download કરવો પડી શકે.

Offline operation browser cache પર આધારિત છે. Important memories માટે Archive નું Backup JSON નિયમિત download કરવું.

## જો error આવે તો

**`npm is not recognized`**: Node.js LTS install કરો, પછી Antigravity બંધ કરીને ફરી ખોલો.

**`npm install` stuck થાય**: Internet તપાસો, પછી terminal માં `npm install` ફરી ચલાવો.

**AI model load ન થાય**: Internet ચાલુ રાખો, Chrome/Edge માં website ખોલો, reload કરો અને ફરી **LOAD LOCAL AI** દબાવો. Model download માટે પૂરતી free disk space રાખો.

**Memory દેખાતી નથી**: તે એ જ browser અને website origin માં save થાય છે. `localhost` અને Render URL ની storage અલગ છે. Localhost માં બનાવેલી memory Render પર automatically નહીં આવે. Backup JSON export કરીને બીજી જગ્યાએ Restore કરો.
