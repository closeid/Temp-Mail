<script setup>
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../../store'

const { userSettings } = useGlobalState()

const { t } = useScopedI18n('views.user.UserBar')
</script>

<template>
    <div>
        <n-card :bordered="false" embedded v-if="!userSettings.fetched">
            <n-skeleton style="height: 50vh" />
        </n-card>
        <div v-else-if="userSettings.user_email">
            <n-alert class="user-session-bar" type="success" :show-icon="false" :bordered="false">
                <span>
                    <b>{{ t('currentUser') }} <b>{{ userSettings.user_email }}</b></b>
                </span>
            </n-alert>
        </div>
    </div>
</template>

<style scoped>
.n-alert {
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
}

</style>
