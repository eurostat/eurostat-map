const EUROSTAT_TOAST_ID = 'em-eurostat-error-toast-container'
let lastEurostatToastAt = 0

export const showEurostatApiErrorToast = function (message) {
    if (typeof document === 'undefined') return

    // Avoid a flood of duplicate toasts when multiple stat channels fail together.
    const now = Date.now()
    if (now - lastEurostatToastAt < 1200) return
    lastEurostatToastAt = now

    let container = document.getElementById(EUROSTAT_TOAST_ID)
    if (!container) {
        container = document.createElement('div')
        container.id = EUROSTAT_TOAST_ID
        container.style.position = 'fixed'
        container.style.right = '16px'
        container.style.bottom = '16px'
        container.style.zIndex = '100000'
        container.style.display = 'flex'
        container.style.flexDirection = 'column'
        container.style.gap = '8px'
        container.style.pointerEvents = 'none'
        document.body.appendChild(container)
    }

    const toast = document.createElement('div')
    toast.textContent = message || 'Eurostat API request failed.'
    toast.style.background = 'rgba(186, 42, 42, 0.96)'
    toast.style.color = '#fff'
    toast.style.padding = '10px 12px'
    toast.style.borderRadius = '6px'
    toast.style.fontSize = '13px'
    toast.style.fontFamily = 'sans-serif'
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
    toast.style.maxWidth = '420px'
    toast.style.lineHeight = '1.35'
    toast.style.pointerEvents = 'none'
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(4px)'
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease'

    container.appendChild(toast)

    requestAnimationFrame(() => {
        toast.style.opacity = '1'
        toast.style.transform = 'translateY(0)'
    })

    setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateY(4px)'
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast)
        }, 220)
    }, 5500)
}
