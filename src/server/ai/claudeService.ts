/**
 * Claude-backed AIService. Uses tool-use to force structured JSON output, then validates
 * it with the shared zod schemas so callers always get trusted, typed data.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ZodSchema } from "zod";
import {
  meaningExplanationSchema,
  quizSchema,
  sentenceCheckSchema,
  sentenceSuggestionSchema,
  usageExplanationSchema,
  type MeaningExplanation,
  type Quiz,
  type SentenceCheck,
  type SentenceSuggestion,
  type UsageExplanation,
} from "@/core/ai/schemas";
import type { AIService, WordContext } from "@/core/ai/types";
import {
  checkSentencePrompt,
  explainMeaningPrompt,
  explainUsagePrompt,
  generateQuizPrompt,
  suggestSentencesPrompt,
  type Prompt,
} from "@/core/ai/prompts";

const DEFAULT_MODEL = "claude-opus-4-8";

type JsonSchema = Record<string, unknown>;
interface ToolDef {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
}

const str = { type: "string" } as const;
const sentencePair: JsonSchema = {
  type: "object",
  properties: { de: str, en: str },
  required: ["de", "en"],
};

const TOOLS: Record<string, ToolDef> = {
  suggest: {
    name: "provide_sentences",
    description: "Return the three example sentences.",
    input_schema: {
      type: "object",
      properties: {
        simple: sentencePair,
        realLife: sentencePair,
        cloze: {
          type: "object",
          properties: { de: str, answer: str, en: str },
          required: ["de", "answer"],
        },
      },
      required: ["simple", "realLife", "cloze"],
    },
  },
  explainMeaning: {
    name: "provide_meaning",
    description: "Return a simple-English meaning.",
    input_schema: {
      type: "object",
      properties: { simpleEnglish: str },
      required: ["simpleEnglish"],
    },
  },
  explainUsage: {
    name: "provide_usage",
    description: "Return usage guidance and examples.",
    input_schema: {
      type: "object",
      properties: { usage: str, examples: { type: "array", items: str } },
      required: ["usage", "examples"],
    },
  },
  check: {
    name: "provide_feedback",
    description: "Return grammar/vocab feedback for the learner's sentence.",
    input_schema: {
      type: "object",
      properties: {
        isCorrect: { type: "boolean" },
        score: { type: "integer", minimum: 0, maximum: 100 },
        grammarFeedback: str,
        vocabFeedback: str,
        naturalAlternative: str,
      },
      required: ["isCorrect", "score", "grammarFeedback", "vocabFeedback", "naturalAlternative"],
    },
  },
  quiz: {
    name: "provide_quiz",
    description: "Return the multiple-choice quiz.",
    input_schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              prompt: str,
              options: { type: "array", items: str },
              answerIndex: { type: "integer", minimum: 0 },
              explanation: str,
            },
            required: ["prompt", "options", "answerIndex", "explanation"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

export interface ClaudeOptions {
  apiKey: string;
  model?: string;
}

export class ClaudeAIService implements AIService {
  private client: Anthropic;
  private model: string;

  constructor(opts: ClaudeOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  }

  private async run<T>(
    prompt: Prompt,
    tool: ToolDef,
    schema: ZodSchema<T>,
    maxTokens = 1024,
  ): Promise<T> {
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    });
    const block = resp.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new Error("Claude did not return structured output");
    }
    return schema.parse(block.input);
  }

  suggestSentences(ctx: WordContext): Promise<SentenceSuggestion> {
    return this.run(suggestSentencesPrompt(ctx), TOOLS.suggest!, sentenceSuggestionSchema);
  }

  explainMeaning(ctx: WordContext): Promise<MeaningExplanation> {
    return this.run(explainMeaningPrompt(ctx), TOOLS.explainMeaning!, meaningExplanationSchema);
  }

  explainUsage(ctx: WordContext): Promise<UsageExplanation> {
    return this.run(explainUsagePrompt(ctx), TOOLS.explainUsage!, usageExplanationSchema);
  }

  checkSentence(ctx: WordContext, userSentence: string): Promise<SentenceCheck> {
    return this.run(checkSentencePrompt(ctx, userSentence), TOOLS.check!, sentenceCheckSchema);
  }

  generateQuiz(words: WordContext[], count: number): Promise<Quiz> {
    return this.run(generateQuizPrompt(words, count), TOOLS.quiz!, quizSchema, 2048);
  }
}
