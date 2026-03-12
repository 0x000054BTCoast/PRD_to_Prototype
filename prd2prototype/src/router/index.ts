import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import ParserPage from '../pages/ParserPage.vue';
import PrototypePage from '../pages/PrototypePage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/parser',
    name: 'parser',
    component: ParserPage
  },
  {
    path: '/prototype',
    name: 'prototype',
    component: PrototypePage
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
