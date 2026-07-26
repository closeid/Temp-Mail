<script setup>
import UserLogin from './user/UserLogin.vue'
</script>

<template>
  <section class="home-auth-shell">
    <n-card class="home-auth-card" :bordered="false" embedded>
      <UserLogin />
    </n-card>
  </section>
</template>
