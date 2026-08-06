/**
 * Authentication & Role-Based User Management Module — → React (Phase 2 port)
 * ============================================================================
 * Faithful ES-module port of js/auth.js. Connected to Firebase Auth & Cloud
 * Firestore Users Collection. Logic is identical to the legacy reference; the
 * only changes are the module wrapper + `export` + importing getCairoFormattedDate
 * and generateAutoId from the ported utils instead of window.
 */
import { generateAutoId, getCairoFormattedDate } from '../utils/formatters.js';

const AUTH_STORAGE_KEY = 'bms_user_session';

// Clean Slate Admin Primary Account
const INITIAL_USERS = [
  { id: 'USR-1001', name: 'المدير العام', email: 'admin@store.com', role: 'admin', createdAt: '2026-07-01T10:00:00Z' }
];

// Purge any legacy persistent sessions from localStorage so login is ALWAYS enforced on launch
if (typeof window !== 'undefined') localStorage.removeItem(AUTH_STORAGE_KEY);

export function getUsers() {
  const users = window.getCollection(window.STORAGE_KEYS.USER);
  return (users && users.length > 0) ? users : INITIAL_USERS;
}

// 🔒 Null-safe email normalization: a user doc/record may be missing its email
// (incomplete write, partial merge, legacy import). Sanitizing an undefined
// email with .toLowerCase() crashes the whole login/relogin flow with
// "Cannot read properties of undefined (reading 'toLowerCase')", so every email
// comparison must go through this helper.
function _normEmail(value) {
  return ((value || '') + '').trim().toLowerCase();
}

export function getCurrentUser() {
  // The local session is the app's authoritative identity (set by login() only
  // after strict validation against active user accounts).
  const session = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed && parsed.email) return parsed;
    } catch (parseErr) {
      console.error(parseErr);
    }
  }

  // Fallback: restore identity from a persisted Firebase Auth session, but ONLY
  // when its email still matches an active user document. A stale/deprecated
  // email (e.g. after an account email change) is rejected.
  if (window.auth && window.auth.currentUser) {
    const fbUser = window.auth.currentUser;
    const users = window.getUsers();
    const matched = users.find(u => _normEmail(u.email) === _normEmail(fbUser && fbUser.email));
    if (!matched) return null;
    return {
      email: fbUser.email,
      name: matched.name,
      role: matched.role
    };
  }

  return null;
}

export async function login(email, password) {
  const cleanEmail = _normEmail(email);
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
  }

  // 🔒 STRICT validation against active user accounts (null-safe email compare).
  // On a fresh device the local users list may hold only the seed admin until
  // the first cloud sync; a real Firebase Auth credential is then accepted and
  // the session is minted from the cloud-synced record below.
  let user = window.getUsers().find(u => _normEmail(u.email) === cleanEmail);

  // Local password gate first: instant feedback, no cloud latency on typos.
  if (user && user.password && user.password.trim() !== cleanPassword) {
    throw new Error('كلمة المرور غير صحيحة');
  }

  if (window.auth) {
    window._pendingAuth = true;
    try {
      // ✅ Await the real Firebase sign-in so onAuthStateChanged settles with a
      //    non-null user BEFORE any render / route-guard runs. This removes the
      //    relogin race (permission toasts + stale role/email sanitization) and
      //    lets a real cloud credential mint a session even when the local
      //    users list on THIS device hasn't synced yet (multi-device login).
      await window.auth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
      if (window.waitForFirebaseAuth) await window.waitForFirebaseAuth();
    } catch (err) {
      // Offline / blocked cloud: keep the strict LOCAL validation result as the
      // fallback (session still works, cloud sync is skipped until reconnect).
      if (!user) {
        throw new Error(err && err.message ? err.message : 'فشل تسجيل الدخول إلى السحابة');
      }
    } finally {
      window._pendingAuth = false;
    }

    // 🛰️ CLOUD-FIRST: after successful authentication, pull Firestore as the
    //    single source of truth so every device/browser converges to the exact
    //    same data before the dashboard is rendered. A failed fetch never
    //    blocks login — the local snapshot stays usable offline.
    try {
      window.startFirestoreSync();
      await window.fetchAllFromFirestore(true);
    } catch { /* local snapshot remains authoritative offline */ }

    // Re-resolve the account from the (now cloud-synced) users collection so a
    // role/name changed on another device is honored immediately.
    const synced = window.getUsers().find(u => _normEmail(u.email) === cleanEmail);
    if (synced && synced.id) user = synced;
  }

  if (!user) {
    throw new Error('حساب المستخدم غير موجود في النظام');
  }

  const sessionUser = {
    id: user.id,
    email: cleanEmail,
    name: user.name,
    role: user.role,
    loginTime: getCairoFormattedDate()
  };

  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));

  return sessionUser;
}

export function logout() {
  if (window.auth) {
    window.auth.signOut().catch(err => console.error(err));
  }
  // 🔒 Tear down every realtime Firestore listener the moment the session ends
  // (idempotent: the auth gate also unsubscribes on the signOut() event).
  if (window.stopFirestoreSync) window.stopFirestoreSync();
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

/**
 * Strict Admin Password Verification Helper
 * Returns strict boolean (true/false)
 * Uses Firestore-stored password as source of truth only
 */
export function verifyAdminPassword(enteredPassword) {
  if (!enteredPassword || typeof enteredPassword !== 'string' || !enteredPassword.trim()) {
    return false;
  }

  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const cleanInput = enteredPassword.trim();
  const usersList = window.getUsers();
  const activeUserDoc = usersList.find(u => _normEmail(u.email) === _normEmail(currentUser.email));

  // Check against password stored in Firestore users document
  if (activeUserDoc && activeUserDoc.password && activeUserDoc.password.trim()) {
    return activeUserDoc.password.trim() === cleanInput;
  }

  // 🔒 Security: if no password is registered in the users document, NO
  // entered password is accepted. The admin must set a real password first
  // (via updateUserAccount), otherwise an arbitrary non-empty string would
  // unlock every password-protected action.
  return false;
}

/**
 * Whether the current admin has a real password registered in the users
 * document. Callers use this to surface a friendly "set a password first"
 * message instead of a generic wrong-password error.
 */
export function adminPasswordConfigured() {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  const usersList = window.getUsers();
  const activeUserDoc = usersList.find(u => _normEmail(u.email) === _normEmail(currentUser.email));
  return !!(activeUserDoc && activeUserDoc.password && activeUserDoc.password.trim());
}

/**
 * Admin User Creation without session overwrite
 */
export function createNewUserAccount({ name, email, password, role }) {
  if (!isAdmin()) {
    throw new Error('غير مصرح لك بإنشاء حسابات مستخدمين. هذه الصلاحية للمدير فقط');
  }

  const cleanEmail = _normEmail(email);
  const existing = window.getUsers().find(u => _normEmail(u.email) === cleanEmail);
  if (existing) {
    throw new Error('هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
  }

  const newUser = {
    id: generateAutoId('USR'),
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(),
    role: role || 'employee',
    createdAt: getCairoFormattedDate()
  };

  return window.addFirestoreDoc(window.STORAGE_KEYS.USER, newUser);
}

export function updateUserAccount(userId, { name, email, password, role }) {
  if (!isAdmin()) {
    throw new Error('غير مصرح لك بتعديل بيانات الحسابات');
  }

  const payload = {
    updatedAt: getCairoFormattedDate()
  };

  let changedEmail = false;
  let oldEmail = '';

  if (name) payload.name = name.trim();

  // 🔒 Main Admin protection: the role of the primary admin account
  // (USR-1001) can never be demoted, even by another admin.
  if (role && userId === 'USR-1001' && role !== 'admin') {
    throw new Error('لا يمكن تغيير صلاحية المدير العام الرئيسي');
  }

  // 🔒 Self-protection: a logged-in admin can never demote their own account.
  if (role && role !== 'admin') {
    const target = window.getUsers().find(u => u.id === userId);
    const currentSession = getCurrentUser();
    if (target && currentSession && _normEmail(target.email) === _normEmail(currentSession.email)) {
      throw new Error('لا يمكن تغيير صلاحية المدير العام الرئيسي');
    }
  }

  if (role) payload.role = role;
  if (password && password.trim().length > 0) {
    payload.password = password.trim();
  }

  // Validate & prepare the email change BEFORE writing anything so we never
  // leave a partial update when the new email collides with another account.
  if (email) {
    const cleanEmail = _normEmail(email);
    const oldUser = window.getUsers().find(u => u.id === userId);
    oldEmail = oldUser ? _normEmail(oldUser.email) : '';

    if (cleanEmail !== oldEmail) {
      const duplicate = window.getUsers().find(u => u.id !== userId && _normEmail(u.email) === cleanEmail);
      if (duplicate) {
        throw new Error('هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
      }
      changedEmail = true;
    }
    payload.email = cleanEmail;
  }

  window.updateFirestoreDoc(window.STORAGE_KEYS.USER, userId, payload);

  // 🔒 EMAIL SYNC: keep authentication strictly in sync so the OLD email can
  // never log in again.
  if (changedEmail) {
    // 1. Remove any legacy/stale user documents still carrying the old email.
    window.getUsers().forEach(u => {
      if (u.id !== userId && _normEmail(u.email) === oldEmail) {
        window.deleteFirestoreDoc(window.STORAGE_KEYS.USER, u.id);
      }
    });

    // 2. If the currently signed-in Firebase Auth account uses the old email,
    //    update it so Firebase Auth accepts ONLY the new email going forward.
    if (window.auth && window.auth.currentUser && _normEmail(window.auth.currentUser.email) === oldEmail) {
      window.auth.currentUser.updateEmail(payload.email).catch(err => {
        console.warn('Firebase Auth email sync note:', err && err.message);
      });
    }
  }

  // 🖥️ SESSION SYNC: if the updated account is the currently logged-in user,
  // refresh the local session (id / name / email / role) so the header profile
  // updates instantly without requiring a page reload or re-login.
  const sessionRaw = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (sessionRaw) {
    try {
      const sess = JSON.parse(sessionRaw);
      const sessionEmail = _normEmail(sess && sess.email);
      const targetEmail = _normEmail(payload.email || oldEmail || '');
      if (sess && sessionEmail && sessionEmail === targetEmail) {
        sess.id = userId;
        if (payload.name) sess.name = payload.name;
        if (payload.email) sess.email = payload.email;
        if (payload.role) sess.role = payload.role;
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sess));
      }
    } catch { /* ignore malformed session */ }
  }
}

/**
 * Self-service password change for the logged-in account.
 * Requires the CURRENT password to be verified against the stored account
 * before the new password is accepted (strict 3-field flow).
 */
export function changeOwnPassword(currentPassword, newPassword) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول أولاً لتغيير كلمة السر');
  }
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error('كلمة السر الجديدة يجب ألا تقل عن 6 أحرف');
  }

  const usersList = window.getUsers();
  const activeUser = usersList.find(u => _normEmail(u.email) === _normEmail(currentUser.email));
  if (!activeUser) {
    throw new Error('حساب المستخدم غير موجود في النظام');
  }

  // Verify the current password against the stored account password.
  const hasStoredPassword = !!(activeUser.password && activeUser.password.trim());
  if (hasStoredPassword) {
    if (!currentPassword || !currentPassword.trim()) {
      throw new Error('يرجى إدخال كلمة السر الحالية');
    }
    if (activeUser.password.trim() !== currentPassword.trim()) {
      throw new Error('كلمة السر الحالية غير صحيحة');
    }
  } else if (currentUser.role !== 'admin') {
    // Non-admin accounts must always have a stored password to verify against
    throw new Error('كلمة السر الحالية غير صحيحة');
  }
  // 🔓 No stored password + admin (e.g. the seed admin right after a wipe):
  // allowed to register a NEW password without a "current" one.

  const newPasswordTrimmed = newPassword.trim();

  // 🔒 PERSISTENCE GUARD: `getUsers()` falls back to INITIAL_USERS when the
  // users collection is still empty (fresh device before the first cloud sync).
  // A seed admin record lives ONLY in that fallback — it is NOT a real doc in
  // the collection, so updateFirestoreDoc would silently no-op (findIndex -1)
  // and the password would never persist, leaving adminPasswordConfigured()
  // forever false ("لا توجد كلمة سر مسجلة للمدير" loop). Ensure the record
  // actually exists in the collection before writing; otherwise create it.
  const collection = window.firestoreCache && window.firestoreCache[window.STORAGE_KEYS.USER];
  const inCollection = Array.isArray(collection) && collection.some(u => u && u.id === activeUser.id);

  if (inCollection) {
    window.updateFirestoreDoc(window.STORAGE_KEYS.USER, activeUser.id, {
      password: newPasswordTrimmed,
      updatedAt: getCairoFormattedDate()
    });
  } else {
    window.addFirestoreDoc(window.STORAGE_KEYS.USER, {
      ...activeUser,
      password: newPasswordTrimmed,
      updatedAt: getCairoFormattedDate()
    });
  }

  return true;
}

export function updateUserRole(userId, newRole) {
  if (!isAdmin()) {
    throw new Error('غير مصرح لك بتعديل الرتب والصلاحيات');
  }
  // 🔒 Main Admin & self-protection: the primary admin account (USR-1001) and
  // the currently logged-in account can never be demoted from any JS action.
  if (userId === 'USR-1001' && newRole !== 'admin') {
    throw new Error('لا يمكن تغيير صلاحية المدير العام الرئيسي');
  }
  if (newRole !== 'admin') {
    const target = window.getUsers().find(u => u.id === userId);
    const currentSession = getCurrentUser();
    if (target && currentSession && _normEmail(target.email) === _normEmail(currentSession.email)) {
      throw new Error('لا يمكن تغيير صلاحية المدير العام الرئيسي');
    }
  }
  window.updateFirestoreDoc(window.STORAGE_KEYS.USER, userId, { role: newRole });
}

export async function deleteUserAccount(userId) {
  if (!isAdmin()) {
    throw new Error('غير مصرح لك بحذف الحسابات');
  }
  // 🔒 The primary admin account (USR-1001) and the logged-in account can never
  // be deleted from any JS action (prevents self lock-out / losing the owner).
  if (userId === 'USR-1001') {
    throw new Error('لا يمكن حذف حساب المدير العام الرئيسي');
  }
  const target = window.getUsers().find(u => u.id === userId);
  const currentSession = getCurrentUser();
  if (target && currentSession && _normEmail(target.email) === _normEmail(currentSession.email)) {
    throw new Error('لا يمكن حذف حسابك الحالي');
  }
  return window.deleteFirestoreDoc(window.STORAGE_KEYS.USER, userId);
}

// Wire the full service onto window — identical surface to the legacy script.
if (typeof window !== 'undefined') {
  window.getUsers = getUsers;
  window.getCurrentUser = getCurrentUser;
  window.login = login;
  window.logout = logout;
  window.isAuthenticated = isAuthenticated;
  window.isAdmin = isAdmin;
  window.verifyAdminPassword = verifyAdminPassword;
  window.adminPasswordConfigured = adminPasswordConfigured;
  window.createNewUserAccount = createNewUserAccount;
  window.updateUserAccount = updateUserAccount;
  window.changeOwnPassword = changeOwnPassword;
  window.updateUserRole = updateUserRole;
  window.deleteUserAccount = deleteUserAccount;
}
