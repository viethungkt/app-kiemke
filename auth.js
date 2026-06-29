/**
 * Authentication & Authorization Service for Huê Linh Inventory App
 */

const AUTH = {
  USERS_KEY: 'hl_kk_users',
  SESSION_KEY: 'hl_kk_session',
  ROLES: {
    ADMIN: 'admin',
    QUANLY: 'quanly',
    CONGNHAN: 'congnhan'
  },

  hash(password) {
    try {
      return btoa(password);
    } catch (e) {
      return btoa(unescape(encodeURIComponent(password)));
    }
  },

  verifyPassword(password, hash) {
    return this.hash(password) === hash;
  },

  login(username, password) {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.active);
    if (!user) {
      return { success: false, message: 'Tài khoản không tồn tại hoặc đã bị khóa' };
    }
    if (!this.verifyPassword(password, user.password)) {
      return { success: false, message: 'Mật khẩu không chính xác' };
    }
    
    const session = {
      user: {
        username: user.username,
        hoten: user.hoten,
        phongban: user.phongban,
        role: user.role
      },
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session.user };
  },

  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY));
    } catch (e) {
      return null;
    }
  },

  isAuthenticated() {
    const session = this.getSession();
    if (!session) return false;
    const loginTime = new Date(session.loginAt);
    const now = new Date();
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
    if (hoursDiff > 36) { // Session valid for 36 hours for long shifts
      this.logout();
      return false;
    }
    return true;
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  createUser(userData) {
    const users = this.getUsers();
    if (users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      return { success: false, message: 'Tên đăng nhập đã tồn tại' };
    }
    userData.password = this.hash(userData.password);
    userData.active = true;
    userData.createdAt = new Date().toISOString();
    userData.updatedAt = userData.createdAt;
    users.push(userData);
    this.saveUsers(users);
    return { success: true };
  },

  updateUser(username, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx === -1) {
      return { success: false, message: 'Tài khoản không tồn tại' };
    }
    if (users[idx].role === this.ROLES.ADMIN && updates.role !== undefined && updates.role !== this.ROLES.ADMIN) {
      const adminCount = users.filter(u => u.role === this.ROLES.ADMIN).length;
      if (adminCount <= 1) {
        return { success: false, message: 'Không thể chuyển quyền Admin duy nhất' };
      }
    }
    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    if (updates.password && !updates.password.startsWith('btoa_')) {
      users[idx].password = this.hash(updates.password);
    }
    this.saveUsers(users);
    return { success: true };
  },

  deleteUser(username) {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.role === this.ROLES.ADMIN) {
      const adminCount = users.filter(u => u.role === this.ROLES.ADMIN).length;
      if (adminCount <= 1) {
        return { success: false, message: 'Không thể xóa Admin duy nhất' };
      }
    }
    const newUsers = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    this.saveUsers(newUsers);
    return { success: true };
  },

  isAdmin() {
    const session = this.getSession();
    return session && session.user.role === this.ROLES.ADMIN;
  },

  isQuanLy() {
    const session = this.getSession();
    return session && (session.user.role === this.ROLES.QUANLY || session.user.role === this.ROLES.ADMIN);
  }
};

function initDefaultUsers() {
  const users = AUTH.getUsers();
  if (users.length === 0) {
    const defaultUsers = [
      {
        username: 'admin',
        password: AUTH.hash('admin123'),
        hoten: 'Bùi Việt Hùng (Phó Ban)',
        phongban: 'Kế toán',
        role: AUTH.ROLES.ADMIN,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        username: 'truong',
        password: AUTH.hash('truong123'),
        hoten: 'Liều Sì Trường (Trưởng Ban)',
        phongban: 'Ban Giám Đốc',
        role: AUTH.ROLES.ADMIN,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Add some default workers based on the personnel default list
    const defaultNS = window.NHAN_SU_DEFAULT || [];
    defaultNS.forEach(n => {
      if (n.manv) {
        defaultUsers.push({
          username: n.manv,
          password: AUTH.hash(n.manv.toLowerCase()),
          hoten: n.hoten,
          phongban: n.phongban,
          role: AUTH.ROLES.CONGNHAN,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    AUTH.saveUsers(defaultUsers);
    console.log('Successfully initialized users list.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDefaultUsers();
});

if (typeof window !== 'undefined') {
  window.AUTH = AUTH;
}
