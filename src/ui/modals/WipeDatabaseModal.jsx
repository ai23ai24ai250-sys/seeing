// =============================================================================
// ui/modals/WipeDatabaseModal.jsx — نافذة مسح القواعد السحابية — نسخة React من
// window.promptWipeDatabase (js/components/reports-view.js)
// -----------------------------------------------------------------------------
// تأكيد صارم بكلمة مرور المدير: تحقق من verifyAdminPassword ثم forceWipeDatabase
// مع نفس رسائل الحظر/الإلغاء في القديم (بدون prompt، عبر نموذج حقيقي).
// =============================================================================
import { useState } from 'react'
import { Lock, Trash2, AlertTriangle } from 'lucide-react'
import Modal from '../components/Modal.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { useUiStore } from '../state/uiStore.js'
import { useReportsStore } from '@/state/reportsStore'
import { showToast } from '../components/toastStore.js'

function WipeDatabaseModal() {
  const open = useUiStore(s => s.wipeDatabaseModal.open)
  if (!open) return null
  return <WipeDatabaseModalInner />
}

function WipeDatabaseModalInner() {
  const close = useUiStore(s => s.closeWipeDatabaseModal)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (submitting) return
    if (!password.trim()) {
      showToast('تم إلغاء العملية. يرجى إدخال كلمة المرور لتنفيذ مسح القواعد', 'warning')
      return
    }

    const isValid = window.verifyAdminPassword ? window.verifyAdminPassword(password) : false
    if (!isValid) {
      if (window.adminPasswordConfigured && !window.adminPasswordConfigured()) {
        showToast('لا توجد كلمة سر مسجلة للمدير — سجّلها أولاً من (القائمة ▾ ← تغيير كلمة السر) ثم أعد المحاولة', 'error')
      } else {
        showToast('كلمة المرور غير صحيحة! تم حظر وإيقاف عملية مسح القواعد السحابية 🛑', 'error')
      }
      return
    }

    setSubmitting(true)
    try {
      const success = window.forceWipeDatabase ? await window.forceWipeDatabase(password) : false
      if (success) {
        showToast('تم مسح القواعد السحابية وتصفير البيانات نهائياً', 'success')
        close()
        useReportsStore.getState().refresh()
      }
    } catch (err) {
      showToast((err && err.message) || String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={close} title="تصفير ومسح القواعد السحابية 🔒" icon={Lock} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-800/40 text-xs text-rose-300 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>
            إجراء أمني صارم: سيتم حذف مسودات البيانات التجريبية نهائياً من القواعد السحابية ولا يمكن التراجع.
            أدخل كلمة مرور المدير الحالية لتأكيد العملية.
          </span>
        </div>

        <Input
          label="كلمة مرور المدير *"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoFocus
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>إلغاء</Button>
          <Button
            type="submit"
            variant="danger"
            icon={Trash2}
            loading={submitting}
            disabled={submitting}
            className="px-6"
          >
            {submitting ? 'جاري المسح...' : 'تأكيد مسح القواعد نهائياً'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default WipeDatabaseModal
