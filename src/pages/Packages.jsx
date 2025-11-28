import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getActiveCoachingPackages,
    getMyPackagePurchases,
    getGiftsPending,
    getTransfersPending,
} from '../store/slices/coachingSlice';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import SessionTransfer from '../components/SessionTransfer';
import GiftClaim from '../components/GiftClaim';
import TransferClaim from '../components/TransferClaim';
import { Skeleton } from '../components/skeletons/SkeletonLoader';

function Packages() {
    const dispatch = useAppDispatch();
    const { packages, purchases, loading, purchasesLoading } = useAppSelector((state) => state.coaching);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('normal');
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [purchasePage, setPurchasePage] = useState(1);
    const pageSize = 5;

    useEffect(() => {
        dispatch(getActiveCoachingPackages());
        dispatch(getMyPackagePurchases());
        dispatch(getGiftsPending());
        dispatch(getTransfersPending());
    }, [dispatch]);

    useEffect(() => {
        setPurchasePage(1);
    }, [purchases.length]);

    const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);

    const handleOpenModal = (pkgId, type) => {
        setSelectedPackageId(pkgId);
        setModalType(type);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPackageId(null);
    };

    const handlePurchaseSuccess = () => {
        dispatch(getMyPackagePurchases());
        dispatch(getGiftsPending());
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Packages & Gifts</h1>
                        <p className="text-gray-600 mt-1">
                            Buy packages for yourself, gift entire packages, or share sessions from your existing purchases.
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <Skeleton height="24px" width="70%" className="mb-2" />
                                        <Skeleton height="16px" width="90%" />
                                    </div>
                                    <div className="text-right space-y-2">
                                        <Skeleton height="28px" width="80px" />
                                        <Skeleton height="16px" width="60px" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Skeleton height="16px" width="60%" />
                                    <Skeleton height="16px" width="80%" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Skeleton height="44px" />
                                    <Skeleton height="44px" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && packages.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                        No active packages available at the moment.
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    {packages.map((pkg) => {
                        const ownedSessions = purchases
                            .filter((purchase) => purchase.package === pkg.id)
                            .reduce((total, purchase) => total + (purchase.sessions_remaining || 0), 0);

                        return (
                            <div key={pkg.id} className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{pkg.title}</h3>
                                        <p className="text-sm text-gray-500">{pkg.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-blue-600">${pkg.price}</p>
                                        <p className="text-sm text-gray-500">{pkg.session_count} sessions</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
                                    <p>Session length: {pkg.session_duration_minutes} minutes</p>
                                    <p>You currently have <span className="font-semibold text-gray-800">{ownedSessions}</span> session(s) remaining for this package.</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => handleOpenModal(pkg.id, 'normal')}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200"
                                    >
                                        Buy for Myself
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(pkg.id, 'gift')}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200"
                                    >
                                        Gift Entire Package
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(pkg.id, 'organization')}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200"
                                    >
                                        Buy for Organization
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <SessionTransfer />
                </div>
                <div className="space-y-6">
                    <GiftClaim />
                    <TransferClaim />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">My Package Purchases</h2>
                    <button
                        onClick={() => dispatch(getMyPackagePurchases())}
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                    >
                        Refresh
                    </button>
                </div>
                {purchasesLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
                                <Skeleton height="20px" width="50%" />
                                <Skeleton height="16px" width="70%" />
                                <Skeleton height="16px" width="60%" />
                                <div className="flex items-center justify-between">
                                    <Skeleton height="24px" width="100px" rounded="rounded-full" />
                                    <Skeleton height="14px" width="120px" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : purchases.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">You haven&apos;t purchased any packages yet.</div>
                ) : (
                    <div className="grid gap-4">
                        {purchases
                            .slice((purchasePage - 1) * pageSize, purchasePage * pageSize)
                            .map((purchase) => {
                            const isGift = purchase.purchase_type === 'gift';
                            const owner = purchase.original_owner_details;
                            return (
                                <div key={purchase.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{purchase.purchase_name}</h3>
                                            <p className="text-sm text-gray-600">
                                                Package: {purchase.package_details?.title}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Sessions Remaining: <span className="font-semibold">{purchase.sessions_remaining}</span> / {purchase.sessions_total}
                                            </p>
                                            {isGift && owner && (
                                                <p className="text-sm text-purple-700 mt-1">
                                                    Gifted by {owner.first_name} {owner.last_name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end text-right space-y-1">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                isGift ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {isGift ? (purchase.gift_status === 'accepted' ? 'Gift (Accepted)' : 'Gift') : 'Personal Purchase'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Purchased on {new Date(purchase.purchased_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
                            <p className="text-sm text-gray-600">
                                Showing{' '}
                                {purchases.length === 0
                                    ? '0'
                                    : `${(purchasePage - 1) * pageSize + 1} - ${Math.min(purchasePage * pageSize, purchases.length)}`} of {purchases.length} purchases
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPurchasePage((prev) => Math.max(1, prev - 1))}
                                    disabled={purchasePage === 1}
                                    className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-gray-700">
                                    Page {purchasePage} of {Math.max(1, Math.ceil(purchases.length / pageSize))}
                                </span>
                                <button
                                    onClick={() => setPurchasePage((prev) => Math.min(Math.ceil(purchases.length / pageSize) || 1, prev + 1))}
                                    disabled={purchasePage >= Math.ceil(purchases.length / pageSize)}
                                    className="px-3 py-1 rounded-lg border border-blue-500 text-white bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PackagePurchaseModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                packageId={selectedPackageId}
                packageData={selectedPackage}
                onSuccess={handlePurchaseSuccess}
                defaultType={modalType}
                lockType={true}
                titleText={modalType === 'gift' ? 'Gift Entire Package' : 'Buy Package for Yourself'}
            />
        </div>
    );
}

export default Packages;

