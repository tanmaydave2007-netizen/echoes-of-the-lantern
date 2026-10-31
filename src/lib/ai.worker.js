import { env, pipeline } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX';
let textGenerator = null;
let loadingPromise = null;

env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;

async function loadModel() {
  if (textGenerator) return textGenerator;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline('text-generation', MODEL_ID, {
    dtype: 'q4',
    progress_callback: (progress) => {
      self.postMessage({ type: 'progress', progress });
    },
  });

  try {
    textGenerator = await loadingPromise;
    self.postMessage({ type: 'ready' });
    return textGenerator;
  } catch (error) {
    loadingPromise = null;
    textGenerator = null;
    throw error;
  }
}

function memoryFacts(memory) {
  return [
    `Name: ${memory.name || 'Not provided'}`,
    `Relationship: ${memory.relationship || 'Not provided'}`,
    `Memory/story: ${memory.story || 'Not provided'}`,
    `Qualities: ${memory.qualities || 'Not provided'}`,
    `Favourite food or comfort: ${memory.food || 'Not provided'}`,
    `Favourite song: ${memory.song || 'Not provided'}`,
    `Favourite flower: ${memory.flower || 'Not provided'}`,
    `A small detail: ${memory.smallDetail || 'Not provided'}`,
  ].join('\n');
}

function getGeneratedText(result) {
  const generated = result?.[0]?.generated_text ?? result?.generated_text ?? result;
  if (Array.isArray(generated)) {
    const lastMessage = generated[generated.length - 1];
    return typeof lastMessage === 'string' ? lastMessage : (lastMessage?.content || '');
  }
  return typeof generated === 'string' ? generated : '';
}

self.onmessage = async (event) => {
  const { type, requestId, task, memory, question } = event.data || {};

  if (type === 'load') {
    try {
      await loadModel();
    } catch (error) {
      self.postMessage({
        type: 'error',
        requestId,
        message: error?.message || 'The local model could not be loaded.',
      });
    }
    return;
  }

  if (type !== 'generate') return;

  try {
    const generator = await loadModel();
    const facts = memoryFacts(memory || {});
    let systemPrompt;
    let userPrompt;

    if (task === 'echo') {
      systemPrompt = [
        'You are Memory Echo, a gentle archive assistant.',
        'You are not a ghost, spirit, deceased person, or supernatural being.',
        'Never claim to contact, channel, impersonate, or speak for the person in the memories.',
        'Answer only with facts explicitly present in the supplied memory.',
        'If the detail is missing, say that it has not been added to this lantern yet.',
        'Use 1 to 3 simple sentences. Do not invent events, feelings, advice, or quotes.',
      ].join(' ');
      userPrompt = `MEMORY FACTS:\n${facts}\n\nQUESTION: ${question || ''}\n\nAnswer using only the memory facts above.`;
    } else {
      systemPrompt = [
        'You write a gentle remembrance note for a private memory archive.',
        'Write ABOUT the remembered person, never AS the remembered person.',
        'Use only the facts supplied by the user. Do not invent dates, events, dialogue, beliefs, or personality traits.',
        'Do not say the person is speaking from beyond or that you contacted them.',
        'Write 65 to 90 words in warm, simple English. Avoid clichés and dramatic claims.',
      ].join(' ');
      userPrompt = `MEMORY FACTS:\n${facts}\n\nWrite a short remembrance note using only these details. If a detail is missing, leave it out.`;
    }

    const result = await generator(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        max_new_tokens: task === 'echo' ? 90 : 130,
        temperature: 0.65,
        do_sample: true,
        repetition_penalty: 1.12,
      },
    );

    const text = getGeneratedText(result).trim();
    if (!text) throw new Error('The model returned an empty response. Please try again.');
    self.postMessage({ type: 'result', requestId, text });
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      message: error?.message || 'Local AI generation failed.',
    });
  }
};
