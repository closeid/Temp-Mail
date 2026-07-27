import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { SettingRow, SettingsLayout } from '@/components/layout/settings-layout'
import { appStore, useAppStore } from '@/lib/store'
import { useScopedI18n } from '@/i18n/react'

export function AppearanceSettings({ showSimpleIndex = false }: { showSimpleIndex?: boolean }) {
  const { t } = useScopedI18n('views.common.Appearance')
  const state = useAppStore((value) => value)
  return <SettingsLayout>
    <div className="hidden md:contents"><SettingRow label={t('mailboxSplitSize')} control={<div className="grid gap-2"><Slider min={0} max={0.75} step={0.01} value={[state.mailboxSplitSize]} onValueChange={([value]) => appStore.setState({ mailboxSplitSize: value })} /><span className="numeric text-xs text-muted-foreground">{state.mailboxSplitSize.toFixed(2)}</span></div>} /><SettingRow label={t('mailListView')} control={<Switch checked={state.mailListView} onCheckedChange={(value) => appStore.setState({ mailListView: value })} />} /><SettingRow label={t('mailListPreviewLineClamp')} control={<div className="grid gap-2"><Slider min={0} max={5} step={1} value={[state.mailListPreviewLineClamp]} onValueChange={([value]) => appStore.setState({ mailListPreviewLineClamp: value })} /><span className="numeric text-xs text-muted-foreground">{state.mailListPreviewLineClamp || t('off')}</span></div>} /></div>
    <SettingRow label={t('autoRefreshInterval')} control={<div className="grid gap-2"><Slider min={30} max={300} step={1} value={[state.configAutoRefreshInterval]} onValueChange={([value]) => appStore.setState({ configAutoRefreshInterval: value })} /><span className="numeric text-xs text-muted-foreground">{state.configAutoRefreshInterval}s</span></div>} />
    {showSimpleIndex && <SettingRow label={t('useSimpleIndex')} control={<Switch checked={state.useSimpleIndex} onCheckedChange={(value) => appStore.setState({ useSimpleIndex: value })} />} />}
    <SettingRow label={t('preferShowTextMail')} control={<Switch checked={state.preferShowTextMail} onCheckedChange={(value) => appStore.setState({ preferShowTextMail: value })} />} />
    <SettingRow label={t('useIframeShowMail')} control={<Switch checked={state.useIframeShowMail} onCheckedChange={(value) => appStore.setState({ useIframeShowMail: value })} />} />
    <SettingRow label={t('useUTCDate')} control={<Switch checked={state.useUTCDate} onCheckedChange={(value) => appStore.setState({ useUTCDate: value })} />} />
    <div className="hidden md:contents"><SettingRow label={t('useSideMargin')} control={<Switch checked={state.useSideMargin} onCheckedChange={(value) => appStore.setState({ useSideMargin: value })} />} /></div>
  </SettingsLayout>
}
