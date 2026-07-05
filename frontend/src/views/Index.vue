<script setup>
import { defineAsyncComponent, onMounted, watch } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useRoute } from 'vue-router'

import { useGlobalState } from '../store'
import { api } from '../api'
import { useIsMobile } from '../utils/composables'
import { FullscreenExitOutlined } from '@vicons/material'

import AddressBar from './index/AddressBar.vue';
import MailBox from '../components/MailBox.vue';
import SendBox from '../components/SendBox.vue';
import AutoReply from './index/AutoReply.vue';
import AccountSettings from './index/AccountSettings.vue';
import Appearance from './common/Appearance.vue';
import Webhook from './index/Webhook.vue';
import Attachment from './index/Attachment.vue';
import About from './common/About.vue';
import SimpleIndex from './index/SimpleIndex.vue';

const { loading, settings, openSettings, indexTab, useSimpleIndex } = useGlobalState()
const message = useMessage()
const route = useRoute()
const isMobile = useIsMobile()

const SendMail = defineAsyncComponent(() => {
  loading.value = true;
  return import('./index/SendMail.vue')
    .finally(() => loading.value = false);
});

const { t } = useScopedI18n('views.Index')

const fetchMailData = async (limit, offset) => {
  if (mailIdQuery.value > 0) {
    const singleMail = await api.fetch(`/api/mail/${mailIdQuery.value}`);
    if (singleMail) return { results: [singleMail], count: 1 };
    return { results: [], count: 0 };
  }
  return await api.fetch(`/api/mails?limit=${limit}&offset=${offset}`);
};

const deleteMail = async (curMailId) => {
  await api.fetch(`/api/mails/${curMailId}`, { method: 'DELETE' });
};

const deleteSenboxMail = async (curMailId) => {
  await api.fetch(`/api/sendbox/${curMailId}`, { method: 'DELETE' });
};

const fetchSenboxData = async (limit, offset) => {
  return await api.fetch(`/api/sendbox?limit=${limit}&offset=${offset}`);
};

const saveToS3 = async (mail_id, filename, blob) => {
  try {
    const { url } = await api.fetch(`/api/attachment/put_url`, {
      method: 'POST',
      body: JSON.stringify({ key: `${mail_id}/${filename}` })
    });
    // upload to s3 by formdata
    const formData = new FormData();
    formData.append(filename, blob);
    await fetch(url, {
      method: 'PUT',
      body: formData
    });
    message.success(t('saveToS3Success'));
  } catch (error) {
    console.error(error);
    message.error(error.message || "save to s3 error");
  }
}

const mailBoxKey = ref("")
const mailIdQuery = ref("")
const showMailIdQuery = ref(false)

const queryMail = () => {
  mailBoxKey.value = Date.now();
}

watch(route, () => {
  if (!route.query.mail_id) {
    showMailIdQuery.value = false;
    mailIdQuery.value = "";
    queryMail();
  }
})

onMounted(() => {
  if (route.query.mail_id) {
    showMailIdQuery.value = true;
    mailIdQuery.value = route.query.mail_id;
    queryMail();
  }
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--home': !settings.address }">
    <div v-if="useSimpleIndex">
      <SimpleIndex />
    </div>
    <div v-else-if="settings.address" class="mail-app">
      <AddressBar />
      <n-tabs v-if="settings.address" class="app-sidebar-tabs" type="card" v-model:value="indexTab"
        :placement="isMobile ? 'top' : 'left'">
        <template #prefix>
          <n-button @click="useSimpleIndex = true" tertiary size="small">
            <template #icon>
              <n-icon>
                <FullscreenExitOutlined />
              </n-icon>
            </template>
            {{ t('enterSimpleMode') }}
          </n-button>
        </template>
        <n-tab-pane name="mailbox" :tab="t('mailbox')">
          <div v-if="showMailIdQuery" style="margin-bottom: 10px;">
            <n-input-group>
              <n-input v-model:value="mailIdQuery" />
              <n-button @click="queryMail" type="primary" tertiary>
                {{ t('query') }}
              </n-button>
            </n-input-group>
          </div>
          <MailBox :key="mailBoxKey" :showEMailTo="false" :showReply="openSettings.enableSendMail" :showSaveS3="openSettings.isS3Enabled"
            :saveToS3="saveToS3" :enableUserDeleteEmail="openSettings.enableUserDeleteEmail"
            :fetchMailData="fetchMailData" :deleteMail="deleteMail" :showFilterInput="true" />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableSendMail" name="sendbox" :tab="t('sendbox')">
          <SendBox :fetchMailData="fetchSenboxData" :enableUserDeleteEmail="openSettings.enableUserDeleteEmail"
            :deleteMail="deleteSenboxMail" />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableSendMail" name="sendmail" :tab="t('sendmail')">
          <SendMail />
        </n-tab-pane>
        <n-tab-pane name="accountSettings" :tab="t('accountSettings')">
          <AccountSettings />
        </n-tab-pane>
        <n-tab-pane name="appearance" :tab="t('appearance')">
          <Appearance :showUseSimpleIndex="true" />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableAutoReply" name="auto_reply" :tab="t('auto_reply')">
          <AutoReply />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableWebhook" name="webhook" :tab="t('webhookSettings')">
          <Webhook />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.isS3Enabled" name="s3_attachment" :tab="t('s3Attachment')">
          <Attachment />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableIndexAbout" name="about" :tab="t('about')">
          <About />
        </n-tab-pane>
      </n-tabs>
    </div>
    <div v-else class="home-dashboard">
      <section class="home-dashboard__intro">
        <span class="home-eyebrow">{{ openSettings.title || t('mailbox') }}</span>
        <h1 class="home-title">{{ openSettings.title || t('mailbox') }}</h1>
        <p v-if="openSettings.description" class="home-copy">
          {{ openSettings.description }}
        </p>
      </section>
      <section class="home-dashboard__panel">
        <div class="home-panel">
          <div class="home-panel__bar">
            <span class="home-panel__dot home-panel__dot--red"></span>
            <span class="home-panel__dot home-panel__dot--yellow"></span>
            <span class="home-panel__dot home-panel__dot--green"></span>
          </div>
          <div class="home-panel__body">
            <AddressBar />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
