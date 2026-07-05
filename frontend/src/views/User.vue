<script setup>
import { useScopedI18n } from '@/i18n/app'
import { useIsMobile } from '../utils/composables'

import { useGlobalState } from '../store'

import AddressMangement from './user/AddressManagement.vue';
import UserSettingsPage from './user/UserSettings.vue';
import UserBar from './user/UserBar.vue';
import BindAddress from './user/BindAddress.vue';
import UserMailBox from './user/UserMailBox.vue';

const {
    userTab, userSettings
} = useGlobalState()

const { t } = useScopedI18n('views.User')
const isMobile = useIsMobile()

</script>

<template>
    <div class="app-shell">
        <UserBar />
        <n-tabs v-if="userSettings.user_email" class="app-sidebar-tabs" type="card" v-model:value="userTab"
            :placement="isMobile ? 'top' : 'left'">
            <n-tab-pane name="address_management" :tab="t('address_management')">
                <AddressMangement />
            </n-tab-pane>
            <n-tab-pane name="user_mail_box_tab" :tab="t('user_mail_box_tab')">
                <UserMailBox />
            </n-tab-pane>
            <n-tab-pane name="user_settings" :tab="t('user_settings')">
                <UserSettingsPage />
            </n-tab-pane>
            <n-tab-pane name="bind_address" :tab="t('bind_address')">
                <BindAddress />
            </n-tab-pane>
        </n-tabs>
    </div>
</template>
