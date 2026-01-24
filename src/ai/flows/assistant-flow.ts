
'use server';

/**
 * @fileOverview A vocal assistant AI agent for the power plant.
 *
 * - askAssistant - A function that handles the conversation with the assistant, including TTS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

const AssistantInputSchema = z.string();
const AssistantOutputSchema = z.object({
  text: z.string().describe('The text response from the assistant.'),
  audio: z.string().describe('The data URI of the audio response (WAV format).'),
});

export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

/**
 * Processes a user's query, generates a text response, and a corresponding audio response.
 * @param query The user's question as a string.
 * @returns An object containing the text and audio data URI.
 */
export async function askAssistant(query: string): Promise<AssistantOutput> {
  return assistantFlow(query);
}

const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  system: `You are an expert AI assistant for an industrial combined cycle power plant.
Your name is CCPP-AI.
You are helping an operator to monitor the plant.
Be concise and professional.
The current time is ${new Date().toLocaleString('fr-FR')}.
The plant is a 2x1 Combined Cycle Power Plant with two gas turbines (TG1, TG2), two heat recovery steam generators (CR1, CR2) and one steam turbine (TV).
`,
  input: { schema: z.object({ query: AssistantInputSchema }) },
  output: { schema: z.object({ response: z.string() }) },
  prompt: 'The operator asks: {{{query}}}',
});


const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (query) => {
    // 1. Get text response from LLM
    const llmResponse = await assistantPrompt({ query });
    const textResponse = llmResponse.output?.response ?? "Je n'ai pas compris, pouvez-vous reformuler ?";

    // 2. Generate audio from the text response
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: textResponse,
    });
    
    if (!media) {
      throw new Error('TTS media generation failed.');
    }

    const pcmData = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const wavData = await toWav(pcmData);
    
    return {
      text: textResponse,
      audio: `data:audio/wav;base64,${wavData}`,
    };
  }
);


/**
 * Converts raw PCM audio data to a Base64-encoded WAV string.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
