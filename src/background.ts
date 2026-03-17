import { OpenRouter } from "@openrouter/sdk"

console.log("Service Worker Sanity Check")

chrome.runtime.onMessage.addListener(
    (message: { type: string; apiKey?: string }, _sender, sendResponse) => {
        if (message.type === 'testApiKey') {
            const client = new OpenRouter({ apiKey: message.apiKey ?? '' })
            //TODO: Change the model to use claude officially, gpt-4o is cheap enough for testing
            client.chat.send({chatGenerationParams: {model: 'openai/gpt-4o', messages: [{role: "system", content: "hi"}], stream: false}})
                .then((message) => {
                    console.log('Success! You are connected to OpenRouter.')
                    sendResponse({ success: true, choices: message.choices })
                })
                .catch((err) => {
                    console.error('There was a problem connecting to OpenRouter:', err)
                    sendResponse({ success: false, error: String(err) })
                })
            return true
        }
    }
)