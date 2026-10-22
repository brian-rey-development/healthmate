export const MESSAGE_ROLES = ['user', 'assistant', 'tool'] as const;

export type MessageRole = (typeof MESSAGE_ROLES)[number];

export type ToolUseBlock = {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
};

// Snake case on purpose. The blocks keep the shape of the model API, so they go back to the model unchanged.
export type ContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'thinking'; readonly thinking: string; readonly signature: string }
  | { readonly type: 'redacted_thinking'; readonly data: string }
  | ToolUseBlock
  | {
      readonly type: 'tool_result';
      readonly tool_use_id: string;
      readonly content: unknown;
      readonly is_error?: boolean;
    };

export type Message = {
  readonly id: string;
  readonly conversationId: string;
  readonly role: MessageRole;
  readonly content: readonly ContentBlock[];
  readonly transcript: string | null;
  readonly model: string | null;
  readonly promptVersion: string | null;
  readonly createdAt: Date;
};
