<template>
  <el-header class="app-header">
    <div class="app-header__title">PRD2Prototype</div>
    <el-menu
      :default-active="activeRoute"
      mode="horizontal"
      :ellipsis="false"
      router
      class="app-header__menu"
    >
      <el-menu-item index="/">Home</el-menu-item>
      <el-menu-item index="/parser">Parser</el-menu-item>
      <el-menu-item index="/prototype">Prototype</el-menu-item>
    </el-menu>
  </el-header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activeRoute = computed(() => route.path);
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: #ffffff;
  padding: 0 16px;
}

.app-header__title {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  margin-right: 24px;
}

.app-header__menu {
  flex: 1;
  min-width: 0;
}
</style>
