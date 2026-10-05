<template>
  <div>
    <h1 class="mb-4 text-xl font-semibold text-gray-900">Base Resume</h1>

    <div class="rounded border border-gray-200 bg-white p-4">
      <label class="mb-1 block text-sm font-medium text-gray-700" for="tex-file">
        Upload a .tex file
      </label>
      <input id="tex-file" type="file" accept=".tex" class="mb-3 text-sm" @change="onFileChange" />

      <label class="mb-1 block text-sm font-medium text-gray-700" for="tex-content">
        LaTeX source
      </label>
      <textarea
        id="tex-content"
        v-model="texContent"
        rows="16"
        class="w-full rounded border border-gray-300 p-2 font-mono text-xs"
        placeholder="\documentclass{article}..."
      />

      <div class="mt-3 flex items-center gap-3">
        <button
          :disabled="!texContent.trim() || uploading"
          class="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          @click="upload"
        >
          {{ uploading ? 'Uploading…' : 'Upload as new version' }}
        </button>
        <span v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</span>
        <span v-if="uploaded" class="text-sm text-green-600">Uploaded.</span>
      </div>
    </div>

    <h2 class="mt-8 mb-2 text-sm font-semibold text-gray-700">Version History</h2>
    <ul class="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
      <li
        v-for="version in versions"
        :key="version.id"
        class="flex items-center justify-between px-4 py-2 text-sm"
      >
        <span>Version {{ version.versionNumber }}</span>
        <span v-if="version.isCurrent" class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
          current
        </span>
        <span v-else class="text-xs text-gray-400">
          {{ new Date(version.createdAt).toLocaleString() }}
        </span>
      </li>
      <li v-if="versions.length === 0" class="px-4 py-2 text-sm text-gray-500">
        No resume uploaded yet.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ResumeVersionDto } from '@hemline/shared-types';
import { api } from '../api/client';

const texContent = ref('');
const versions = ref<ResumeVersionDto[]>([]);
const uploading = ref(false);
const uploaded = ref(false);
const uploadError = ref('');

async function loadVersions() {
  try {
    versions.value = await api.listResumeVersions();
  } catch {
    // No versions yet, or backend unreachable — leave the list empty.
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    texContent.value = String(reader.result ?? '');
  };
  reader.readAsText(file);
}

async function upload() {
  uploading.value = true;
  uploadError.value = '';
  uploaded.value = false;
  try {
    await api.uploadResume({ texContent: texContent.value, filename: 'resume.tex' });
    uploaded.value = true;
    await loadVersions();
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed';
  } finally {
    uploading.value = false;
  }
}

onMounted(loadVersions);
</script>
