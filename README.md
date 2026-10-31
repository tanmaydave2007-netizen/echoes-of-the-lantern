# Echoes of the Lantern

**A private, local-first memory archive powered by open-weight AI.**

Echoes of the Lantern gives people a calm place to preserve a story, a photograph, a favourite song, and the small details they do not want to lose. It turns those details into a remembrance card and lets the user ask questions about the memories they saved.

It is inspired by the remembrance and ofrenda side of the **Ghost in the Machine** challenge. It does not claim to contact spirits or speak for someone who has died. The AI is an archive assistant, not a séance.

## Why open AI matters here

- **Open-weight model:** SmolLM2 135M Instruct, using its Q4 ONNX build.
- **Open-source inference:** Hugging Face Transformers.js v4 with ONNX Runtime runs in the browser.
- **No inference server:** the app does not send memory text or photographs to a hosted AI API.
- **Local storage:** memory records and resized photographs are stored in the browser's IndexedDB.
- **Portable archive:** export a JSON backup and restore it on another browser/device.
- **Replaceable model:** change `MODEL_ID` in `src/lib/ai.worker.js` to a compatible Transformers.js model.

The first model load normally needs internet access. The Q4 model weights are approximately 181 MB, and browser/runtime files may add extra downloads. If the browser already has the model cached, the app also tries to load it while offline. Transformers.js caches model files in the browser cache. After the application shell and model have been cached, offline use may work in the same browser. Browser cache clearing, private browsing, or storage eviction can remove cached files, so keep a JSON backup of important memories.

## Main features

1. Build a remembrance card from a name, a story, favourite things, and an optional photograph.
2. Generate a short remembrance reflection with local SmolLM2.
3. Edit and update existing memories while preserving their original creation timestamp and ID.
4. Ask Memory Echo questions grounded in one saved memory.
5. Save memories and compressed photos in IndexedDB on the current device.
6. Export/import a JSON archive with validation, download a text note, copy it, read it aloud, or print/save it as PDF.
7. Clear archive with safety confirmation dialog.
8. Responsive layout for laptop and mobile with accessible typography.
9. PWA-style app shell caching for repeat visits.

## Tech stack

- React + Vite
- Hugging Face Transformers.js v4
- SmolLM2 135M Instruct ONNX, Q4 quantization
- ONNX Runtime Web
- IndexedDB
- Vanilla CSS

## Run locally

### Requirements

- Node.js 20.19+ or 22.12+ (or a newer supported release)
- npm
- A modern browser (Chrome or Edge recommended for the first test)

### Install and start

```bash
npm install
npm run dev
```

Open the local address printed in the terminal, usually `http://localhost:5173`.

### Test the application

1. Click **Load Local AI** while connected to the internet. The model is downloaded into browser cache on the first run.
2. Wait until the status changes to **LOCAL AI READY**.
3. Click **Try an example** on the Create Memory form.
4. Click **Weave this memory**. With the model ready, the reflection is generated locally and then saved.
5. Open **Ask the Echo**, choose the memory, and ask: `What food did they love?`
6. Open **Memory Archive** and test Backup, Restore, Download note, Read aloud, and Print/PDF.
7. Turn off Wi-Fi and reload the application after the model and app shell have been cached. Test local archive access and local AI again. Offline success depends on the browser retaining its caches.

If the model cannot load, the app still saves a memory using a clearly labelled local text fallback. It never labels that fallback as AI output.

## Deploy to Render (recommended)

This is a **static site**, not a Python web service.

1. Create a GitHub repository named `echoes-of-the-lantern` and upload/push this project.
2. Open Render and select **New → Static Site**.
3. Connect the GitHub repository and select the `main` branch.
4. Use these settings:

   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Environment Variables:** none

5. Select **Create Static Site**. Render will provide an HTTPS URL.
6. Open the HTTPS URL, click **Load Local AI**, and wait for the first model download.
7. Test the create, Echo, archive, backup, and restore flows on the deployed URL.

Every push to the connected branch triggers a new static-site deployment when auto-deploy is enabled.

## Git commands

Run these in PowerShell from inside this project folder after creating an empty GitHub repository:

```powershell
git init
git add .
git commit -m "Build Echoes of the Lantern"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/echoes-of-the-lantern.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. Do not upload personal memories, exported backups, API keys, or private photographs to GitHub.

## Project structure

```text
echoes-of-the-lantern/
├── public/
│   ├── altar-art.png
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── lib/
│   │   ├── ai.worker.js
│   │   └── storage.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── vite.config.js
├── render.yaml
├── LICENSE
├── README.md
├── SUBMISSION.md
├── DEMO_SCRIPT.md
└── SETUP_GUIDE_GUJARATI.md
```

## Privacy notes and limitations

- Memory content and photographs are saved in the current browser's IndexedDB. They are not uploaded by this application.
- The browser downloads the open model and runtime files from Hugging Face on first use. This is a model download, not a memory upload.
- Do not use a shared/public computer for sensitive memories. Anyone with access to the same browser profile may be able to open its local archive.
- Clearing site data can delete the local archive. Export backups regularly.
- SmolLM2 135M is a very small language model trained primarily for English. Its output may be repetitive or inaccurate, especially for Gujarati or other less-supported languages. Verify the generated reflection and edit it before sharing. The Echo prompt instructs the model not to invent missing details, but a small language model cannot guarantee perfect factual grounding.
- Browser cache retention is controlled by the browser. Offline operation is best-effort, not a permanent guarantee.

## Model and library references

- [SmolLM2 135M Instruct model card and license](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct)
- [ONNX Community Q4 model files](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/tree/main/onnx)
- [Transformers.js documentation](https://huggingface.co/docs/transformers.js)
- [Vite static deployment guide](https://vite.dev/guide/static-deploy)

## Suggested challenge post

### Echoes of the Lantern: A Private Memory Archive Powered by Open AI

For the Ghost in the Machine challenge, I built **Echoes of the Lantern**, a local-first remembrance archive inspired by the ofrenda tradition. People can preserve a loved one's story, photograph, favourite food, song, and small details, then create a remembrance card or ask questions about the memories they saved.

The open-source part is the foundation, not decoration. Echoes uses the open-weight SmolLM2 135M Instruct model through Transformers.js and ONNX Runtime directly in the browser. The first model download needs internet, but inference happens on the user's device. Memory text and photographs stay in IndexedDB in the current browser. There is no hosted AI endpoint, no account, and no API key.

Open innovation matters because a remembrance tool should not depend on a private AI service that could change its pricing, policies, or availability. The model can be inspected and replaced, the app can be forked, and the archive can be exported as JSON. A small model also makes on-device experimentation possible without running a large local server.

The trade-off is model quality and first-run download size. SmolLM2 135M is intentionally small, so outputs need human review. The model weights are around 181 MB in Q4 format, and first use needs an internet connection. Once the browser has cached the app and model, offline use may work as long as the browser keeps those files.

**Built with:** React, Vite, Transformers.js, ONNX Runtime, SmolLM2 135M Instruct, IndexedDB.

**Privacy note:** Echoes does not contact spirits or generate messages from deceased people. It helps users organise and reflect on the memories they choose to provide.

---

## License

The application code in this repository is released under the MIT License. The model has its own license and terms; see the model card before redistributing model files.
