<script setup>
import { onMounted, ref } from 'vue'
import { useScopedI18n } from '@/i18n/app'

import { api } from '../api'
import { useGlobalState } from '../store'
import { hashPassword } from '../utils'
import Turnstile from './Turnstile.vue'

const message = useMessage()
const notification = useNotification()
const { t } = useScopedI18n('views.Header')
const { showAuth, auth, loading, openSettings } = useGlobalState()

const cfToken = ref('')
const turnstileRef = ref(null)

const authenticate = async () => {
  try {
    await api.fetch('/open_api/site_login', {
      method: 'POST',
      body: JSON.stringify({
        password: await hashPassword(auth.value),
        cf_token: cfToken.value,
      }),
    })
    location.reload()
  } catch (error) {
    message.error(error.message || 'error')
    turnstileRef.value?.refresh?.()
  }
}

onMounted(async () => {
  await api.getOpenSettings(message, notification)
  await api.getUserSettings(message)
})
</script>

<template>
  <n-modal v-model:show="showAuth" :closable="false" :close-on-esc="false" :mask-closable="false"
    preset="dialog" :title="t('accessHeader')">
    <p>{{ t('accessTip') }}</p>
    <n-input v-model:value="auth" type="password" show-password-on="click" @keyup.enter="authenticate" />
    <Turnstile ref="turnstileRef" v-if="openSettings.enableGlobalTurnstileCheck" v-model:value="cfToken" />
    <template #action>
      <n-button :loading="loading" type="primary" @click="authenticate">
        {{ t('ok') }}
      </n-button>
    </template>
  </n-modal>
</template>
