import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getPackages,
    grantCoachingSessions,
    grantSimulatorCredits,
    resetOverrideStatus,
} from '../store/slices/adminSlice';

function AdminOverrides() {
    const dispatch = useAppDispatch();
    const { packages, overrides } = useAppSelector((state) => state.admin);
    const [coachingForm, setCoachingForm] = useState({
        clientIdentifier: '',
        packageId: '',
        sessionCount: 1,
        note: '',
    });
    const [simForm, setSimForm] = useState({
        clientIdentifier: '',
        tokenCount: 1,
        note: '',
    });

    useEffect(() => {
        if (packages.list.length === 0) {
            dispatch(getPackages());
        }
    }, [dispatch, packages.list.length]);

    useEffect(() => {
        return () => {
            dispatch(resetOverrideStatus('coaching'));
            dispatch(resetOverrideStatus('simulator'));
        };
    }, [dispatch]);

    const handleCoachingSubmit = (e) => {
        e.preventDefault();
        dispatch(resetOverrideStatus('coaching'));
        dispatch(
            grantCoachingSessions({
                client_identifier: coachingForm.clientIdentifier,
                package_id: coachingForm.packageId || undefined,
                session_count: Number(coachingForm.sessionCount) || 1,
                note: coachingForm.note,
            })
        );
    };

    const handleSimulatorSubmit = (e) => {
        e.preventDefault();
        dispatch(resetOverrideStatus('simulator'));
        dispatch(
            grantSimulatorCredits({
                client_identifier: simForm.clientIdentifier,
                token_count: Number(simForm.tokenCount) || 1,
                note: simForm.note,
            })
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-900 text-sm">
                <p className="font-semibold">Override capabilities</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Use this panel to restore coaching sessions or grant simulator credits inside the 24-hour lock window.</li>
                    <li>Search by email or phone; we’ll match the client automatically.</li>
                    <li>Admin overrides automatically log the actor performing the change.</li>
                </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Restore Coaching Sessions</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Add sessions back to a client’s package when you approve a late cancellation or goodwill credit.
                    </p>
                    <form className="space-y-4" onSubmit={handleCoachingSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client email or phone</label>
                            <input
                                type="text"
                                required
                                value={coachingForm.clientIdentifier}
                                onChange={(e) => setCoachingForm({ ...coachingForm, clientIdentifier: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. golfer@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
                            <select
                                value={coachingForm.packageId}
                                onChange={(e) => setCoachingForm({ ...coachingForm, packageId: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">Latest purchase for client</option>
                                {packages.list.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id} className="text-gray-900">
                                        {pkg.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sessions to add</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={coachingForm.sessionCount}
                                    onChange={(e) => setCoachingForm({ ...coachingForm, sessionCount: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                <input
                                    type="text"
                                    value={coachingForm.note}
                                    onChange={(e) => setCoachingForm({ ...coachingForm, note: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional admin note"
                                />
                            </div>
                        </div>
                        {overrides.coaching.error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                                {typeof overrides.coaching.error === 'string'
                                    ? overrides.coaching.error
                                    : JSON.stringify(overrides.coaching.error)}
                            </div>
                        )}
                        {overrides.coaching.success && (
                            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                                {overrides.coaching.success}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={overrides.coaching.loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            {overrides.coaching.loading ? 'Adding Sessions...' : 'Add Sessions'}
                        </button>
                    </form>
                </div>

                <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Grant Simulator Credits</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Give clients a free simulator session credit for approved cancellations or goodwill gestures.
                    </p>
                    <form className="space-y-4" onSubmit={handleSimulatorSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client email or phone</label>
                            <input
                                type="text"
                                required
                                value={simForm.clientIdentifier}
                                onChange={(e) => setSimForm({ ...simForm, clientIdentifier: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. golfer@example.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Credits to grant</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={simForm.tokenCount}
                                    onChange={(e) => setSimForm({ ...simForm, tokenCount: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                <input
                                    type="text"
                                    value={simForm.note}
                                    onChange={(e) => setSimForm({ ...simForm, note: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional admin note"
                                />
                            </div>
                        </div>
                        {overrides.simulator.error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                                {typeof overrides.simulator.error === 'string'
                                    ? overrides.simulator.error
                                    : JSON.stringify(overrides.simulator.error)}
                            </div>
                        )}
                        {overrides.simulator.success && (
                            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
                                {overrides.simulator.success}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={overrides.simulator.loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            {overrides.simulator.loading ? 'Granting Credits...' : 'Grant Credits'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminOverrides;

