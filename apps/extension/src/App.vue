<template>
  <div class="w-80 min-h-130">
    <div class="flex border-b border-gray-300">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 py-2 text-sm font-medium"
        :class="
          activeTab === tab.id
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="p-4">
      <template v-if="activeTab === 'job'">
        <p v-if="jobTitle" class="text-base font-semibold mb-1">
          {{ jobTitle }}
        </p>
        <label class="block text-sm mb-1" for="job-description">
          Job Description
        </label>
        <textarea
          id="job-description"
          v-model="jobDescription"
          class="w-full h-72 border border-gray-300 rounded p-2 text-sm resize-none"
          placeholder="Paste the job description here..."
        />
        <div class="mt-3 flex gap-2">
          <button
            :disabled="!jobDescription || tailorStatus === 'sending'"
            class="flex-1 text-white text-sm font-medium py-2 rounded transition-colors"
            :class="
              jobDescription && tailorStatus !== 'sending'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-300 cursor-not-allowed'
            "
            @click="sendToTailor"
          >
            {{ tailorButtonLabel }}
          </button>
          <button
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
            @click="copyJobDescription"
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
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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
        <p v-if="tailorStatus === 'sent'" class="mt-2 text-sm text-green-600">
          Sent to the tailoring pipeline — check the dashboard for progress.
        </p>
        <p v-if="tailorStatus === 'error'" class="mt-2 text-sm text-red-600">
          Couldn't reach the backend. Check the Backend Base URL in Settings.
        </p>
      </template>

      <template v-else-if="activeTab === 'settings'">
        <label class="block text-sm mb-1" for="years-of-experience">
          Your Years of Experience
        </label>
        <input
          id="years-of-experience"
          v-model.number="yearsOfExperience"
          type="number"
          min="0"
          class="w-full border border-gray-300 rounded p-2 text-sm"
          placeholder="e.g. 5"
        />

        <label class="block text-sm mb-1 mt-4" for="backend-base-url">
          Backend Base URL
        </label>
        <input
          id="backend-base-url"
          v-model="backendBaseUrl"
          type="text"
          class="w-full border border-gray-300 rounded p-2 text-sm"
          placeholder="http://localhost:3000"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { detectJobData } from './ats-detector';
import type { SourceAts } from '@hemline/shared-types';

const tabs = [
  { id: 'job', label: 'Job Description' },
  { id: 'settings', label: 'Settings' },
];

const activeTab = ref('job');
const jobTitle = ref('');
const jobDescription = ref('');
const jobUrl = ref('');
const sourceAts = ref<SourceAts>('other');
const copied = ref(false);
const yearsOfExperience = ref<number | null>(null);
const backendBaseUrl = ref('');
const tailorStatus = ref<'idle' | 'sending' | 'sent' | 'error'>('idle');

const tailorButtonLabel = computed(() => {
  if (tailorStatus.value === 'sending') return 'Sending…';
  if (tailorStatus.value === 'sent') return 'Sent';
  return 'Send to Tailor';
});

onMounted(async () => {
  const stored = await chrome.storage.local.get([
    'yearsOfExperience',
    'backendBaseUrl',
  ]);
  if (typeof stored.yearsOfExperience === 'number') {
    yearsOfExperience.value = stored.yearsOfExperience;
  }
  backendBaseUrl.value = stored.backendBaseUrl || 'http://localhost:3000';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  jobUrl.value = tab?.url ?? '';
  if (tab?.id) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectJobData,
      });
      const jobData = results[0]?.result;
      if (jobData?.jobTitle) jobTitle.value = jobData.jobTitle;
      if (jobData?.jobDescription) jobDescription.value = jobData.jobDescription;
      if (jobData?.sourceAts) sourceAts.value = jobData.sourceAts;
    } catch {
      // Unsupported page or scripting not permitted
    }
  }
});

watch(yearsOfExperience, (value) => {
  if (value !== null) chrome.storage.local.set({ yearsOfExperience: value });
});

watch(backendBaseUrl, (value) => {
  chrome.storage.local.set({ backendBaseUrl: value });
});

async function copyJobDescription() {
  if (!jobDescription.value) return;
  await navigator.clipboard.writeText(jobDescription.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

async function sendToTailor() {
  tailorStatus.value = 'sending';
  try {
    const captureResponse = await fetch(`${backendBaseUrl.value}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: jobUrl.value,
        jobTitle: jobTitle.value,
        jobDescription: jobDescription.value,
        sourceAts: sourceAts.value,
      }),
    });
    if (!captureResponse.ok) throw new Error(`Capture failed: ${captureResponse.status}`);
    const { job } = await captureResponse.json();

    const tailorResponse = await fetch(`${backendBaseUrl.value}/api/jobs/${job.id}/tailor`, {
      method: 'POST',
    });
    if (!tailorResponse.ok) throw new Error(`Tailor trigger failed: ${tailorResponse.status}`);

    tailorStatus.value = 'sent';
  } catch (err) {
    console.error('[hemline] sendToTailor failed:', err);
    tailorStatus.value = 'error';
  }
}
</script>
