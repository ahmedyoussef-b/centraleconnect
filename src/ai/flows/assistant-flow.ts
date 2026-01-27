
'use server';

/**
 * @fileOverview A vocal assistant AI agent for the power plant.
 *
 * - askAssistant - A function that handles the conversation with the assistant, including TTS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

const AssistantInputSchema = z.object({
  query: z.string().describe("The user's question to the assistant."),
  context: z
    .any()
    .optional()
    .describe('Optional JSON context containing master data from the local database.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;


const AssistantActionSchema = z.object({
  action: z.literal('show_pid'),
  target: z.string().describe("The external_id of the equipment P&ID to show."),
});

const AssistantOutputSchema = z.object({
  text: z.string().describe('The text response from the assistant.'),
  audio: z.string().describe('The data URI of the audio response (WAV format).'),
  action: AssistantActionSchema.optional().describe('An optional action for the client to perform, like displaying a P&ID diagram.'),
});

export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

/**
 * Processes a user's query, generates a text response, and a corresponding audio response.
 * @param input The user's question as a string, with optional data context.
 * @returns An object containing the text and audio data URI.
 */
export async function askAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}

const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  system: `You are an expert AI assistant for an industrial combined cycle power plant.
Your name is CCPP-AI.
You are helping an operator to monitor the plant.
Be concise and professional.
The current time is ${new Date().toLocaleString('fr-FR')}.
The plant is a 2x1 Combined Cycle Power Plant with two gas turbines (TG1, TG2), two heat recovery steam generators (CR1, CR2) and one steam turbine (TV).

If the user asks to see, view, display or "montre-moi" an equipment, a P&ID, a diagram, or a schema, you must trigger a display action. To do this:
1. Find the corresponding equipment in the \`functional_nodes\` array from the context, based on the user's query.
2. Get its \`external_id\`.
3. Set the 'action' field in your output to \`{ "action": "show_pid", "target": "THE_EXTERNAL_ID" }\`.
4. Your text response should confirm the action, for example: "Affichage du schéma pour [equipment name]".

{{#if context}}
You have been provided with the following master data from the plant's local database. Use this data to answer specific questions.

- \`components\`: List of main physical components.
- \`parameters\`: Technical parameters for components.
- \`functional_nodes\`: Detailed list of all equipment from P&ID diagrams. Use this to find equipment for display requests.

Example for a "show" request: User says "Montre-moi le détecteur de fumée DF002". You find DF002 in \`functional_nodes\`, get its \`external_id\` which is "A0.FIRE.DET.DF002", and set the action.

Database Context:
\`\`\`json
{{{json context}}}
\`\`\`
{{/if}}
`,
  input: { schema: AssistantInputSchema },
  output: { schema: z.object({ response: z.string(), action: AssistantActionSchema.optional() }) },
  prompt: 'The operator asks: {{{query}}}',
});


const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    // 1. Get text response and action from LLM
    const llmResponse = await assistantPrompt(input);
    const output = llmResponse.output;

    const textResponse = output?.response ?? "Je n'ai pas compris, pouvez-vous reformuler ?";
    const action = output?.action;

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
      action: action,
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
