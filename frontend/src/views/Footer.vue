<script setup>
import { useScopedI18n } from '@/i18n/app'

const { t } = useScopedI18n('views.Footer')

</script>

<template>
    <div class="app-footer">
        <div class="footer-content">
            <n-space justify="center">
                <n-text depth="3">
                    {{ t('copyright') }} © 2023-2026 GetAnEmail
                </n-text>
            </n-space>
        </div>
    </div>
</template>


<style scoped>
.app-footer {
    padding-bottom: 10px;
}

.footer-content {
    padding: 20px 20px 22px;
    text-align: center;
}
</style>
