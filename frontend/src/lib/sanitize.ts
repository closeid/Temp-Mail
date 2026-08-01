import DOMPurify from 'dompurify'

export const sanitizeHtml = (value: unknown) => {
  const sanitized = DOMPurify.sanitize(typeof value === 'string' ? value : '', { ADD_ATTR: ['target'] })
  const template = document.createElement('template')
  template.innerHTML = sanitized
  template.content.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]').forEach((anchor) => {
    anchor.rel = 'noopener noreferrer'
  })
  return template.innerHTML
}

export const sanitizeSvg = (value: unknown) => DOMPurify.sanitize(
  typeof value === 'string' ? value : '',
  { USE_PROFILES: { svg: true, svgFilters: true } },
)
