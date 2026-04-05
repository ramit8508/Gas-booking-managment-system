import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const companyProducts = [
  { key: 'Domestic', title: 'Domestic Cylinder', unitPrice: 1050, desc: 'Household usage, fast refill support.' },
  { key: 'Commercial', title: 'Commercial Cylinder', unitPrice: 1850, desc: 'Commercial kitchens and business usage.' },
];

function formatDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(v) {
  return Number(v || 0).toFixed(2);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function printHtml(title, htmlText) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Consolas,monospace;white-space:pre-wrap;padding:16px}</style></head><body>${htmlText}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [fullName, setFullName] = useState(localStorage.getItem('fullName') || '');

  const [toast, setToast] = useState('');
  const [loginMode, setLoginMode] = useState('ADMIN');
  const [showCustomerSignup, setShowCustomerSignup] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', username: '', phone: '', defaultAddress: '', password: '' });

  const [adminTab, setAdminTab] = useState('summary');
  const [adminSummary, setAdminSummary] = useState({ totalOrders: 0, totalSoldGas: 0, totalRevenue: 0, bookedOrders: 0, deliveredOrders: 0, employeeCount: 0 });
  const [adminOrders, setAdminOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeCreateForm, setEmployeeCreateForm] = useState({ fullName: '', username: '', phone: '', password: '' });

  const [employeeTab, setEmployeeTab] = useState('orders');
  const [employeeOrders, setEmployeeOrders] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState({ totalOrders: 0, totalSoldGas: 0, totalRevenue: 0 });
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedEmployeeOrderId, setSelectedEmployeeOrderId] = useState('');
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', defaultAddress: '', currentPassword: '', newPassword: '' });

  const [customerView, setCustomerView] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(companyProducts[0]);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutForm, setCheckoutForm] = useState({ quantity: 1, addressLine: '', city: '', pincode: '', paymentMethod: 'UPI' });
  const [myOrders, setMyOrders] = useState([]);
  const [customerProfileForm, setCustomerProfileForm] = useState({ fullName: '', phone: '', defaultAddress: '', currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const authHeaders = useMemo(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders, ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  function setSession(data) {
    setToken(data.token);
    setUsername(data.username);
    setRole(data.role);
    setFullName(data.fullName || '');

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('role', data.role);
    localStorage.setItem('fullName', data.fullName || '');

    setProfileForm((p) => ({ ...p, fullName: data.fullName || '', phone: data.phone || '', defaultAddress: data.defaultAddress || '' }));
    setCustomerProfileForm((p) => ({ ...p, fullName: data.fullName || '', phone: data.phone || '', defaultAddress: data.defaultAddress || '' }));
  }

  function logout() {
    setToken('');
    setUsername('');
    setRole('');
    setFullName('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');

    setLoginForm({ username: '', password: '' });
    setShowCustomerSignup(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const data = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      }).then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.message || 'Invalid login');
        return body;
      });

      if (data.role !== loginMode) throw new Error(`This account is not ${loginMode.toLowerCase()} role`);

      setSession(data);
      setToast('Login successful');
    } catch (err) {
      setToast(err.message);
    }
  }

  async function handleCustomerSignup(e) {
    e.preventDefault();
    try {
      await api('/auth/customer-register', { method: 'POST', body: JSON.stringify(signupForm) });
      setToast('Customer account created. Please login.');
      setShowCustomerSignup(false);
      setLoginMode('CUSTOMER');
      setLoginForm({ username: signupForm.username, password: '' });
    } catch (err) {
      setToast(err.message);
    }
  }

  async function loadAdminData() {
    const [summary, orders, emps] = await Promise.all([
      api('/admin/summary'),
      api('/admin/orders'),
      api('/admin/employees'),
    ]);
    setAdminSummary(summary);
    setAdminOrders(orders);
    setEmployees(emps);
  }

  async function createEmployee(e) {
    e.preventDefault();
    try {
      await api('/admin/employees', { method: 'POST', body: JSON.stringify(employeeCreateForm) });
      setToast('Employee created');
      setEmployeeCreateForm({ fullName: '', username: '', phone: '', password: '' });
      await loadAdminData();
    } catch (err) {
      setToast(err.message);
    }
  }

  async function loadEmployeeData() {
    const [orders, summary] = await Promise.all([api('/employee/orders'), api('/employee/summary')]);
    setEmployeeOrders(orders);
    setEmployeeSummary(summary);
  }

  async function loadDeliveryPartners() {
    const partners = await api('/employee/delivery-partners');
    setDeliveryPartners(partners);
    if (!selectedPartnerName && partners.length > 0) {
      setSelectedPartnerName(partners[0]);
    }
  }

  async function assignDeliveryPartner() {
    if (!selectedEmployeeOrderId) {
      setToast('Select an order first');
      return;
    }

    try {
      const resp = await api(`/employee/orders/${selectedEmployeeOrderId}/assign-partner`, {
        method: 'PATCH',
        body: JSON.stringify({ partnerName: selectedPartnerName || undefined }),
      });
      setToast(resp.message || 'Delivery partner assigned');
      await loadEmployeeData();
    } catch (err) {
      setToast(err.message);
    }
  }

  async function updateProfile(formState, setFormState) {
    try {
      const payload = {
        fullName: formState.fullName,
        phone: formState.phone,
        defaultAddress: formState.defaultAddress,
      };
      if (formState.newPassword) {
        payload.currentPassword = formState.currentPassword;
        payload.newPassword = formState.newPassword;
      }

      const resp = await api('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) });

      setFullName(resp.user.fullName || '');
      localStorage.setItem('fullName', resp.user.fullName || '');
      setFormState((p) => ({ ...p, currentPassword: '', newPassword: '' }));
      setToast('Profile updated');
    } catch (err) {
      setToast(err.message);
    }
  }

  async function loadMyOrders() {
    const data = await api('/customer-orders/mine');
    setMyOrders(data);
  }

  async function placeCustomerOrder() {
    try {
      if (!checkoutForm.addressLine || !checkoutForm.city || !checkoutForm.pincode) {
        throw new Error('Please fill complete address');
      }

      await api('/customer-orders', {
        method: 'POST',
        body: JSON.stringify({
          companyName: 'Gas Agency Management System',
          cylinderType: selectedProduct.key,
          quantity: Number(checkoutForm.quantity),
          addressLine: checkoutForm.addressLine,
          city: checkoutForm.city,
          pincode: checkoutForm.pincode,
          paymentMethod: checkoutForm.paymentMethod,
        }),
      });

      setToast('Order placed. Your order will be delivered in 2 days.');
      setCustomerView('orders');
      setCheckoutStep(1);
      await loadMyOrders();
    } catch (err) {
      setToast(err.message);
    }
  }

  useEffect(() => {
    if (!token || !role) return;

    if (role === 'ADMIN') {
      loadAdminData().catch((e) => {
        setToast(e.message);
        logout();
      });
      return;
    }

    if (role === 'EMPLOYEE') {
      Promise.all([loadEmployeeData(), loadDeliveryPartners()]).catch((e) => {
        setToast(e.message);
        logout();
      });
      return;
    }

    if (role === 'CUSTOMER') {
      loadMyOrders().catch((e) => {
        setToast(e.message);
        logout();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  const bill = useMemo(() => {
    const subtotal = Number(checkoutForm.quantity || 1) * selectedProduct.unitPrice;
    const handlingFee = 49;
    return { subtotal, handlingFee, total: subtotal + handlingFee };
  }, [checkoutForm.quantity, selectedProduct]);

  return (
    <>
      <div className="bg-grid"></div>
      <main className="app-shell">
        {!token ? (
          <section className="card login-card">
            <h1>Gas Agency Management</h1>
            <p className="sub">Select portal to login</p>
            <div className="tabs" style={{ marginTop: 10 }}>
              <button type="button" className={`tab ${loginMode === 'ADMIN' ? 'active' : ''}`} onClick={() => { setLoginMode('ADMIN'); setShowCustomerSignup(false); }}>Admin</button>
              <button type="button" className={`tab ${loginMode === 'EMPLOYEE' ? 'active' : ''}`} onClick={() => { setLoginMode('EMPLOYEE'); setShowCustomerSignup(false); }}>Employee</button>
              <button type="button" className={`tab ${loginMode === 'CUSTOMER' ? 'active' : ''}`} onClick={() => setLoginMode('CUSTOMER')}>Customer</button>
            </div>

            {!showCustomerSignup ? (
              <form className="form-grid" onSubmit={handleLogin}>
                <label>Username<input value={loginForm.username} onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))} required /></label>
                <label>Password<input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required /></label>
                <button type="submit">Login</button>
                {loginMode === 'CUSTOMER' ? <button type="button" className="ghost" onClick={() => setShowCustomerSignup(true)}>Create customer account</button> : null}
              </form>
            ) : (
              <form className="form-grid" onSubmit={handleCustomerSignup}>
                <label>Full Name<input value={signupForm.fullName} onChange={(e) => setSignupForm((p) => ({ ...p, fullName: e.target.value }))} required /></label>
                <label>Username<input value={signupForm.username} onChange={(e) => setSignupForm((p) => ({ ...p, username: e.target.value }))} required /></label>
                <label>Phone<input value={signupForm.phone} onChange={(e) => setSignupForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                <label>Default Address<input value={signupForm.defaultAddress} onChange={(e) => setSignupForm((p) => ({ ...p, defaultAddress: e.target.value }))} /></label>
                <label>Password<input type="password" value={signupForm.password} onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))} required /></label>
                <button type="submit">Sign Up</button>
                <button type="button" className="ghost" onClick={() => setShowCustomerSignup(false)}>Back</button>
              </form>
            )}
          </section>
        ) : null}

        {role === 'ADMIN' ? (
          <section>
            <header className="topbar card"><div><h2>Admin Portal</h2><p className="sub">{fullName || username}</p></div><button type="button" className="ghost" onClick={logout}>Logout</button></header>
            <nav className="tabs">
              <button type="button" className={`tab ${adminTab === 'summary' ? 'active' : ''}`} onClick={() => setAdminTab('summary')}>Summary</button>
              <button type="button" className={`tab ${adminTab === 'orders' ? 'active' : ''}`} onClick={() => setAdminTab('orders')}>All Orders</button>
              <button type="button" className={`tab ${adminTab === 'employees' ? 'active' : ''}`} onClick={() => setAdminTab('employees')}>Employees</button>
            </nav>

            <section className={`card tab-panel ${adminTab === 'summary' ? 'active' : ''}`}>
              <h3>Sales Summary</h3>
              <div className="kpis">
                <div className="kpi"><span>Total Orders</span><strong>{adminSummary.totalOrders}</strong></div>
                <div className="kpi"><span>Total Sold Gas (Qty)</span><strong>{adminSummary.totalSoldGas}</strong></div>
                <div className="kpi"><span>Total Revenue</span><strong>{formatAmount(adminSummary.totalRevenue)}</strong></div>
                <div className="kpi"><span>Employees</span><strong>{adminSummary.employeeCount}</strong></div>
              </div>
            </section>

            <section className={`card tab-panel ${adminTab === 'orders' ? 'active' : ''}`}>
              <h3>All Customer Orders</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Order No</th><th>Customer</th><th>Address</th><th>Amount</th><th>Qty</th><th>Status</th><th>Expected</th></tr></thead>
                  <tbody>{adminOrders.map((o) => <tr key={o._id}><td>{o.orderNo}</td><td>{o.userId?.fullName || o.userId?.username}</td><td>{o.addressLine}, {o.city} - {o.pincode}</td><td>Rs. {formatAmount(o.totalAmount)}</td><td>{o.quantity}</td><td>{o.status}</td><td>{formatDate(o.estimatedDeliveryAt)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>

            <section className={`card tab-panel ${adminTab === 'employees' ? 'active' : ''}`}>
              <h3>Create Employee Login</h3>
              <form className="form-grid two-col" onSubmit={createEmployee}>
                <input placeholder="Full Name" value={employeeCreateForm.fullName} onChange={(e) => setEmployeeCreateForm((p) => ({ ...p, fullName: e.target.value }))} required />
                <input placeholder="Username" value={employeeCreateForm.username} onChange={(e) => setEmployeeCreateForm((p) => ({ ...p, username: e.target.value }))} required />
                <input placeholder="Phone" value={employeeCreateForm.phone} onChange={(e) => setEmployeeCreateForm((p) => ({ ...p, phone: e.target.value }))} />
                <input type="password" placeholder="Password" value={employeeCreateForm.password} onChange={(e) => setEmployeeCreateForm((p) => ({ ...p, password: e.target.value }))} required />
                <div className="form-actions wide"><button type="submit">Create Employee</button></div>
              </form>

              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead><tr><th>Name</th><th>Username</th><th>Phone</th><th>Created</th></tr></thead>
                  <tbody>{employees.map((e) => <tr key={e._id}><td>{e.fullName}</td><td>{e.username}</td><td>{e.phone || ''}</td><td>{formatDate(e.createdAt)}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </section>
        ) : null}

        {role === 'EMPLOYEE' ? (
          <section>
            <header className="topbar card"><div><h2>Employee Portal</h2><p className="sub">{fullName || username}</p></div><button type="button" className="ghost" onClick={logout}>Logout</button></header>
            <nav className="tabs">
              <button type="button" className={`tab ${employeeTab === 'orders' ? 'active' : ''}`} onClick={() => setEmployeeTab('orders')}>Customer Orders</button>
              <button type="button" className={`tab ${employeeTab === 'profile' ? 'active' : ''}`} onClick={() => setEmployeeTab('profile')}>My Profile</button>
            </nav>

            <section className={`card tab-panel ${employeeTab === 'orders' ? 'active' : ''}`}>
              <h3>Customer Orders (Limited View)</h3>
              <div className="kpis" style={{ marginBottom: 12 }}>
                <div className="kpi"><span>Total Orders</span><strong>{employeeSummary.totalOrders}</strong></div>
                <div className="kpi"><span>Total Sold Gas</span><strong>{employeeSummary.totalSoldGas}</strong></div>
                <div className="kpi"><span>Total Revenue</span><strong>{formatAmount(employeeSummary.totalRevenue)}</strong></div>
              </div>
              <div className="inline-controls" style={{ marginBottom: 12 }}>
                <select value={selectedPartnerName} onChange={(e) => setSelectedPartnerName(e.target.value)}>
                  {deliveryPartners.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button type="button" onClick={assignDeliveryPartner}>Assign Delivery Partner</button>
                <button type="button" className="ghost" onClick={() => Promise.all([loadEmployeeData(), loadDeliveryPartners()]).catch((e) => setToast(e.message))}>Refresh</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Customer</th><th>Address</th><th>Amount</th><th>Status</th><th>Partner</th><th>Expected</th></tr></thead>
                  <tbody>
                    {employeeOrders.map((o) => (
                      <tr
                        key={o._id}
                        className={selectedEmployeeOrderId === o._id ? 'selected' : ''}
                        onClick={() => setSelectedEmployeeOrderId(o._id)}
                      >
                        <td>{o.userId?.fullName || o.userId?.username}</td>
                        <td>{o.addressLine}, {o.city} - {o.pincode}</td>
                        <td>Rs. {formatAmount(o.totalAmount)}</td>
                        <td>{o.status}</td>
                        <td>{o.deliveryPartnerName || '-'}</td>
                        <td>{formatDate(o.estimatedDeliveryAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`card tab-panel ${employeeTab === 'profile' ? 'active' : ''}`}>
              <h3>Update Profile</h3>
              <form className="form-grid two-col" onSubmit={(e) => { e.preventDefault(); updateProfile(profileForm, setProfileForm); }}>
                <input placeholder="Full Name" value={profileForm.fullName} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} />
                <input placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                <input className="wide" placeholder="Address" value={profileForm.defaultAddress} onChange={(e) => setProfileForm((p) => ({ ...p, defaultAddress: e.target.value }))} />
                <input placeholder="Current Password" type="password" value={profileForm.currentPassword} onChange={(e) => setProfileForm((p) => ({ ...p, currentPassword: e.target.value }))} />
                <input placeholder="New Password" type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm((p) => ({ ...p, newPassword: e.target.value }))} />
                <div className="form-actions wide"><button type="submit">Save Changes</button></div>
              </form>
            </section>
          </section>
        ) : null}

        {role === 'CUSTOMER' ? (
          <section>
            <header className="topbar card"><div><h2>Customer Portal</h2><p className="sub">{fullName || username}</p></div><button type="button" className="ghost" onClick={logout}>Logout</button></header>
            <nav className="tabs">
              <button type="button" className={`tab ${customerView === 'home' ? 'active' : ''}`} onClick={() => setCustomerView('home')}>Gas Company</button>
              <button type="button" className={`tab ${customerView === 'checkout' ? 'active' : ''}`} onClick={() => setCustomerView('checkout')}>Checkout</button>
              <button type="button" className={`tab ${customerView === 'orders' ? 'active' : ''}`} onClick={() => { setCustomerView('orders'); loadMyOrders().catch((e) => setToast(e.message)); }}>My Orders</button>
              <button type="button" className={`tab ${customerView === 'profile' ? 'active' : ''}`} onClick={() => setCustomerView('profile')}>My Profile</button>
            </nav>

            <section className={`card tab-panel ${customerView === 'home' ? 'active' : ''}`}>
              <h3>Gas Company</h3>
              <div className="company-grid">{companyProducts.map((p) => <article key={p.key} className="company-card"><h4>{p.title}</h4><p>{p.desc}</p><p className="price">Rs. {formatAmount(p.unitPrice)}</p><button type="button" onClick={() => { setSelectedProduct(p); setCustomerView('checkout'); setCheckoutStep(1); }}>Book Gas</button></article>)}</div>
            </section>

            <section className={`card tab-panel ${customerView === 'checkout' ? 'active' : ''}`}>
              <h3>Checkout</h3>
              <div className="stepper"><span className={checkoutStep >= 1 ? 'on' : ''}>1. Book Gas</span><span className={checkoutStep >= 2 ? 'on' : ''}>2. Address</span><span className={checkoutStep >= 3 ? 'on' : ''}>3. Billing</span></div>

              {checkoutStep === 1 ? <div className="form-grid two-col"><input value={`${selectedProduct.title} - Rs. ${formatAmount(selectedProduct.unitPrice)}`} readOnly /><input type="number" min="1" value={checkoutForm.quantity} onChange={(e) => setCheckoutForm((p) => ({ ...p, quantity: e.target.value }))} /><div className="form-actions wide"><button type="button" onClick={() => setCheckoutStep(2)}>Continue</button></div></div> : null}

              {checkoutStep === 2 ? <div className="form-grid two-col"><input className="wide" placeholder="Address line" value={checkoutForm.addressLine} onChange={(e) => setCheckoutForm((p) => ({ ...p, addressLine: e.target.value }))} /><input placeholder="City" value={checkoutForm.city} onChange={(e) => setCheckoutForm((p) => ({ ...p, city: e.target.value }))} /><input placeholder="Pincode" value={checkoutForm.pincode} onChange={(e) => setCheckoutForm((p) => ({ ...p, pincode: e.target.value }))} /><div className="form-actions wide"><button type="button" className="ghost" onClick={() => setCheckoutStep(1)}>Back</button><button type="button" onClick={() => setCheckoutStep(3)}>Continue</button></div></div> : null}

              {checkoutStep === 3 ? <div className="form-grid two-col"><select value={checkoutForm.paymentMethod} onChange={(e) => setCheckoutForm((p) => ({ ...p, paymentMethod: e.target.value }))}><option value="UPI">UPI</option><option value="Card">Card</option><option value="Cash On Delivery">Cash On Delivery</option></select><input readOnly value={`BILL-${Date.now()}`} /><div className="wide bill-box"><p><strong>Subtotal:</strong> Rs. {formatAmount(bill.subtotal)}</p><p><strong>Handling:</strong> Rs. {formatAmount(bill.handlingFee)}</p><p><strong>Total:</strong> Rs. {formatAmount(bill.total)}</p><p><strong>Delivery:</strong> Your order will be delivered in 2 days.</p></div><div className="form-actions wide"><button type="button" className="ghost" onClick={() => setCheckoutStep(2)}>Back</button><button type="button" onClick={placeCustomerOrder}>Place Order</button></div></div> : null}
            </section>

            <section className={`card tab-panel ${customerView === 'orders' ? 'active' : ''}`}>
              <h3>My Orders</h3>
              <div className="inline-controls"><button type="button" className="ghost" onClick={() => loadMyOrders().catch((e) => setToast(e.message))}>Refresh Orders</button></div>
              <div className="table-wrap"><table><thead><tr><th>Order No</th><th>Address</th><th>Amount</th><th>Status</th><th>Expected</th></tr></thead><tbody>{myOrders.map((o) => <tr key={o._id}><td>{o.orderNo}</td><td>{o.addressLine}, {o.city} - {o.pincode}</td><td>Rs. {formatAmount(o.totalAmount)}</td><td><span className={`order-status ${o.status === 'Delivered' ? 'done' : 'pending'}`}>{o.status}</span></td><td>{formatDate(o.estimatedDeliveryAt)}</td></tr>)}</tbody></table></div>
            </section>

            <section className={`card tab-panel ${customerView === 'profile' ? 'active' : ''}`}>
              <h3>Update Profile</h3>
              <form className="form-grid two-col" onSubmit={(e) => { e.preventDefault(); updateProfile(customerProfileForm, setCustomerProfileForm); }}>
                <input placeholder="Full Name" value={customerProfileForm.fullName} onChange={(e) => setCustomerProfileForm((p) => ({ ...p, fullName: e.target.value }))} />
                <input placeholder="Phone" value={customerProfileForm.phone} onChange={(e) => setCustomerProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                <input className="wide" placeholder="Default Address" value={customerProfileForm.defaultAddress} onChange={(e) => setCustomerProfileForm((p) => ({ ...p, defaultAddress: e.target.value }))} />
                <input placeholder="Current Password" type="password" value={customerProfileForm.currentPassword} onChange={(e) => setCustomerProfileForm((p) => ({ ...p, currentPassword: e.target.value }))} />
                <input placeholder="New Password" type="password" value={customerProfileForm.newPassword} onChange={(e) => setCustomerProfileForm((p) => ({ ...p, newPassword: e.target.value }))} />
                <div className="form-actions wide"><button type="submit">Save Changes</button></div>
              </form>
            </section>
          </section>
        ) : null}
      </main>

      <div id="toast" style={{ display: toast ? 'block' : 'none' }}>{toast}</div>
      <input type="hidden" value={todayISO()} readOnly />
    </>
  );
}
