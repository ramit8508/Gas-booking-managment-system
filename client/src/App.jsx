import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

function firstDayOfMonthISO() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString().slice(0, 10);
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
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('customers');

  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerForm, setCustomerForm] = useState({
    consumerNo: '',
    fullName: '',
    addressLine: '',
    phone: '',
  });

  const [bookingSearch, setBookingSearch] = useState('');
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [bookingForm, setBookingForm] = useState({
    customerId: '',
    cylinderType: 'Domestic',
    quantity: 1,
    billAmount: 0,
  });

  const [billingSearch, setBillingSearch] = useState('');
  const [selectedBillingBookingId, setSelectedBillingBookingId] = useState('');
  const [invoicePreview, setInvoicePreview] = useState('');

  const [fromDate, setFromDate] = useState(firstDayOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());
  const [deliveryRows, setDeliveryRows] = useState([]);

  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    deliveredBookings: 0,
    revenue: 0,
  });

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
    if (!res.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  async function loadCustomers(search = '') {
    const data = await api(`/customers?search=${encodeURIComponent(search)}`);
    setCustomers(data);
  }

  async function loadBookings(search = '') {
    const data = await api(`/bookings?search=${encodeURIComponent(search)}`);
    setBookings(data);
  }

  async function loadDeliveryRegister(customFromDate = fromDate, customToDate = toDate) {
    const data = await api(`/reports/delivery-register?fromDate=${encodeURIComponent(customFromDate)}&toDate=${encodeURIComponent(customToDate)}`);
    setDeliveryRows(data);
  }

  async function loadSummary(customMonth = month, customYear = year) {
    const data = await api(`/reports/monthly-summary?month=${customMonth}&year=${customYear}`);
    setSummary(data);
  }

  async function refreshAll() {
    await Promise.all([
      loadCustomers(customerSearch),
      loadBookings(bookingSearch),
      loadDeliveryRegister(),
      loadSummary(),
    ]);
  }

  useEffect(() => {
    if (!token) return;

    refreshAll().catch((err) => {
      setToast(err.message);
      logout();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function logout() {
    setToken('');
    setUsername('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setSelectedCustomerId('');
    setSelectedBookingId('');
    setSelectedBillingBookingId('');
    setInvoicePreview('');
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

      setToken(data.token);
      setUsername(data.username);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setToast('Login successful');
    } catch (err) {
      setToast(err.message);
    }
  }

  async function addCustomer(e) {
    e.preventDefault();
    try {
      await api('/customers', {
        method: 'POST',
        body: JSON.stringify(customerForm),
      });
      setToast('Customer added');
      await loadCustomers(customerSearch);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function updateCustomer() {
    if (!selectedCustomerId) {
      setToast('Select a customer first');
      return;
    }
    try {
      await api(`/customers/${selectedCustomerId}`, {
        method: 'PUT',
        body: JSON.stringify(customerForm),
      });
      setToast('Customer updated');
      await loadCustomers(customerSearch);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function deleteCustomer() {
    if (!selectedCustomerId) {
      setToast('Select a customer first');
      return;
    }
    if (!window.confirm('Delete selected customer?')) return;

    try {
      await api(`/customers/${selectedCustomerId}`, { method: 'DELETE' });
      setSelectedCustomerId('');
      setCustomerForm({ consumerNo: '', fullName: '', addressLine: '', phone: '' });
      setToast('Customer deleted');
      await loadCustomers(customerSearch);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function createBooking(e) {
    e.preventDefault();
    try {
      await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          customerId: bookingForm.customerId,
          cylinderType: bookingForm.cylinderType,
          quantity: Number(bookingForm.quantity),
          billAmount: Number(bookingForm.billAmount),
        }),
      });

      setToast('Booking created');
      await Promise.all([loadBookings(bookingSearch), loadDeliveryRegister(), loadSummary()]);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function markDelivered() {
    if (!selectedBookingId) {
      setToast('Select a booking first');
      return;
    }

    try {
      await api(`/bookings/${selectedBookingId}/deliver`, { method: 'PATCH' });
      setToast('Booking marked delivered');
      await Promise.all([loadBookings(bookingSearch), loadDeliveryRegister(), loadSummary()]);
    } catch (err) {
      setToast(err.message);
    }
  }

  async function loadInvoicePreview(bookingId) {
    if (!bookingId) {
      setInvoicePreview('');
      return;
    }
    try {
      const b = await api(`/bookings/${bookingId}/invoice`);
      const c = b.customerId || {};
      let text = '';
      text += 'GAS AGENCY MANAGEMENT SYSTEM\n';
      text += 'INVOICE / RECEIPT\n';
      text += '--------------------------------------------------\n';
      text += `Booking No: ${b.bookingNo}\n`;
      text += `Bill No: ${b.billNo}\n`;
      text += `Booking Date: ${formatDate(b.bookingDate)}\n`;
      text += `Status: ${b.bookingStatus}\n`;
      text += `Consumer No: ${c.consumerNo || ''}\n`;
      text += `Name: ${c.fullName || ''}\n`;
      text += `Phone: ${c.phone || ''}\n`;
      text += `Address: ${c.addressLine || ''}\n`;
      text += `Cylinder: ${b.cylinderType}\n`;
      text += `Quantity: ${b.quantity}\n`;
      text += `Bill Amount: Rs. ${formatAmount(b.billAmount)}\n`;
      if (b.deliveryDate) text += `Delivery Date: ${formatDate(b.deliveryDate)}\\n`;
      setInvoicePreview(text);
      return text;
    } catch (err) {
      setToast(err.message);
      return '';
    }
  }

  function printInvoice() {
    if (!invoicePreview.trim()) {
      setToast('Select an invoice first');
      return;
    }
    printHtml('Invoice', invoicePreview.replace(/\n/g, '<br/>'));
  }

  function printReceiptFromBooking() {
    if (!selectedBookingId) {
      setToast('Select a booking first');
      return;
    }

    setActiveTab('billing');
    setSelectedBillingBookingId(selectedBookingId);
    loadInvoicePreview(selectedBookingId).then(() => {
      setTimeout(async () => {
        const text = await loadInvoicePreview(selectedBookingId);
        if (text) {
          printHtml('Invoice', text.replace(/\\n/g, '<br/>'));
        }
      }, 150);
    });
  }

  async function searchBilling() {
    try {
      await loadBookings(billingSearch);
    } catch (err) {
      setToast(err.message);
    }
  }

  function printDeliveryRegister() {
    const lines = ['DELIVERY REGISTER', ''];
    deliveryRows.forEach((r) => {
      lines.push(`${r.bookingNo} | ${r.customerId?.fullName || ''} | ${r.customerId?.phone || ''} | ${formatDate(r.deliveryDate)} | ${formatAmount(r.billAmount)}`);
    });
    printHtml('Delivery Register', lines.join('<br/>'));
  }

  function printMonthlySummary() {
    const monthName = new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
    const lines = [
      'MONTHLY SUMMARY REPORT',
      `Month: ${monthName} ${year}`,
      '',
      `Total Bookings      : ${summary.totalBookings}`,
      `Booked (Pending)    : ${summary.pendingBookings}`,
      `Delivered           : ${summary.deliveredBookings}`,
      `Revenue (Delivered) : Rs. ${formatAmount(summary.revenue)}`,
    ];
    printHtml('Monthly Summary', lines.join('<br/>'));
  }

  const monthOptions = useMemo(() => {
    const out = [];
    for (let i = 1; i <= 12; i += 1) {
      out.push({
        value: i,
        label: new Date(2000, i - 1, 1).toLocaleString('en-US', { month: 'long' }),
      });
    }
    return out;
  }, []);

  return (
    <>
      <div className="bg-grid"></div>

      <main className="app-shell">
        {!token ? (
          <section className="card login-card">
            <h1>Gas Agency Management</h1>
            <p className="sub">Node.js + MongoDB edition (React)</p>
            <form className="form-grid" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </label>
              <button type="submit">Login</button>
            </form>
          </section>
        ) : (
          <section>
            <header className="topbar card">
              <div>
                <h2>Dashboard</h2>
                <p className="sub">Logged in as {username}</p>
              </div>
              <button className="ghost" onClick={logout}>Logout</button>
            </header>

            <nav className="tabs">
              <button className={`tab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Customers</button>
              <button className={`tab ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>Bookings</button>
              <button className={`tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>Billing Report</button>
              <button className={`tab ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>Delivery Register</button>
              <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Monthly Summary</button>
            </nav>

            <section className={`card tab-panel ${activeTab === 'customers' ? 'active' : ''}`}>
              <h3>Customer Module</h3>
              <div className="inline-controls">
                <input placeholder="Search consumer no or name" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                <button onClick={() => loadCustomers(customerSearch).catch((e) => setToast(e.message))}>Search</button>
                <button className="ghost" onClick={() => loadCustomers('').then(() => setCustomerSearch('')).catch((e) => setToast(e.message))}>Refresh</button>
              </div>

              <form className="form-grid two-col" onSubmit={addCustomer}>
                <input placeholder="Consumer No" value={customerForm.consumerNo} onChange={(e) => setCustomerForm((p) => ({ ...p, consumerNo: e.target.value }))} required />
                <input placeholder="Full Name" value={customerForm.fullName} onChange={(e) => setCustomerForm((p) => ({ ...p, fullName: e.target.value }))} required />
                <input placeholder="Address" value={customerForm.addressLine} onChange={(e) => setCustomerForm((p) => ({ ...p, addressLine: e.target.value }))} />
                <input placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
                <div className="form-actions wide">
                  <button type="submit">Add</button>
                  <button type="button" onClick={updateCustomer}>Update</button>
                  <button type="button" className="danger" onClick={deleteCustomer}>Delete</button>
                </div>
              </form>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Consumer No</th><th>Name</th><th>Phone</th><th>Address</th></tr></thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr
                        key={c._id}
                        className={selectedCustomerId === c._id ? 'selected' : ''}
                        onClick={() => {
                          setSelectedCustomerId(c._id);
                          setCustomerForm({
                            consumerNo: c.consumerNo || '',
                            fullName: c.fullName || '',
                            addressLine: c.addressLine || '',
                            phone: c.phone || '',
                          });
                        }}
                      >
                        <td>{c.consumerNo}</td>
                        <td>{c.fullName}</td>
                        <td>{c.phone || ''}</td>
                        <td>{c.addressLine || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`card tab-panel ${activeTab === 'bookings' ? 'active' : ''}`}>
              <h3>Booking Module</h3>
              <div className="inline-controls">
                <input placeholder="Search customer name or booking no" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} />
                <button onClick={() => loadBookings(bookingSearch).catch((e) => setToast(e.message))}>Search</button>
                <button className="ghost" onClick={() => loadBookings('').then(() => setBookingSearch('')).catch((e) => setToast(e.message))}>Refresh</button>
              </div>

              <form className="form-grid two-col" onSubmit={createBooking}>
                <select value={bookingForm.customerId} onChange={(e) => setBookingForm((p) => ({ ...p, customerId: e.target.value }))} required>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.fullName} ({c.consumerNo})</option>
                  ))}
                </select>

                <select value={bookingForm.cylinderType} onChange={(e) => setBookingForm((p) => ({ ...p, cylinderType: e.target.value }))}>
                  <option value="Domestic">Domestic</option>
                  <option value="Commercial">Commercial</option>
                </select>

                <input type="number" min="1" value={bookingForm.quantity} onChange={(e) => setBookingForm((p) => ({ ...p, quantity: e.target.value }))} required />
                <input type="number" min="0" step="0.01" value={bookingForm.billAmount} onChange={(e) => setBookingForm((p) => ({ ...p, billAmount: e.target.value }))} required />

                <div className="form-actions wide">
                  <button type="submit">Create Booking</button>
                  <button type="button" onClick={markDelivered}>Mark Delivered</button>
                  <button type="button" className="ghost" onClick={printReceiptFromBooking}>Print Receipt</button>
                </div>
              </form>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Booking No</th><th>Customer</th><th>Date</th><th>Status</th><th>Amount</th></tr></thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b._id} className={selectedBookingId === b._id ? 'selected' : ''} onClick={() => setSelectedBookingId(b._id)}>
                        <td>{b.bookingNo}</td>
                        <td>{b.customerId?.fullName || ''}</td>
                        <td>{formatDate(b.bookingDate)}</td>
                        <td>{b.bookingStatus}</td>
                        <td>{formatAmount(b.billAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`card tab-panel ${activeTab === 'billing' ? 'active' : ''}`}>
              <h3>Billing Report</h3>
              <div className="inline-controls">
                <input placeholder="Search name or booking no" value={billingSearch} onChange={(e) => setBillingSearch(e.target.value)} />
                <button onClick={searchBilling}>Search</button>
                <button className="ghost" onClick={printInvoice}>Print Invoice</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Booking No</th><th>Bill No</th><th>Name</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr
                        key={b._id}
                        className={selectedBillingBookingId === b._id ? 'selected' : ''}
                        onClick={() => {
                          setSelectedBillingBookingId(b._id);
                          loadInvoicePreview(b._id);
                        }}
                      >
                        <td>{b.bookingNo}</td>
                        <td>{b.billNo}</td>
                        <td>{b.customerId?.fullName || ''}</td>
                        <td>{formatDate(b.bookingDate)}</td>
                        <td>{formatAmount(b.billAmount)}</td>
                        <td>{b.bookingStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <pre className="preview">{invoicePreview}</pre>
            </section>

            <section className={`card tab-panel ${activeTab === 'delivery' ? 'active' : ''}`}>
              <h3>Delivery Register</h3>
              <div className="inline-controls">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <button onClick={() => loadDeliveryRegister().catch((e) => setToast(e.message))}>Load</button>
                <button className="ghost" onClick={printDeliveryRegister}>Print Register</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Booking No</th><th>Name</th><th>Phone</th><th>Delivery Date</th><th>Amount</th></tr></thead>
                  <tbody>
                    {deliveryRows.map((r) => (
                      <tr key={r._id}>
                        <td>{r.bookingNo}</td>
                        <td>{r.customerId?.fullName || ''}</td>
                        <td>{r.customerId?.phone || ''}</td>
                        <td>{formatDate(r.deliveryDate)}</td>
                        <td>{formatAmount(r.billAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`card tab-panel ${activeTab === 'summary' ? 'active' : ''}`}>
              <h3>Monthly Summary</h3>
              <div className="inline-controls">
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                <button onClick={() => loadSummary().catch((e) => setToast(e.message))}>Load Summary</button>
                <button className="ghost" onClick={printMonthlySummary}>Print Summary</button>
              </div>

              <div className="kpis">
                <div className="kpi"><span>Total Bookings</span><strong>{summary.totalBookings}</strong></div>
                <div className="kpi"><span>Booked (Pending)</span><strong>{summary.pendingBookings}</strong></div>
                <div className="kpi"><span>Delivered</span><strong>{summary.deliveredBookings}</strong></div>
                <div className="kpi"><span>Revenue</span><strong>{formatAmount(summary.revenue)}</strong></div>
              </div>
            </section>
          </section>
        )}
      </main>

      <div id="toast" style={{ display: toast ? 'block' : 'none' }}>{toast}</div>
    </>
  );
}
