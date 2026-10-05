<template>
  <div class="min-h-screen bg-gray-50">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
        <span class="text-lg font-semibold text-gray-900">Hemline</span>
        <nav class="flex gap-4 text-sm font-medium text-gray-600">
          <RouterLink to="/" class="hover:text-blue-600" active-class="text-blue-600">
            Tracker
          </RouterLink>
          <RouterLink to="/resume" class="hover:text-blue-600" active-class="text-blue-600">
            Resume
          </RouterLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-6 py-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts"></script>
