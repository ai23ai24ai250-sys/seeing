// =============================================================================
// ui/state/uiStore.js — مخزن حالة الواجهة (النوافذ) — بديل js/utils/modal.js
// -----------------------------------------------------------------------------
// يحمل حالة النوافذ التفاعلية (نافذة فاتورة البيع الجديدة + نافذة تفاصيل
// الفاتورة + نافذة تحديث الحالة) ودوال فتح/إغلاق. openOrderModal(onSuccess?)
// تقبل استدعاء اختياري يُنفَّذ بعد الحفظ (نفس توقيع
// window.openNewOrderModal(onSuccessCallback) القديم)، وopenOrderStatusModal
// تأخذ (orderId, currentStatus, onDone) بنفس توقيع window.openOrderStatusModal.
// =============================================================================
import { create } from 'zustand'
import { showToast } from '../components/toastStore.js'

export const useUiStore = create(set => ({
  orderModal: { open: false, onSuccess: null, initialData: null },

  posModal: { open: false, onSuccess: null },

  aiAssistantModal: { open: false },

  orderDetailsModal: { open: false, orderId: null },

  orderStatusModal: { open: false, orderId: null, currentStatus: null, onDone: null },

  customerModal: { open: false, customerId: null, onDone: null, initialData: null },

  productModal: { open: false, productId: null, onDone: null, initialData: null },

  shipmentModal: { open: false, productId: null, onDone: null },

  supplierModal: { open: false, supplierId: null, onDone: null, initialData: null },

  supplierReturnModal: { open: false, supplierId: null, onDone: null },

  expenseModal: { open: false, expenseId: null, onDone: null, initialData: null },

  wipeDatabaseModal: { open: false },

  paymentModal: { open: false, defaults: null, onDone: null },

  userModal: { open: false, userId: null, onDone: null },

  adminPasswordModal: { open: false, note: null, onOk: null },

  changePasswordModal: { open: false },

  syncCloudModal: { open: false },

  statementModal: { open: false, entityType: null, entityId: null },

  openOrderModal(onSuccess = null, initialData = null) {
    set({
      orderModal: {
        open: true,
        onSuccess: typeof onSuccess === 'function' ? onSuccess : null,
        initialData: initialData || null,
      },
    })
  },

  closeOrderModal() {
    set({ orderModal: { open: false, onSuccess: null, initialData: null } })
  },

  openPosModal(onSuccess = null) {
    set({
      posModal: {
        open: true,
        onSuccess: typeof onSuccess === 'function' ? onSuccess : null,
      },
    })
  },

  closePosModal() {
    set({ posModal: { open: false, onSuccess: null } })
  },

  openAiAssistantModal() {
    set({ aiAssistantModal: { open: true } })
  },

  closeAiAssistantModal() {
    set({ aiAssistantModal: { open: false } })
  },

  // التعبئة الذكية للنماذج (V3.35): تفتح نافذة الإدخال المناسبة معبأةً بالبيانات
  // المستخرجة من الشات — لا يُنفَّذ أي تغيير هنا؛ المستخدم وحده يضغط الحفظ.
  // V3.36: form='updateProduct' + entityId تفتح نافذة تعديل المنتج معبأةً بالبيانات.
  openAiFormFill(form = '', initialData = {}, entityId = null) {
    const data = initialData && typeof initialData === 'object' ? initialData : {}
    if (form === 'createOrder') {
      set({ orderModal: { open: true, onSuccess: null, initialData: data } })
      return
    }
    if (form === 'addCustomer') {
      set({ customerModal: { open: true, customerId: null, onDone: null, initialData: data } })
      return
    }
    if (form === 'addProduct') {
      set({ productModal: { open: true, productId: null, onDone: null, initialData: data } })
      return
    }
    if (form === 'updateProduct') {
      set({ productModal: { open: true, productId: entityId || null, onDone: null, initialData: data } })
      return
    }
    if (form === 'addExpense') {
      set({ expenseModal: { open: true, expenseId: null, onDone: null, initialData: data } })
      return
    }
    if (form === 'addSupplier') {
      set({ supplierModal: { open: true, supplierId: null, onDone: null, initialData: data } })
      return
    }
  },

  openOrderDetailsModal(orderId) {
    set({ orderDetailsModal: { open: true, orderId } })
  },

  closeOrderDetailsModal() {
    set({ orderDetailsModal: { open: false, orderId: null } })
  },

  openOrderStatusModal(orderId, currentStatus = null, onDone = null) {
    set({
      orderStatusModal: {
        open: true,
        orderId,
        currentStatus,
        onDone: typeof onDone === 'function' ? onDone : null,
      },
    })
  },

  closeOrderStatusModal() {
    set({ orderStatusModal: { open: false, orderId: null, currentStatus: null, onDone: null } })
  },

  openAddCustomerModal(customerId = null, onDone = null, initialData = null) {
    set({
      customerModal: {
        open: true,
        customerId,
        onDone: typeof onDone === 'function' ? onDone : null,
        initialData: initialData || null,
      },
    })
  },

  closeAddCustomerModal() {
    set({ customerModal: { open: false, customerId: null, onDone: null, initialData: null } })
  },

  openAddProductModal(productId = null, onDone = null, initialData = null) {
    set({
      productModal: {
        open: true,
        productId,
        onDone: typeof onDone === 'function' ? onDone : null,
        initialData: initialData || null,
      },
    })
  },

  closeAddProductModal() {
    set({ productModal: { open: false, productId: null, onDone: null, initialData: null } })
  },

  openShipmentModal(productId, onDone = null) {
    set({
      shipmentModal: {
        open: true,
        productId,
        onDone: typeof onDone === 'function' ? onDone : null,
      },
    })
  },

  closeShipmentModal() {
    set({ shipmentModal: { open: false, productId: null, onDone: null } })
  },

  openAddSupplierModal(supplierId = null, onDone = null, initialData = null) {
    set({
      supplierModal: {
        open: true,
        supplierId,
        onDone: typeof onDone === 'function' ? onDone : null,
        initialData: initialData || null,
      },
    })
  },

  closeAddSupplierModal() {
    set({ supplierModal: { open: false, supplierId: null, onDone: null, initialData: null } })
  },

  openSupplierReturnModal(supplierId = null, onDone = null) {
    set({
      supplierReturnModal: {
        open: true,
        supplierId,
        onDone: typeof onDone === 'function' ? onDone : null,
      },
    })
  },

  closeSupplierReturnModal() {
    set({ supplierReturnModal: { open: false, supplierId: null, onDone: null } })
  },

  openAddExpenseModal(expenseId = null, onDone = null, initialData = null) {
    set({
      expenseModal: {
        open: true,
        expenseId,
        onDone: typeof onDone === 'function' ? onDone : null,
        initialData: initialData || null,
      },
    })
  },

  closeAddExpenseModal() {
    set({ expenseModal: { open: false, expenseId: null, onDone: null, initialData: null } })
  },

  openWipeDatabaseModal() {
    set({ wipeDatabaseModal: { open: true } })
  },

  closeWipeDatabaseModal() {
    set({ wipeDatabaseModal: { open: false } })
  },

  // 🔒 نافذة تسجيل الدفعات مخصصة للمدير العام فقط (نفس بوابة window.openPaymentModal
  // القديمة): بدون جلسة أو برتبة أقل يعرض تنبيه الحظر ولا يفتح النافذة إطلاقاً.
  openPaymentModal(defaults = {}, onDone = null) {
    const user = typeof window !== 'undefined' && window.getCurrentUser ? window.getCurrentUser() : null
    if (!user || user.role !== 'admin') {
      showToast('عفواً، شاشة المدفوعات مخصصة للمدير العام فقط', 'error')
      return
    }
    set({
      paymentModal: {
        open: true,
        defaults: {
          entityType: defaults.entityType === 'supplier' ? 'supplier' : 'customer',
          entityId: defaults.entityId || null,
        },
        onDone: typeof onDone === 'function' ? onDone : null,
      },
    })
  },

  closePaymentModal() {
    set({ paymentModal: { open: false, defaults: null, onDone: null } })
  },

  // 🔒 لوحة إدارة الموظفين مخصصة للمدير العام فقط (نفس بوابة renderUsersView
  // القديمة): بدون جلسة أو برتبة أقل يعرض تنبيه الحظر ولا يفتح النافذة إطلاقاً.
  openUserModal(userId = null, onDone = null) {
    const user = typeof window !== 'undefined' && window.getCurrentUser ? window.getCurrentUser() : null
    if (!user || user.role !== 'admin') {
      showToast('عفواً، هذه الصفحة مخصصة للمدير العام فقط', 'error')
      return
    }
    set({
      userModal: {
        open: true,
        userId,
        onDone: typeof onDone === 'function' ? onDone : null,
      },
    })
  },

  closeUserModal() {
    set({ userModal: { open: false, userId: null, onDone: null } })
  },

  // 🔐 بوابة المدير لنافذة تأكيد الهوية (نفس requireAdminPassword في legacy):
  // بدون جلسة أو برتبة أقل يعرض التنبيه ولا يفتح النافذة إطلاقاً.
  openAdminPasswordModal(note = 'أدخل كلمة سر المدير للمتابعة.', onOk = null) {
    const user = typeof window !== 'undefined' && window.getCurrentUser ? window.getCurrentUser() : null
    if (!user || user.role !== 'admin') {
      showToast('هذه الإعدادات مخصصة للمدير فقط', 'error')
      return
    }
    set({
      adminPasswordModal: {
        open: true,
        note,
        onOk: typeof onOk === 'function' ? onOk : null,
      },
    })
  },

  closeAdminPasswordModal() {
    set({ adminPasswordModal: { open: false, note: null, onOk: null } })
  },

  openChangePasswordModal() {
    set({ changePasswordModal: { open: true } })
  },

  closeChangePasswordModal() {
    set({ changePasswordModal: { open: false } })
  },

  openSyncCloudModal() {
    set({ syncCloudModal: { open: true } })
  },

  closeSyncCloudModal() {
    set({ syncCloudModal: { open: false } })
  },

  openStatementModal(entityType, entityId) {
    set({
      statementModal: {
        open: true,
        entityType: entityType === 'supplier' ? 'supplier' : 'customer',
        entityId: entityId || null,
      },
    })
  },

  closeStatementModal() {
    set({ statementModal: { open: false, entityType: null, entityId: null } })
  },
}))
