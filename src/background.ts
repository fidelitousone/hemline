import { OpenRouter } from "@openrouter/sdk"

console.log("Service Worker Sanity Check")

chrome.runtime.onMessage.addListener(
    (message: { type: string; apiKey?: string }, _sender, sendResponse) => {
        if (message.type === 'testApiKey') {
            const client = new OpenRouter({ apiKey: message.apiKey ?? '' })
            client.models.count()
                .then((result) => {
                    console.debug('[hemline] OpenRouter OK —', result.data.count, 'models available')
                    sendResponse({ success: true, modelCount: result.data.count })
                })
                .catch((err) => {
                    console.error('[hemline] OpenRouter error:', err)
                    sendResponse({ success: false, error: String(err) })
                })
            return true // keep message channel open for async response
        }
    }
)