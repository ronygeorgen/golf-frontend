import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Package, CreditCard, Mail, ArrowLeft } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createUser } from '../store/slices/adminSlice';
import CreateUserModal from '../components/CreateUserModal';
import SquarePaymentModal from '../components/SquarePaymentModal';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

/**
 * Staff Quick Checkout wizard:
 * 1) Select / create member
 * 2) Select catalog package OR build one-off
 * 3) Card payment (Square) and/or email payment link (Resend)
 */
export default function QuickCheckout() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    const [step, setStep] = useState(1);
    const [search, setSearch] = useState('');
    const [members, setMembers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showCreateUser, setShowCreateUser] = useState(false);

    const [mode, setMode] = useState('catalog'); // catalog | oneoff
    const [packages, setPackages] = useState([]);
    const [simPackages, setSimPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null); // { id, type, title, price }

    const [oneOff, setOneOff] = useState({
        service_category_id: '',
        title: '',
        price: '',
        session_count: 1,
        simulator_hours: 0,
        session_duration_minutes: 60,
        category_hours: 0,
    });
    const [categories, setCategories] = useState([]);

    const [pending, setPending] = useState(null); // { temp_id, price, title, package_id, package_type }
    const [showPay, setShowPay] = useState(false);
    const [linkEmail, setLinkEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const selectedOneOffCat = categories.find((c) => String(c.id) === String(oneOff.service_category_id));
    const oneOffMode = !selectedOneOffCat
        ? null
        : selectedOneOffCat.legacy_booking_type === 'simulator'
          ? 'simulator'
          : selectedOneOffCat.legacy_booking_type === 'coaching'
            ? 'coaching'
            : 'dynamic';

    useEffect(() => {
        const loadPackages = async () => {
            try {
                const [cRes, sRes, catRes] = await Promise.all([
                    apiClient.get(endpoints.coaching.active),
                    apiClient.get(endpoints.coaching.simulatorPackagesActive),
                    apiClient.get(endpoints.categories.active),
                ]);
                setPackages(Array.isArray(cRes.data) ? cRes.data : cRes.data?.results || []);
                setSimPackages(Array.isArray(sRes.data) ? sRes.data : sRes.data?.results || []);
                const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data?.results || [];
                setCategories(cats.filter((c) => c.is_active !== false));
            } catch (e) {
                console.error(e);
            }
        };
        loadPackages();
    }, []);

    useEffect(() => {
        if (!search || search.length < 2) {
            setMembers([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await apiClient.get(endpoints.auth.memberList, {
                    params: { search, page: 1 },
                });
                setMembers(res.data?.members || res.data?.results || res.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const handleCreateUser = async (formData) => {
        const userData = {
            ...formData,
            ghl_location_id: user?.ghl_location_id || localStorage.getItem('locationId'),
            role: 'client',
        };
        const result = await dispatch(createUser(userData));
        if (createUser.fulfilled.match(result)) {
            const created = result.payload;
            setSelectedMember(created);
            setLinkEmail(created.email || '');
            setStep(2);
            setShowCreateUser(false);
        } else {
            const payload = result.payload;
            let msg = 'Failed to create member';
            if (typeof payload === 'string') msg = payload;
            else if (payload?.error) msg = payload.error;
            else if (payload && typeof payload === 'object') {
                const vals = Object.values(payload);
                const first = vals.length ? (Array.isArray(vals[0]) ? vals[0][0] : vals[0]) : null;
                if (first) msg = String(first);
            }
            throw new Error(msg);
        }
    };

    const selectMember = (m) => {
        setSelectedMember(m);
        setLinkEmail(m.email || '');
        setStep(2);
        setError(null);
        setMessage(null);
    };

    const createTempFromCatalog = async () => {
        if (!selectedPackage || !selectedMember?.phone) return;
        setBusy(true);
        setError(null);
        try {
            const res = await apiClient.post(endpoints.coaching.quickCheckoutTemp, {
                package_id: selectedPackage.id,
                package_type: selectedPackage.type,
                buyer_phone: selectedMember.phone,
                referral_id: user?.id,
            });
            setPending({
                temp_id: res.data.temp_id,
                price: parseFloat(res.data.price),
                title: res.data.title,
                package_id: res.data.package_id,
                package_type: res.data.package_type,
            });
            setStep(3);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to create checkout.');
        } finally {
            setBusy(false);
        }
    };

    const createTempFromOneOff = async () => {
        if (!selectedMember?.phone) return;
        if (!oneOff.service_category_id) {
            setError('Pick a service category.');
            return;
        }
        if (!(oneOff.title || '').trim()) {
            setError('Title is required.');
            return;
        }
        if (oneOffMode !== 'simulator' && !(parseInt(oneOff.session_count, 10) >= 1)) {
            setError('Enter number of sessions.');
            return;
        }
        if (oneOffMode === 'simulator' && !(parseFloat(oneOff.simulator_hours) > 0)) {
            setError('Enter simulator hours.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const payload = {
                buyer_phone: selectedMember.phone,
                service_category_id: oneOff.service_category_id,
                title: oneOff.title.trim(),
                price: oneOff.price,
                session_duration_minutes: oneOff.session_duration_minutes,
                referral_id: user?.id,
            };
            if (oneOffMode === 'simulator') {
                payload.simulator_hours = oneOff.simulator_hours;
            } else if (oneOffMode === 'coaching') {
                payload.session_count = oneOff.session_count;
                payload.simulator_hours = oneOff.simulator_hours || 0;
            } else {
                payload.session_count = oneOff.session_count;
                payload.category_hours = oneOff.category_hours || 0;
            }
            const res = await apiClient.post(endpoints.coaching.quickCheckoutOneOff, payload);
            setPending({
                temp_id: res.data.temp_id,
                price: parseFloat(res.data.price),
                title: res.data.title,
                package_id: res.data.package_id,
                package_type: res.data.package_type,
            });
            setStep(3);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to create one-off package.');
        } finally {
            setBusy(false);
        }
    };

    const sendPaymentLink = async () => {
        if (!pending?.temp_id || !linkEmail) {
            setError('Buyer email is required for payment link.');
            return;
        }
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
                    const res = await apiClient.post(endpoints.square.paymentLink, {
                temp_id: pending.temp_id,
                payment_type: 'package',
                amount: pending.price,
                buyer_email: linkEmail,
                item_description: pending.title,
            });
            setMessage(
                res.data.email_sent
                    ? `Payment link emailed to ${linkEmail}. Do not also take card for this sale unless the customer says they did not pay.`
                    : `Link created but email failed. URL: ${res.data.payment_url}`
            );
            // Keep card option available, but surface the double-pay risk clearly
            setError(null);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to send payment link.');
        } finally {
            setBusy(false);
        }
    };

    const resetFlow = () => {
        setStep(1);
        setSelectedMember(null);
        setSelectedPackage(null);
        setPending(null);
        setShowPay(false);
        setMessage(null);
        setError(null);
        setSearch('');
    };

    const goBack = () => {
        setError(null);
        setMessage(null);
        if (step === 3) {
            setPending(null);
            setShowPay(false);
            setSelectedPackage(null);
            setStep(2);
            return;
        }
        if (step === 2) {
            setSelectedPackage(null);
            setSelectedMember(null);
            setStep(1);
            return;
        }
        // Step 1 — leave Quick Checkout
        navigate(-1);
    };

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-text-primary">Quick Checkout</h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Sell a catalog or one-off package to a member and take payment now or email a Square link.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={goBack}
                    className="flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
            </div>

            <div className="flex gap-2 text-sm">
                {[1, 2, 3].map((n) => (
                    <div
                        key={n}
                        className={`px-3 py-1 rounded-full border ${
                            step === n
                                ? 'bg-primary text-white border-primary'
                                : step > n
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'border-border text-text-muted'
                        }`}
                    >
                        {n === 1 ? 'Member' : n === 2 ? 'Package' : 'Payment'}
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
            )}
            {message && (
                <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg p-3 text-sm">{message}</div>
            )}

            {step === 1 && (
                <div className="bg-surface border border-border rounded-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-medium text-text-primary">Select member</h2>
                        <Button type="button" onClick={() => setShowCreateUser(true)} className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" /> New member
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, phone, or email…"
                            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                        />
                    </div>
                    {searching && <p className="text-sm text-text-muted">Searching…</p>}
                    <ul className="divide-y divide-border max-h-80 overflow-auto">
                        {members.map((m) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => selectMember(m)}
                                    className="w-full text-left px-3 py-3 hover:bg-background transition-colors"
                                >
                                    <div className="font-medium text-text-primary">
                                        {[m.first_name, m.last_name].filter(Boolean).join(' ') || m.username}
                                    </div>
                                    <div className="text-xs text-text-secondary">
                                        {m.phone} {m.email ? `· ${m.email}` : ''}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {step === 2 && selectedMember && (
                <div className="bg-surface border border-border rounded-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-medium text-text-primary">Choose package</h2>
                            <p className="text-xs text-text-secondary">
                                For {[selectedMember.first_name, selectedMember.last_name].filter(Boolean).join(' ') || selectedMember.phone}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="text-sm text-primary flex items-center gap-1 shrink-0"
                            onClick={goBack}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('catalog')}
                            className={`px-3 py-2 rounded-lg text-sm border ${mode === 'catalog' ? 'bg-primary text-white border-primary' : 'border-border'}`}
                        >
                            Existing package
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('oneoff')}
                            className={`px-3 py-2 rounded-lg text-sm border ${mode === 'oneoff' ? 'bg-primary text-white border-primary' : 'border-border'}`}
                        >
                            One-off package
                        </button>
                    </div>

                    {mode === 'catalog' && (
                        <div className="space-y-3">
                            <Button
                                type="button"
                                disabled={!selectedPackage || busy}
                                onClick={createTempFromCatalog}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                <Package className="w-4 h-4" /> Continue to payment
                            </Button>
                            {selectedPackage && (
                                <p className="text-xs text-text-secondary">
                                    Selected: <span className="font-medium text-text-primary">{selectedPackage.title}</span>
                                    {' '}· ${parseFloat(selectedPackage.price).toFixed(2)}
                                </p>
                            )}
                            <div className="space-y-3 max-h-96 overflow-auto">
                                <p className="text-xs font-semibold text-text-muted uppercase">Coaching / Combo</p>
                                {packages.map((p) => (
                                    <button
                                        key={`c-${p.id}`}
                                        type="button"
                                        onClick={() =>
                                            setSelectedPackage({
                                                id: p.id,
                                                type: 'coaching',
                                                title: p.title,
                                                price: p.price,
                                            })
                                        }
                                        className={`w-full text-left p-3 rounded-lg border ${
                                            selectedPackage?.id === p.id && selectedPackage?.type === 'coaching'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border'
                                        }`}
                                    >
                                        <div className="flex justify-between gap-2">
                                            <span className="font-medium">{p.title}</span>
                                            <span>${parseFloat(p.price).toFixed(2)}</span>
                                        </div>
                                        <div className="text-xs text-text-secondary">
                                            {p.session_count} sessions
                                            {parseFloat(p.simulator_hours || 0) > 0 ? ` · ${p.simulator_hours} sim hrs` : ''}
                                            {parseFloat(p.category_hours || 0) > 0
                                                ? ` · ${p.category_hours} ${(p.service_category_name || p.customer_label || 'category')} hrs`
                                                : ''}
                                        </div>
                                    </button>
                                ))}
                                <p className="text-xs font-semibold text-text-muted uppercase pt-2">Simulator</p>
                                {simPackages.map((p) => (
                                    <button
                                        key={`s-${p.id}`}
                                        type="button"
                                        onClick={() =>
                                            setSelectedPackage({
                                                id: p.id,
                                                type: 'simulator',
                                                title: p.title,
                                                price: p.price,
                                            })
                                        }
                                        className={`w-full text-left p-3 rounded-lg border ${
                                            selectedPackage?.id === p.id && selectedPackage?.type === 'simulator'
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border'
                                        }`}
                                    >
                                        <div className="flex justify-between gap-2">
                                            <span className="font-medium">{p.title}</span>
                                            <span>${parseFloat(p.price).toFixed(2)}</span>
                                        </div>
                                        <div className="text-xs text-text-secondary">{p.hours} hours</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'oneoff' && (
                        <div className="space-y-3">
                            <Button
                                type="button"
                                disabled={!oneOff.price || !oneOff.service_category_id || !(oneOff.title || '').trim() || busy}
                                onClick={createTempFromOneOff}
                                className="w-full"
                            >
                                Continue to payment
                            </Button>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Service category
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                    value={oneOff.service_category_id}
                                    onChange={(e) =>
                                        setOneOff((o) => ({
                                            ...o,
                                            service_category_id: e.target.value,
                                            simulator_hours: 0,
                                            category_hours: 0,
                                            session_count: 1,
                                        }))
                                    }
                                >
                                    <option value="">Select category…</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.customer_label || c.name}
                                        </option>
                                    ))}
                                </select>
                                {oneOffMode === 'coaching' && (
                                    <p className="text-xs text-text-muted mt-1">
                                        Optional: add simulator hours below to make it a combo.
                                    </p>
                                )}
                                {oneOffMode === 'dynamic' && (
                                    <p className="text-xs text-text-muted mt-1">
                                        Optional: add category hours below (e.g. court/table time) to make it a combo.
                                    </p>
                                )}
                                {oneOffMode === 'simulator' && (
                                    <p className="text-xs text-text-muted mt-1">Simulator hours only.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                                <input
                                    className="w-full px-3 py-2 border border-border rounded-lg"
                                    placeholder="e.g. Walk-in Football — 2 sessions"
                                    required
                                    value={oneOff.title}
                                    onChange={(e) => setOneOff((o) => ({ ...o, title: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Price (pre-tax)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    className="w-full px-3 py-2 border border-border rounded-lg"
                                    placeholder="0.00"
                                    value={oneOff.price}
                                    onChange={(e) => setOneOff((o) => ({ ...o, price: e.target.value }))}
                                />
                            </div>

                            {oneOffMode === 'simulator' && (
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Simulator hours
                                    </label>
                                    <input
                                        type="number"
                                        min="0.25"
                                        step="0.25"
                                        className="w-full px-3 py-2 border border-border rounded-lg"
                                        placeholder="e.g. 2"
                                        value={oneOff.simulator_hours}
                                        onChange={(e) => setOneOff((o) => ({ ...o, simulator_hours: e.target.value }))}
                                    />
                                </div>
                            )}

                            {(oneOffMode === 'coaching' || oneOffMode === 'dynamic') && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">
                                            Number of sessions
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-border rounded-lg"
                                            placeholder="e.g. 5"
                                            value={oneOff.session_count}
                                            onChange={(e) =>
                                                setOneOff((o) => ({
                                                    ...o,
                                                    session_count: parseInt(e.target.value || '0', 10),
                                                }))
                                            }
                                        />
                                    </div>
                                    {oneOffMode === 'coaching' && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                Simulator hours (optional — set &gt; 0 for combo)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.25"
                                                className="w-full px-3 py-2 border border-border rounded-lg"
                                                placeholder="0"
                                                value={oneOff.simulator_hours}
                                                onChange={(e) =>
                                                    setOneOff((o) => ({ ...o, simulator_hours: e.target.value }))
                                                }
                                            />
                                        </div>
                                    )}
                                    {oneOffMode === 'dynamic' && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                Category asset hours (optional — set &gt; 0 for combo)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.25"
                                                className="w-full px-3 py-2 border border-border rounded-lg"
                                                placeholder="0"
                                                value={oneOff.category_hours}
                                                onChange={(e) =>
                                                    setOneOff((o) => ({ ...o, category_hours: e.target.value }))
                                                }
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {step === 3 && pending && (
                <div className="bg-surface border border-border rounded-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-medium text-text-primary">Payment</h2>
                        <button
                            type="button"
                            className="text-sm text-primary flex items-center gap-1 shrink-0"
                            onClick={goBack}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                        </button>
                    </div>
                    <div className="text-sm text-text-secondary">
                        <div><strong className="text-text-primary">{pending.title}</strong></div>
                        <div>Pre-tax: ${pending.price.toFixed(2)} (HST added at checkout)</div>
                        <div>
                            Member:{' '}
                            {[selectedMember?.first_name, selectedMember?.last_name].filter(Boolean).join(' ') ||
                                selectedMember?.phone}
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={() => setShowPay(true)}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" /> Enter card now
                    </Button>

                    <div className="border-t border-border pt-4 space-y-2">
                        <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Email payment link instead
                        </p>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-border rounded-lg"
                            placeholder="Customer email"
                            value={linkEmail}
                            onChange={(e) => setLinkEmail(e.target.value)}
                        />
                        <Button type="button" disabled={busy || !linkEmail} onClick={sendPaymentLink} className="w-full">
                            Send payment link via email
                        </Button>
                    </div>

                    <button type="button" className="text-sm text-text-secondary underline" onClick={resetFlow}>
                        Start over
                    </button>
                </div>
            )}

            <CreateUserModal
                isOpen={showCreateUser}
                onClose={() => setShowCreateUser(false)}
                onSave={handleCreateUser}
            />

            {showPay && pending && (
                <SquarePaymentModal
                    isOpen={showPay}
                    onClose={() => setShowPay(false)}
                    onSuccess={() => {
                        setShowPay(false);
                        setMessage('Payment successful. Purchase credited to member.');
                    }}
                    amount={pending.price}
                    currency="CAD"
                    tempId={pending.temp_id}
                    paymentType="package"
                    description={pending.title}
                    packageId={pending.package_id}
                />
            )}
        </div>
    );
}
