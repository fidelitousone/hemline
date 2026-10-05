import { createRouter, createWebHistory } from 'vue-router';
import JobList from './views/JobList.vue';
import JobDetail from './views/JobDetail.vue';
import ResumeUpload from './views/ResumeUpload.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'jobs', component: JobList },
    { path: '/jobs/:id', name: 'job-detail', component: JobDetail, props: true },
    { path: '/resume', name: 'resume', component: ResumeUpload },
  ],
});
