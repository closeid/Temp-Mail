import { useBreakpoint, useMemo } from 'vooks'

export function useIsMobile() {
    const breakpointRef = useBreakpoint()
    return useMemo(() => {
        return breakpointRef.value === 'xs'
    })
}

export function useResponsiveTabPlacement(placementRef) {
    const isMobile = useIsMobile()
    return useMemo(() => isMobile.value ? 'top' : placementRef.value)
}
