const CWASA_BASE = 'https://vhg.cmp.uea.ac.uk/tech/jas/vhg2026'
const CWASA_CSS = `${CWASA_BASE}/cwa/cwasa.css`
const CWASA_JS = `${CWASA_BASE}/cwa/allcsa.js`

let loadPromise = null
let initPromise = null

function loadStylesheet(href) {
  if (document.querySelector(`link[data-cwasa="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.cwasa = href
  document.head.appendChild(link)
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-cwasa="${src}"]`)
    if (existing && window.CWASA) {
      resolve(window.CWASA)
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.cwasa = src
    script.onload = () => resolve(window.CWASA)
    script.onerror = () => reject(new Error('تعذر تحميل مكتبة CWASA'))
    document.head.appendChild(script)
  })
}

/** تحميل CWASA (أفتار لغة إشارة ثلاثي الأبعاد من جامعة East Anglia). */
export function loadCwasa() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.CWASA) return Promise.resolve(window.CWASA)
  if (loadPromise) return loadPromise
  loadStylesheet(CWASA_CSS)
  loadPromise = loadScript(CWASA_JS).then((cwasa) => {
    if (!cwasa) throw new Error('CWASA غير متاح')
    return cwasa
  })
  return loadPromise
}

/**
 * تهيئة لوحة أفتار واحدة بدون واجهة تحكم كاملة.
 * يجب أن يوجد في الصفحة: <div class="CWASAAvatar av0"> و <div class="SToCA">
 */
export function initCwasaAvatar() {
  if (initPromise) return initPromise
  initPromise = loadCwasa()
    .then(async (CWASA) => {
      const cfg = {
        useClientConfig: false,
        jasBase: `${CWASA_BASE}/`,
        jasVersionTag: 'vhg2026',
        sigmlBase: 'sigml',
        avJARBase: 'avatars',
        avJSONBase: 'avjson',
        useAvatarJARs: true,
        animgenFPS: 30,
        animgenServer: null,
        ambIdle: true,
        avs: ['anna', 'marc', 'francoise'],
        avSettings: [
          {
            width: 240,
            height: 280,
            avList: 'avs',
            initAv: 'marc',
            ambIdle: true,
            background: '#152033',
            allowFrameSteps: false,
            allowSiGMLText: false,
            initSiGMLURL: null,
            initSpeed: 0,
            rateSpeed: 5,
          },
        ],
      }
      CWASA.init(cfg)
      await new Promise((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve()
        }
        try {
          CWASA.addHook?.('avatarready', () => finish(), 0)
        } catch {
          /* ignore */
        }
        if (CWASA.ready && typeof CWASA.ready.then === 'function') {
          CWASA.ready.then(finish).catch(finish)
        }
        window.setTimeout(finish, 5000)
      })
      return CWASA
    })
    .catch((err) => {
      initPromise = null
      throw err
    })
  return initPromise
}

export function playSigml(sigmlText) {
  const CWASA = window.CWASA
  if (!CWASA?.playSiGMLText || !sigmlText) return false
  try {
    CWASA.stopSiGML?.(0)
  } catch {
    /* ignore */
  }
  try {
    CWASA.playSiGMLText(sigmlText, 0)
    return true
  } catch {
    return false
  }
}

export function stopSigml() {
  try {
    window.CWASA?.stopSiGML?.(0)
  } catch {
    /* ignore */
  }
}
