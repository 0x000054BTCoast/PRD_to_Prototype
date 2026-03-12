<template>
  <el-container class="app-shell">
    <AppHeader />
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}
</style>
