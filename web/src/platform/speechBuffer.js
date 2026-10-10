/**
 * مخزن الكلام المتواصل: يجمّع الأجزاء النهائية التي يرجعها التعرف الصوتي ويُخرجها جملةً
 * واحدة مرة واحدة فقط — عند سكون المتحدث (`pauseMs`) أو عند بلوغ `maxWords` كلمة بلا انتظار.
 * كل `push` يعيد ضبط مؤقت السكون.
 */
export function createSpeechBuffer({ pauseMs = 800, maxWords = 12, onSentence } = {}) {
  let words = []
  let timer = 0

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = 0
    }
  }

  const emit = () => {
    clearTimer()
    if (!words.length) return
    const sentence = words.join(' ')
    words = []
    onSentence?.(sentence)
  }

  return {
    push(text) {
      const chunk = String(text ?? '')
        .split(/\s+/)
        .filter(Boolean)
      if (!chunk.length) return
      words = words.concat(chunk)
      if (words.length >= maxWords) {
        emit()
        return
      }
      clearTimer()
      timer = setTimeout(emit, pauseMs)
    },
    flush: emit,
    cancel() {
      clearTimer()
      words = []
    },
  }
}

/**
 * حالة الاستماع لسطر حالة المترجم، بهذا الترتيب في الأولوية:
 * مطفأ ← غير مدعوم ← خطأ ← يستمع.
 */
export function speechStateOf({ receiveEnabled, supported, status }) {
  if (!receiveEnabled) return 'off'
  if (!supported) return 'unsupported'
  if (status === 'error') return 'error'
  return 'listening'
}
