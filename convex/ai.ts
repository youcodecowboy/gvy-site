import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// OpenAI API configuration
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5-mini"; // GPT-5 Mini - fast and capable
const FAST_MODEL = "gpt-4o-mini"; // GPT-4o Mini - very fast, good for formatting

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI API with messages
 */
async function callOpenAI(
  messages: Message[],
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const { model = DEFAULT_MODEL, maxTokens = 4096 } = options;

  // Use max_tokens for GPT-4o models, max_completion_tokens for GPT-5
  const isGpt4Model = model.startsWith("gpt-4");
  const tokenParam = isGpt4Model ? "max_tokens" : "max_completion_tokens";

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      [tokenParam]: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Extract plain text from TipTap JSON content
 */
function extractTextFromContent(content: any): string {
  if (!content) return "";

  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return content;
    }
  }

  if (content.type === "text") {
    return content.text || "";
  }

  if (content.content && Array.isArray(content.content)) {
    return content.content.map(extractTextFromContent).join("\n");
  }

  return "";
}

/**
 * Chat with AI using document context
 */
export const chat = action({
  args: {
    message: v.string(),
    documentId: v.optional(v.id("nodes")),
    folderId: v.optional(v.id("nodes")),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
    mode: v.optional(
      v.union(
        v.literal("chat"),
        v.literal("edit"),
        v.literal("expand"),
        v.literal("summarize"),
        v.literal("improve")
      )
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const { message, documentId, folderId, conversationHistory = [], mode = "chat" } = args;

    // Build context from documents
    let documentContext = "";
    let contextDocs: Array<{ title: string; content: string }> = [];

    // Get current document if specified
    if (documentId) {
      const doc = await ctx.runQuery(api.nodes.get, { id: documentId });
      if (doc && doc.type === "doc") {
        const text = extractTextFromContent(doc.content);
        if (text) {
          contextDocs.push({ title: doc.title, content: text });
        }
      }
    }

    // Get folder documents if specified
    if (folderId) {
      // First get the folder to determine if it's an org folder
      const folder = await ctx.runQuery(api.nodes.get, { id: folderId });
      const folderOrgId = folder?.orgId;

      const children = await ctx.runQuery(api.nodes.getChildren, {
        parentId: folderId,
        orgId: folderOrgId,
      });
      for (const child of children) {
        if (child.type === "doc" && !child.isDeleted) {
          const text = extractTextFromContent(child.content);
          if (text) {
            contextDocs.push({ title: child.title, content: text });
          }
        }
      }
    }

    // Build context string
    if (contextDocs.length > 0) {
      documentContext = contextDocs
        .map((doc) => `## ${doc.title}\n${doc.content}`)
        .join("\n\n---\n\n");
    }

    // Build system prompt based on mode
    let systemPrompt = "";
    switch (mode) {
      case "edit":
        systemPrompt = `You are a helpful writing assistant. The user will provide text they want you to edit or improve.
Make the requested changes while maintaining the original tone and style.
Return ONLY the edited text without any explanation or preamble.`;
        break;
      case "expand":
        systemPrompt = `You are a helpful writing assistant. The user will provide text they want you to expand upon.
Add more detail, examples, or elaboration while maintaining the original style.
Return ONLY the expanded text without any explanation or preamble.`;
        break;
      case "summarize":
        systemPrompt = `You are a helpful writing assistant. Summarize the provided content concisely while capturing the key points.
Return ONLY the summary without any preamble.`;
        break;
      case "improve":
        systemPrompt = `You are a helpful writing assistant. Improve the provided text by:
- Fixing grammar and spelling errors
- Improving clarity and readability
- Enhancing word choice
Return ONLY the improved text without any explanation.`;
        break;
      default:
        systemPrompt = `You are a helpful AI assistant embedded in a document editing application.
You have access to the user's documents and can help them write, edit, and understand their content.
Be concise and helpful. When discussing document content, reference specific parts when relevant.
If asked to write or edit content, provide clear, well-structured text.`;
    }

    // Add document context to system prompt
    if (documentContext) {
      systemPrompt += `\n\n## Document Context\nThe following documents are available for reference:\n\n${documentContext}`;
    }

    // Build messages array
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Call OpenAI
    const response = await callOpenAI(messages);

    return response;
  },
});

/**
 * Inline AI edit - for quick text transformations
 */
export const inlineEdit = action({
  args: {
    selectedText: v.string(),
    instruction: v.string(),
    documentId: v.optional(v.id("nodes")),
    mode: v.union(
      v.literal("custom"),
      v.literal("improve"),
      v.literal("shorter"),
      v.literal("longer"),
      v.literal("formal"),
      v.literal("casual"),
      v.literal("fix_grammar"),
      v.literal("simplify"),
      v.literal("continue")
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const { selectedText, instruction, documentId, mode } = args;

    // Get document context if available
    let documentContext = "";
    if (documentId) {
      const doc = await ctx.runQuery(api.nodes.get, { id: documentId });
      if (doc && doc.type === "doc") {
        const text = extractTextFromContent(doc.content);
        if (text) {
          // Only include first 2000 chars for context to avoid token limits
          documentContext = text.slice(0, 2000);
        }
      }
    }

    // Build instruction based on mode
    let systemInstruction = "";
    switch (mode) {
      case "improve":
        systemInstruction = "Improve this text by making it clearer, more engaging, and better written. Keep the same general meaning.";
        break;
      case "shorter":
        systemInstruction = "Make this text shorter and more concise while keeping the key information.";
        break;
      case "longer":
        systemInstruction = "Expand this text with more detail, examples, or elaboration.";
        break;
      case "formal":
        systemInstruction = "Rewrite this text in a more formal, professional tone.";
        break;
      case "casual":
        systemInstruction = "Rewrite this text in a more casual, conversational tone.";
        break;
      case "fix_grammar":
        systemInstruction = "Fix any grammar, spelling, or punctuation errors in this text.";
        break;
      case "simplify":
        systemInstruction = "Simplify this text to make it easier to understand. Use simpler words and shorter sentences.";
        break;
      case "continue":
        systemInstruction = "Continue writing from where this text ends. Match the style and topic.";
        break;
      case "custom":
      default:
        systemInstruction = instruction;
        break;
    }

    const systemPrompt = `You are a helpful writing assistant. Your task is to transform or edit text based on instructions.
Return ONLY the transformed text without any explanation, preamble, or quotes around it.
${documentContext ? `\nContext from the document (for reference):\n${documentContext}` : ""}`;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `${systemInstruction}\n\nText to transform:\n${selectedText}`,
      },
    ];

    const response = await callOpenAI(messages);

    return response;
  },
});

/**
 * Generate content based on a prompt
 */
export const generate = action({
  args: {
    prompt: v.string(),
    documentId: v.optional(v.id("nodes")),
    folderId: v.optional(v.id("nodes")),
    type: v.optional(
      v.union(
        v.literal("paragraph"),
        v.literal("outline"),
        v.literal("ideas"),
        v.literal("draft")
      )
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const { prompt, documentId, folderId, type = "paragraph" } = args;

    // Build context from documents
    let documentContext = "";
    if (documentId) {
      const doc = await ctx.runQuery(api.nodes.get, { id: documentId });
      if (doc && doc.type === "doc") {
        const text = extractTextFromContent(doc.content);
        if (text) {
          documentContext = text.slice(0, 3000);
        }
      }
    }

    let typeInstruction = "";
    switch (type) {
      case "outline":
        typeInstruction = "Generate a structured outline with main points and sub-points.";
        break;
      case "ideas":
        typeInstruction = "Generate a list of creative ideas or suggestions.";
        break;
      case "draft":
        typeInstruction = "Generate a complete first draft.";
        break;
      default:
        typeInstruction = "Generate clear, well-written content.";
    }

    const systemPrompt = `You are a helpful writing assistant. ${typeInstruction}
Write in a clear, professional style.
${documentContext ? `\nExisting document content for context:\n${documentContext}` : ""}`;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    const response = await callOpenAI(messages, {
      maxTokens: 2048,
    });

    return response;
  },
});

/**
 * Write AI-generated content to a document
 * This appends or replaces content in the document
 */
export const writeToDocument = action({
  args: {
    documentId: v.id("nodes"),
    content: v.string(),
    mode: v.union(v.literal("append"), v.literal("replace")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const { documentId, content, mode } = args;

    try {
      const doc = await ctx.runQuery(api.nodes.get, { id: documentId });
      if (!doc || doc.type !== "doc") {
        return { success: false, error: "Document not found" };
      }

      // Convert the AI-generated text to TipTap JSON format
      // Create a simple paragraph structure
      const paragraphs = content.split("\n\n").filter(p => p.trim());
      const tiptapContent = {
        type: "doc",
        content: paragraphs.map(p => ({
          type: "paragraph",
          content: [{ type: "text", text: p.trim() }]
        }))
      };

      let newContent: any;
      if (mode === "replace") {
        newContent = tiptapContent;
      } else {
        // Append mode - merge with existing content
        let existingContent: any = { type: "doc", content: [] };
        if (doc.content) {
          try {
            existingContent = typeof doc.content === "string"
              ? JSON.parse(doc.content)
              : doc.content;
          } catch {
            existingContent = { type: "doc", content: [] };
          }
        }

        // Ensure existing content has the right structure
        if (!existingContent.content) {
          existingContent.content = [];
        }

        // Add a separator and the new content
        newContent = {
          type: "doc",
          content: [
            ...existingContent.content,
            { type: "paragraph", content: [] }, // Empty line separator
            ...tiptapContent.content
          ]
        };
      }

      // Update the document
      await ctx.runMutation(api.nodes.updateContent, {
        id: documentId,
        content: JSON.stringify(newContent),
      });

      return { success: true };
    } catch (error) {
      console.error("Error writing to document:", error);
      return { success: false, error: "Failed to write to document" };
    }
  },
});

/**
 * Auto-format content - converts plain or messy text into well-structured TipTap JSON
 * Uses GPT-4o-mini for fast response times
 */
export const autoFormat = action({
  args: {
    text: v.string(),
    documentId: v.optional(v.id("nodes")),
  },
  handler: async (ctx, args): Promise<{ success: boolean; content?: any; error?: string }> => {
    const { text } = args;

    if (!text || text.trim().length === 0) {
      return { success: false, error: "No content to format" };
    }

    // Concise prompt for faster processing
    const systemPrompt = `Convert text to TipTap JSON. Use headings (level 1-3), paragraphs, bulletList/orderedList with listItem nodes. Preserve all content. Return ONLY valid JSON:
{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Title"}]},{"type":"paragraph","content":[{"type":"text","text":"Text"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Item"}]}]}]}]}`;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ];

    try {
      // Use GPT-4o-mini for fast formatting
      const response = await callOpenAI(messages, {
        model: FAST_MODEL,
        maxTokens: 8192
      });

      // Parse the response as JSON
      let jsonContent;
      try {
        let cleanedResponse = response.trim();
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.slice(7);
        } else if (cleanedResponse.startsWith("```")) {
          cleanedResponse = cleanedResponse.slice(3);
        }
        if (cleanedResponse.endsWith("```")) {
          cleanedResponse = cleanedResponse.slice(0, -3);
        }
        jsonContent = JSON.parse(cleanedResponse.trim());
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        // Fallback: simple paragraph structure
        const paragraphs = text.split("\n\n").filter(p => p.trim());
        jsonContent = {
          type: "doc",
          content: paragraphs.map(p => ({
            type: "paragraph",
            content: [{ type: "text", text: p.trim() }]
          }))
        };
      }

      return { success: true, content: jsonContent };
    } catch (error) {
      console.error("Auto-format error:", error);
      return { success: false, error: "Failed to format content" };
    }
  },
});

/**
 * Summarize a document or folder
 */
export const summarize = action({
  args: {
    documentId: v.optional(v.id("nodes")),
    folderId: v.optional(v.id("nodes")),
    style: v.optional(
      v.union(
        v.literal("brief"),
        v.literal("detailed"),
        v.literal("bullets"),
        v.literal("executive")
      )
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const { documentId, folderId, style = "brief" } = args;

    let content = "";
    let title = "";

    if (documentId) {
      const doc = await ctx.runQuery(api.nodes.get, { id: documentId });
      if (doc && doc.type === "doc") {
        title = doc.title;
        content = extractTextFromContent(doc.content);
      }
    } else if (folderId) {
      const folder = await ctx.runQuery(api.nodes.get, { id: folderId });
      title = folder?.title || "Folder";

      const children = await ctx.runQuery(api.nodes.getChildren, {
        parentId: folderId,
        orgId: folder?.orgId,
      });
      const docContents = [];
      for (const child of children) {
        if (child.type === "doc" && !child.isDeleted) {
          const text = extractTextFromContent(child.content);
          if (text) {
            docContents.push(`## ${child.title}\n${text}`);
          }
        }
      }
      content = docContents.join("\n\n---\n\n");
    }

    if (!content) {
      return "No content found to summarize.";
    }

    let styleInstruction = "";
    switch (style) {
      case "detailed":
        styleInstruction = "Provide a comprehensive summary covering all major points and details.";
        break;
      case "bullets":
        styleInstruction = "Summarize as a bullet-point list of key points.";
        break;
      case "executive":
        styleInstruction = "Provide an executive summary suitable for quick decision-making.";
        break;
      default:
        styleInstruction = "Provide a brief, concise summary of the main points.";
    }

    const messages: Message[] = [
      {
        role: "system",
        content: `You are a helpful assistant that summarizes documents. ${styleInstruction}`,
      },
      {
        role: "user",
        content: `Summarize the following content from "${title}":\n\n${content}`,
      },
    ];

    const response = await callOpenAI(messages);

    return response;
  },
});
