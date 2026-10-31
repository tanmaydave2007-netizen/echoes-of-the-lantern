# Echoes of the Lantern: A Private Memory Archive Powered by Open AI

> Replace the two links below after deployment.
>
> **Live demo:** YOUR_RENDER_URL  
> **Source code:** YOUR_GITHUB_REPOSITORY_URL

For the **Ghost in the Machine** challenge, I built **Echoes of the Lantern**, a local-first remembrance archive inspired by the ofrenda tradition. People can preserve a loved one's story, photograph, favourite food, song, and small details. The app turns those details into a remembrance card and lets the user ask questions about the memories they saved.

## Open AI is the foundation

Echoes uses the open-weight **SmolLM2 135M Instruct** model through **Hugging Face Transformers.js** and **ONNX Runtime** directly in the browser. The model runs on the user's device. There is no hosted inference endpoint, no API key, and no AI server receiving the user's memories.

The app stores memory text and compressed photographs in the browser's IndexedDB. A JSON backup can be exported and restored. The model can be inspected, replaced with another compatible open model, and the entire project can be forked.

## Why open innovation matters

A remembrance tool should not depend on a private AI service that could change its pricing, policies, or availability. Open weights and open-source inference let the community inspect the technology, change the model, and keep the experience running without handing personal memories to a third-party inference server.

The first model download normally needs internet. The Q4 weights are around 181 MB. Transformers.js caches the model in the browser, so offline use may work after the model and app shell are cached, provided the browser keeps those files.

## What it can do

- Create a remembrance card from a user's own story and optional photo.
- Generate a short reflection using local SmolLM2.
- Edit and update saved memories while preserving original creation dates and IDs.
- Ask questions about a selected saved memory.
- Keep the archive in the current browser, with validated JSON backup and restore, plus archive reset.
- Download a text note, copy it, read it aloud, or print/save it as PDF.

## Honest trade-offs

SmolLM2 135M is intentionally small so it can run on ordinary devices, but its writing quality is limited and can be inaccurate. Generated text should be reviewed before sharing. The app does not claim to contact spirits or generate messages from deceased people. It is a memory organisation tool, not a séance.

**Built with:** React, Vite, Transformers.js, ONNX Runtime, SmolLM2 135M Instruct, IndexedDB.

## Demo walkthrough

1. Load the local model.
2. Use the example memory or enter your own story.
3. Generate and save the remembrance card.
4. Open Memory Echo and ask what food or song was saved.
5. Open the archive and demonstrate JSON backup or PDF printing.

## Optional DevRelay session

Add your DevRelay session link here after recording it. It is optional for the challenge.
