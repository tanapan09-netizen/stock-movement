'use client';

import React from 'react';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

export type WorkflowStatus = 
    | 'pending' 
    | 'approved' 
    | 'rejected' 
    | 'in_progress' 
    | 'confirmed' 
    | 'completed' 
    | 'verified' 
    | 'cancelled'
    | 'ordered'
    | 'received';

interface WorkflowStepperProps {
    currentStep?: number; // Optional: 1-indexed. If not provided, will be inferred from status.
    totalSteps: number;
    status: WorkflowStatus;
    labels?: string[];
    size?: 'sm' | 'md' | 'lg';
    showLabels?: boolean;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
    currentStep: manualStep,
    totalSteps,
    status,
    labels = [],
    size = 'md',
    showLabels = true
}) => {
    // Determine current step based on status if not manually provided
    const getCurrentStep = (): number => {
        if (manualStep !== undefined) return manualStep;

        if (totalSteps === 4) {
            const s = status as string;
            // Maintenance Workflow
            if (s === 'pending') return 1;
            if (s === 'in_progress') return 2;
            if (s === 'confirmed') return 3;
            if (s === 'completed' || s === 'verified') return 4;

            // Part/Quotation Workflow
            if (s === 'approved') return 2;
            if (s === 'ordered') return 3;
            if (s === 'received') return 4;
            
            return 1;
        }
        
        // Default mappings
        if (status === 'pending') return 1;
        if (status === 'completed' || status === 'verified' || status === 'received') return totalSteps;
        
        return 1;
    };

    const currentStep = getCurrentStep();
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    const getStepStatus = (stepNumber: number) => {
        if (stepNumber < currentStep) return 'completed';
        if (stepNumber === currentStep) {
            const s = status as string;
            if (s === 'rejected' || s === 'cancelled') return 'failed';
            
            // If the status logically means this step is finished
            const isLastStep = stepNumber === totalSteps;
            const statusMatchesCompletion = s === 'completed' || s === 'verified' || s === 'received';
            
            if (statusMatchesCompletion && isLastStep) return 'completed';
            if (s === 'confirmed' && stepNumber === 3) return 'completed';
            if (s === 'approved' && stepNumber === 2 && totalSteps === 4) return 'completed';
            if (s === 'ordered' && stepNumber === 3 && totalSteps === 4) return 'completed';

            return 'active';
        }
        return 'upcoming';
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return {
                circle: 'w-5 h-5',
                line: 'h-0.5',
                icon: 10,
                text: 'text-[9px]'
            };
            case 'lg': return {
                circle: 'w-10 h-10',
                line: 'h-1.5',
                icon: 20,
                text: 'text-sm'
            };
            default: return {
                circle: 'w-8 h-8',
                line: 'h-1',
                icon: 16,
                text: 'text-xs'
            };
        }
    };

    const sizeClasses = getSizeClasses();

    return (
        <div className="w-full">
            <div className="flex items-center w-full px-1">
                {steps.map((step, index) => {
                    const stepStatus = getStepStatus(step);
                    const isLast = index === steps.length - 1;

                    return (
                        <React.Fragment key={step}>
                            {/* Step Circle */}
                            <div className="relative flex flex-col items-center">
                                <div
                                    className={`
                                        ${sizeClasses.circle} rounded-full flex items-center justify-center transition-all duration-500 z-10
                                        ${stepStatus === 'completed' ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : ''}
                                        ${stepStatus === 'active' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 ring-4 ring-blue-500/10' : ''}
                                        ${stepStatus === 'failed' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : ''}
                                        ${stepStatus === 'upcoming' ? 'bg-gray-100 dark:bg-slate-700/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-700' : ''}
                                    `}
                                >
                                    {stepStatus === 'completed' && <Check size={sizeClasses.icon} strokeWidth={3} />}
                                    {stepStatus === 'active' && <Clock size={sizeClasses.icon} strokeWidth={3} className="animate-pulse" />}
                                    {stepStatus === 'failed' && <X size={sizeClasses.icon} strokeWidth={3} />}
                                    {stepStatus === 'upcoming' && <span className={`${sizeClasses.text} font-black`}>{step}</span>}
                                </div>

                                {/* Label - Positioned absolutely below the circle */}
                                {showLabels && labels[index] && (
                                    <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-black transition-all duration-500 uppercase tracking-tighter ${sizeClasses.text} 
                                        ${stepStatus === 'upcoming' ? 'text-gray-300 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}
                                    `}>
                                        {labels[index]}
                                    </div>
                                )}
                            </div>

                            {/* Connector Line */}
                            {!isLast && (
                                <div className="flex-1 -mx-2">
                                    <div className={`w-full ${sizeClasses.line} rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700/50`}>
                                        <div
                                            className={`h-full transition-all duration-1000 ease-in-out ${
                                                stepStatus === 'completed' ? 'w-full bg-green-400' : 
                                                stepStatus === 'active' ? 'w-1/2 bg-blue-400' : 'w-0'
                                            }`}
                                        />
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            {/* Spacer for absolute labels */}
            {showLabels && labels.length > 0 && <div className="h-6" />}
        </div>
    );
};

export default WorkflowStepper;
