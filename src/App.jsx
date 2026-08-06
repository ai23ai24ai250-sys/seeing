// Phase 3 — هيكل التطبيق: بوابة الجلسة (LoginView) ثم AppShell.
// يُهيّئ المخازن (المظهر/الجلسة) عند الإقلاع؛ البيانات تمر عبر الجسر (compat).
import { useEffect } from 'react'
import AppShell from '@/ui/layout/AppShell'
import LoginView from '@/ui/views/LoginView'
import { useSettingsStore } from '@/state/settingsStore'
import { useAuthStore } from '@/state/authStore'

function App() {
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    useSettingsStore.getState().hydrate()
    useAuthStore.getState().restore()
  }, [])

  // V3.17 — بعد تسجيل الدخول تُسحب نسخة الإعدادات السحابية (الاسم/الثيم/اللون)
  // من جهاز آخر لتُطبّق فوراً، تماماً مثل hydrateGeneralSettings في legacy.
  useEffect(() => {
    if (user) useSettingsStore.getState().hydrate()
  }, [user])

  return user ? <AppShell /> : <LoginView />
}

export default App
