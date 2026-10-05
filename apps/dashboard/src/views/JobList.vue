<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900">Tracked Jobs</h1>
      <select
        v-model="statusFilter"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm"
      >
        <option value="">All statuses</option>
        <option v-for="status in JOB_STATUS" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
    </div>

    <p v-if="loading" class="text-sm text-gray-500">Loading…</p>
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="jobs.length === 0" class="text-sm text-gray-500">
      No jobs tracked yet. Capture one from the extension.
    </p>

    <ul v-else class="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
      <li v-for="job in jobs" :key="job.id">
        <RouterLink
          :to="`/jobs/${job.id}`"
          class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-gray-900">
              {{ job.title ?? 'Untitled role' }}
            </p>
            <p class="truncate text-xs text-gray-500">
              {{ job.company ?? job.sourceAts }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <span
              v-if="job.relistedFromJobId"
              class="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
              title="This role was previously rejected and has reappeared"
            >
              Relisted
            </span>
            <span :class="liveIndicatorClass(job.isLive)" title="Listing liveness" />
            <span class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {{ job.status }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { JOB_STATUS, type JobDto } from '@hemline/shared-types';
import { api } from '../api/client';

const jobs = ref<JobDto[]>([]);
const loading = ref(true);
const error = ref('');
const statusFilter = ref('');

function liveIndicatorClass(isLive: boolean | null): string {
  const base = 'inline-block h-2.5 w-2.5 rounded-full';
  if (isLive === true) return `${base} bg-green-500`;
  if (isLive === false) return `${base} bg-red-500`;
  return `${base} bg-gray-300`;
}

async function loadJobs() {
  loading.value = true;
  error.value = '';
  try {
    jobs.value = await api.listJobs(statusFilter.value || undefined);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load jobs';
  } finally {
    loading.value = false;
  }
}

onMounted(loadJobs);
watch(statusFilter, loadJobs);
</script>
