import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '@/components/brand'
import { api } from '@/lib/api'
import { appStore } from '@/lib/store'
import { stringifyError } from '@/lib/utils'
import { getPathWithLocale } from '@/i18n/utils'
import { useScopedI18n } from '@/i18n/react'

export function OauthCallback() {
  const { t, locale } = useScopedI18n('views.user.UserOauth2Callback')
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(location.search)
        if (params.get('state') !== appStore.getState().userOauth2SessionState) throw new Error(t('stateNotMatch'))
        const code = params.get('code')
        if (!code) throw new Error(t('codeNotFound'))
        const result = await api.fetch<{ jwt: string }>('/api/user/oauth2/callback', { method: 'POST', body: { code, clientID: appStore.getState().userOauth2SessionClientID } })
        await api.activateUserSession(result.jwt)
        navigate(getPathWithLocale('/', locale), { replace: true })
      } catch (reason) { const message = stringifyError(reason); setError(message); toast.error(message) }
      finally { appStore.setState({ userOauth2SessionState: '', userOauth2SessionClientID: '' }) }
    }
    run()
  }, [locale, location.search, navigate, t])
  return <main className="grid min-h-[100dvh] place-items-center"><div className="grid justify-items-center gap-5"><Brand compact className="[&>span]:size-14 [&_svg]:size-7" /><LoaderCircle className="size-5 animate-spin text-primary" /><p className="text-sm text-muted-foreground">{error || t('logging')}</p></div></main>
}
