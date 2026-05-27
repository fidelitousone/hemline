<template>
  <div class="w-80 min-h-130">
    <div class="flex border-b border-gray-300">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 py-2 text-sm font-medium"
        :class="
          activeTab === tab.id
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="p-4">
      <template v-if="activeTab === 'job'">
        <p v-if="jobTitle" class="text-base font-semibold mb-1">{{ jobTitle }}</p>
        <label class="block text-sm mb-1" for="job-description"
          >Job Description</label
        >
        <textarea
          id="job-description"
          v-model="jobDescription"
          class="w-full h-72 border border-gray-300 rounded p-2 text-sm resize-none"
          placeholder="Paste the job description here..."
        />
        <div class="mt-3 flex gap-2">
          <button
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded"
          >
            Tailor Resume
          </button>
          <button
            @click="copyJobDescription"
            :disabled="!jobDescription"
            :title="
              jobDescription ? 'Copy job description' : 'No description to copy'
            "
            class="px-3 py-2 rounded border transition-colors"
            :class="
              jobDescription
                ? 'border-gray-300 hover:bg-gray-100 text-gray-600'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            "
          >
            <svg
              v-if="!copied"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </template>

      <template v-else-if="activeTab === 'api'">
        <label class="block text-sm mb-1" for="api-key"
          >OpenRouter API Key</label
        >
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
          :class="
            apiKey
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-gray-300 cursor-not-allowed'
          "
        >
          Test Key
        </button>
        <p v-if="apiKeySuccess" class="mt-2 text-sm text-green-600">
          Connected to OpenRouter successfully!
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { detectJobData } from './ats-detector';

const tabs = [
  { id: 'job', label: 'Job Description' },
  { id: 'api', label: 'API Key' },
];

const activeTab = ref('job');
const jobTitle = ref('');
const jobDescription = ref('');
const apiKey = ref('');
const apiKeySuccess = ref(false);
const copied = ref(false);

onMounted(async () => {
  const result = await chrome.storage.local.get('openrouterApiKey');
  if (result.openrouterApiKey) {
    apiKey.value = result.openrouterApiKey;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectJobData,
      });
      const jobData = results[0]?.result;
      if (jobData?.jobTitle) jobTitle.value = jobData.jobTitle;
      if (jobData?.jobDescription) jobDescription.value = jobData.jobDescription;
    } catch {
      // Unsupported page or scripting not permitted
    }
  }
});

watch(apiKey, (value) => {
  chrome.storage.local.set({ openrouterApiKey: value });
});

async function copyJobDescription() {
  if (!jobDescription.value) return;
  await navigator.clipboard.writeText(jobDescription.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

async function testApiKey() {
  const response = await chrome.runtime.sendMessage({
    type: 'testApiKey',
    apiKey: apiKey.value,
  });
  console.log('[hemline] testApiKey response:', response);
  apiKeySuccess.value = response?.success === true;
}
</script>
