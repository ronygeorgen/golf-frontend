import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSimulators, createSimulator, updateSimulator, deleteSimulator } from '../store/slices/adminSlice';
import { Clock } from 'lucide-react';
import { TableSkeleton } from './skeletons/SkeletonLoader';

function SimulatorManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { list: simulators, loading } = useAppSelector((state) => state.admin.simulators);
    const modalRef = useRef(null);
    
    const [showForm, setShowForm] = useState(false);
    const [editingSimulator, setEditingSimulator] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        bay_number: '',
        is_active: true,
        is_coaching_bay: false,
        description: ''
    });

    useEffect(() => {
        dispatch(getSimulators());
    }, [dispatch]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingSimulator(null);
                setFormData({ name: '', bay_number: '', is_active: true, is_coaching_bay: false, description: '' });
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingSimulator) {
            await dispatch(updateSimulator({ id: editingSimulator.id, simulatorData: formData }));
        } else {
            await dispatch(createSimulator(formData));
        }
        setShowForm(false);
        setEditingSimulator(null);
        setFormData({ name: '', bay_number: '', is_active: true, is_coaching_bay: false, description: '' });
        // No need to refetch - Redux already updates the state optimistically
    };

    const handleEdit = (simulator) => {
        setEditingSimulator(simulator);
        setFormData({
            name: simulator.name,
            bay_number: simulator.bay_number,
            is_active: simulator.is_active,
            is_coaching_bay: simulator.is_coaching_bay,
            description: simulator.description
        });
        setShowForm(true);
    };

    const handleToggleActive = async (simulatorId, isActive) => {
        await dispatch(updateSimulator({ id: simulatorId, simulatorData: { is_active: !isActive } }));
        // No need to refetch - Redux already updates the state optimistically
    };

    const handleDelete = async (simulatorId) => {
        if (window.confirm('Are you sure you want to delete this simulator?')) {
            await dispatch(deleteSimulator(simulatorId));
            // No need to refetch - Redux already updates the state optimistically
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <button 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                            onClick={() => setShowForm(true)}
                        >
                            Add Simulator
                        </button>
                    </div>
                </div>

                {/* Simulator Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingSimulator(null);
                        setFormData({ name: '', bay_number: '', is_active: true, is_coaching_bay: false, description: '' });
                    }}>
                        <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    {editingSimulator ? 'Edit Simulator' : 'Add Simulator'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Simulator Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bay Number
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.bay_number}
                                            onChange={(e) => setFormData({...formData, bay_number: parseInt(e.target.value)})}
                                            min="1"
                                            max="6"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            rows="3"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label className="ml-2 text-sm font-medium text-gray-700">
                                                Active
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_coaching_bay}
                                                onChange={(e) => setFormData({...formData, is_coaching_bay: e.target.checked})}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label className="ml-2 text-sm font-medium text-gray-700">
                                                Coaching Bay
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                        >
                                            {editingSimulator ? 'Update' : 'Create'} Simulator
                                        </button>
                                        <button 
                                            type="button" 
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingSimulator(null);
                                                setFormData({ name: '', bay_number: '', is_active: true, is_coaching_bay: false, description: '' });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Simulators List */}
                {loading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {simulators.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No simulators found. Add your first simulator.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Bay #
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {simulators.map(simulator => (
                                            <tr key={simulator.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    Bay {simulator.bay_number}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {simulator.name}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        simulator.is_coaching_bay 
                                                            ? 'bg-indigo-100 text-indigo-800' 
                                                            : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                        {simulator.is_coaching_bay ? 'Coaching Bay' : 'Simulator Bay'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        simulator.is_active 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {simulator.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2 flex-wrap">
                                                        <button 
                                                            className="text-blue-600 hover:text-blue-900"
                                                            onClick={() => handleEdit(simulator)}
                                                        >
                                                            Edit
                                                        </button>
                                                        {!simulator.is_coaching_bay && (
                                                            <button 
                                                                className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1"
                                                                onClick={() => navigate(`/admin/simulators/${simulator.id}/availability`)}
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                                Availability
                                                            </button>
                                                        )}
                                                        <button 
                                                            className={`${
                                                                simulator.is_active 
                                                                    ? 'text-orange-600 hover:text-orange-900' 
                                                                    : 'text-green-600 hover:text-green-900'
                                                            }`}
                                                            onClick={() => handleToggleActive(simulator.id, simulator.is_active)}
                                                        >
                                                            {simulator.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button 
                                                            className="text-red-600 hover:text-red-900"
                                                            onClick={() => handleDelete(simulator.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
    );
}

export default SimulatorManagement;
