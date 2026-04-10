type MessageHandler = (
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => true | void;

type MessageHandlerMap = Record<string, MessageHandler>;

export type { MessageHandler, MessageHandlerMap };
