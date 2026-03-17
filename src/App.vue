<template>
  <div class="w-80">
    <div class="flex border-b border-gray-300">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 py-2 text-sm font-medium"
        :class="activeTab === tab.id
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="p-4">
      <template v-if="activeTab === 'job'">
        <label class="block text-sm mb-1" for="job-description">Job Description</label>
        <textarea
          id="job-description"
          v-model="jobDescription"
          class="w-full h-40 border border-gray-300 rounded p-2 text-sm resize-none"
          placeholder="Paste the job description here..."
        />
        <button class="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded">
          Tailor Resume
        </button>
      </template>

      <template v-else-if="activeTab === 'api'">
        <label class="block text-sm mb-1" for="api-key">OpenRouter API Key</label>
        <input
          id="api-key"
          v-model="apiKey"
          type="password"
          class="w-full border border-gray-300 rounded p-2 text-sm"
          placeholder="sk-or-..."
        />
        <button
          @click="testApiKey"
          :disabled="!apiKey"
          class="mt-3 w-full text-white text-sm font-medium py-2 rounded transition-colors"
          :class="apiKey
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-300 cursor-not-allowed'"
        >
          Test Key
        </button>
        <p v-if="apiKeySuccess" class="mt-2 text-sm text-green-600">Connected to OpenRouter successfully!</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const tabs = [
  { id: 'job', label: 'Job Description' },
  { id: 'api', label: 'API Key' },
]

const activeTab = ref('job')
const jobDescription = ref('')
const apiKey = ref('')
const apiKeySuccess = ref(false)

onMounted(async () => {
  const result = await chrome.storage.local.get('openrouterApiKey')
  if (result.openrouterApiKey) {
    apiKey.value = result.openrouterApiKey
  }
})

watch(apiKey, (value) => {
  chrome.storage.local.set({ openrouterApiKey: value })
})

async function testApiKey() {
  const response = await chrome.runtime.sendMessage({ type: 'testApiKey', apiKey: apiKey.value })
  console.log('[hemline] testApiKey response:', response)
  apiKeySuccess.value = response?.success === true
}
</script>
