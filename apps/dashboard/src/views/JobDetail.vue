<template>
  <div>
    <RouterLink to="/" class="mb-4 inline-block text-sm text-blue-600 hover:underline">
      ← Back to tracker
    </RouterLink>

    <p v-if="loading" class="text-sm text-gray-500">Loading…</p>
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <template v-else-if="job">
      <div class="mb-6">
        <h1 class="text-xl font-semibold text-gray-900">{{ job.title ?? 'Untitled role' }}</h1>
        <p class="text-sm text-gray-500">{{ job.company ?? job.sourceAts }}</p>
        <div class="mt-2 flex items-center gap-2 text-xs">
          <select
            :value="job.status"
            class="rounded border border-gray-300 px-2 py-1"
            @change="onStatusChange"
          >
            <option v-for="status in JOB_STATUS" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
          <a :href="job.url" target="_blank" rel="noopener" class="text-blue-600 hover:underline">
            View posting
          </a>
          <button class="text-gray-500 hover:text-gray-700" @click="checkNow">
            Check listing now
          </button>
        </div>
        <p v-if="job.relistedFromJobId" class="mt-2 text-xs text-purple-700">
          This role was previously rejected and appears to have been relisted.
          <RouterLink :to="`/jobs/${job.relistedFromJobId}`" class="underline">
            View prior posting
          </RouterLink>
        </p>
      </div>

      <section class="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 class="mb-2 text-sm font-semibold text-gray-700">Job Description</h2>
        <p class="whitespace-pre-wrap text-sm text-gray-600">{{ job.rawDescription }}</p>
      </section>

      <section class="rounded border border-gray-200 bg-white p-4">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">Tailoring</h2>

        <div v-if="!run">
          <button
            class="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            @click="startTailoring"
          >
            Send to Tailor
          </button>
        </div>

        <div v-else>
          <p class="mb-3 text-sm">
            Status:
            <span class="font-medium">{{ run.status }}</span>
            <span v-if="run.status === 'running'" class="ml-1 text-gray-400">
              (polling…)
            </span>
          </p>

          <div v-if="revisions.length > 0" class="mb-4">
            <label class="mb-1 block text-xs font-medium text-gray-600">Revision</label>
            <select v-model.number="selectedRevisionIndex" class="rounded border border-gray-300 px-2 py-1 text-sm">
              <option v-for="(rev, idx) in revisions" :key="rev.id" :value="idx">
                #{{ rev.revisionNumber }} — {{ rev.compileStatus }}
              </option>
            </select>

            <div class="mt-3 grid grid-cols-2 gap-4">
              <div>
                <h3 class="mb-1 text-xs font-semibold text-gray-600">Diff vs. previous revision</h3>
                <pre class="max-h-96 overflow-auto rounded bg-gray-900 p-3 text-xs"><span
                  v-for="(part, idx) in diffParts"
                  :key="idx"
                  :class="diffPartClass(part)"
                >{{ part.value }}</span></pre>
              </div>
              <div>
                <h3 class="mb-1 text-xs font-semibold text-gray-600">PDF Preview</h3>
                <iframe
                  v-if="selectedRevision?.compileStatus === 'success'"
                  :src="pdfPreviewUrl"
                  class="h-96 w-full rounded border border-gray-200"
                />
                <p v-else class="text-xs text-red-600">
                  {{ selectedRevision?.compileError ?? 'This revision did not compile.' }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-end gap-2">
            <div class="flex-1">
              <label class="mb-1 block text-xs font-medium text-gray-600" for="feedback">
                Request changes
              </label>
              <textarea
                id="feedback"
                v-model="feedback"
                rows="2"
                class="w-full rounded border border-gray-300 p-2 text-sm"
                placeholder="e.g. emphasize the Kubernetes experience more"
              />
            </div>
            <button
              :disabled="!feedback.trim() || revising"
              class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              @click="submitRevision"
            >
              {{ revising ? 'Submitting…' : 'Request Changes' }}
            </button>
            <button
              :disabled="selectedRevision?.compileStatus !== 'success' || approving"
              class="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              @click="approve"
            >
              {{ approving ? 'Approving…' : 'Approve & Download' }}
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { diffLines } from 'diff';
import {
  JOB_STATUS,
  type JobDto,
  type JobStatus,
  type TailoringRevisionDto,
  type TailoringRunDto,
} from '@hemline/shared-types';
import { api } from '../api/client';

const props = defineProps<{ id: string }>();

const job = ref<JobDto | null>(null);
const run = ref<TailoringRunDto | null>(null);
const loading = ref(true);
const error = ref('');
const feedback = ref('');
const revising = ref(false);
const approving = ref(false);
const selectedRevisionIndex = ref(0);
let pollHandle: ReturnType<typeof setInterval> | null = null;

const revisions = computed<TailoringRevisionDto[]>(() => run.value?.revisions ?? []);
const selectedRevision = computed(() => revisions.value[selectedRevisionIndex.value] ?? null);
const previousRevision = computed(() => revisions.value[selectedRevisionIndex.value - 1] ?? null);

const diffParts = computed(() => {
  const before = previousRevision.value?.texContent ?? '';
  const after = selectedRevision.value?.texContent ?? '';
  if (!before) return [{ value: after, added: false, removed: false }];
  return diffLines(before, after);
});

function diffPartClass(part: { added?: boolean; removed?: boolean }): string {
  if (part.added) return 'text-green-400';
  if (part.removed) return 'text-red-400 line-through';
  return 'text-gray-300';
}

const pdfPreviewUrl = computed(() => {
  if (!run.value || !selectedRevision.value) return '';
  return api.revisionPdfUrl(run.value.id, selectedRevision.value.id);
});

async function loadJob() {
  loading.value = true;
  error.value = '';
  try {
    const result = await api.getJob(props.id);
    job.value = result.job;
    const latestRun = result.tailoringRuns[0];
    if (latestRun) {
      run.value = await api.getTailoringRun(latestRun.id);
      selectedRevisionIndex.value = Math.max(0, (run.value.revisions?.length ?? 1) - 1);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load job';
  } finally {
    loading.value = false;
  }
}

function stopPolling() {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = null;
}

function pollRun() {
  stopPolling();
  pollHandle = setInterval(async () => {
    if (!run.value) return stopPolling();
    const updated = await api.getTailoringRun(run.value.id);
    run.value = updated;
    selectedRevisionIndex.value = Math.max(0, (updated.revisions?.length ?? 1) - 1);
    if (updated.status !== 'running' && updated.status !== 'queued') {
      stopPolling();
    }
  }, 3000);
}

async function startTailoring() {
  await api.triggerTailor(props.id);
  await loadJob();
  pollRun();
}

async function submitRevision() {
  if (!run.value) return;
  revising.value = true;
  try {
    await api.reviseTailoringRun(run.value.id, { feedback: feedback.value });
    feedback.value = '';
    pollRun();
  } finally {
    revising.value = false;
  }
}

async function approve() {
  if (!run.value) return;
  approving.value = true;
  try {
    const { downloadUrl } = await api.approveTailoringRun(run.value.id);
    window.location.href = downloadUrl;
  } finally {
    approving.value = false;
  }
}

async function checkNow() {
  await api.checkJobNow(props.id);
  await loadJob();
}

async function onStatusChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  if (!job.value) return;
  job.value = await api.updateJobStatus(job.value.id, select.value as JobStatus);
}

onMounted(loadJob);
onUnmounted(stopPolling);
</script>
