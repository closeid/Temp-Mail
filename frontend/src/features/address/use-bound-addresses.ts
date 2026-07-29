import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export type BoundAddress = {
  id: number
  name?: string
  address?: string
  mail_count?: number
  send_count?: number
}

export const boundAddressesQueryKey = ['bound-addresses'] as const

export function useBoundAddresses(enabled = true) {
  const userJwt = useAppStore((state) => state.userJwt)
  return useQuery({
    queryKey: [...boundAddressesQueryKey, userJwt],
    enabled: enabled && Boolean(userJwt),
    queryFn: () => api.fetch<{ results: BoundAddress[] }>('/api/user/bind_address'),
  })
}
