import { useAppStore } from '@/lib/store'
export function LoadingBar() {
  const loading = useAppStore((state) => state.loading > 0)
  if (!loading) return null
  return <div aria-label="Loading" className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-transparent"><div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] bg-primary" /></div>
}
