'use client';

import React from 'react';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';

interface WorkflowStepperProps {
    currentStep: number; // 1-indexed
    totalSteps: number;
    status: WorkflowStatus;
    labels?: string[];
    size?: 'sm' | 'md' | 'lg';
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
    currentStep,
    totalSteps,
    status,
    labels = [],
    size = 'md'
}) => {
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    const getStepStatus = (stepNumber: number) => {
        if (stepNumber < currentStep) return 'completed';
        if (stepNumber === currentStep) {
            if (status === 'rejected' || status === 'cancelled') return 'failed';
            if (status === 'approved' || status === 'completed') return 'completed';
            return 'active';
        }
        return 'upcoming';
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return {
                circle: 'w-6 h-6',
                line: 'h-0.5',
                icon: 14,
                text: 'text-[10px]'
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
        <div className="w-full py-2">
            <div className="flex items-center w-full">
                {steps.map((step, index) => {
                    const stepStatus = getStepStatus(step);
                    const isLast = index === steps.length - 1;

                    return (
                        <React.Fragment key={step}>
                            {/* Step Circle */}
                            <div className="relative flex flex-col items-center group">
                                <div
                                    className={`
                                        ${sizeClasses.circle} rounded-full flex items-center justify-center transition-all duration-300
                                        ${stepStatus === 'completed' ? 'bg-green-500 text-white shadow-lg shadow-green-200 dark:shadow-green-900/20' : ''}
                                        ${stepStatus === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20 ring-4 ring-blue-100 dark:ring-blue-900/30' : ''}
                                        ${stepStatus === 'failed' ? 'bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-red-900/20' : ''}
                                        ${stepStatus === 'upcoming' ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500' : ''}
                                    `}
                                >
                                    {stepStatus === 'completed' && <Check size={sizeClasses.icon} />}
                                    {stepStatus === 'active' && <Clock size={sizeClasses.icon} className="animate-pulse" />}
                                    {stepStatus === 'failed' && <X size={sizeClasses.icon} />}
                                    {stepStatus === 'upcoming' && <span className={sizeClasses.text}>{step}</span>}
                                </div>

                                {/* Label */}
                                {labels[index] && (
                                    <div className={`absolute -bottom-6 whitespace-nowrap font-medium transition-colors duration-300 ${sizeClasses.text} ${
                                        stepStatus === 'upcoming' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                        {labels[index]}
                                    </div>
                                )}
                            </div>

                            {/* Connector Line */}
                            {!isLast && (
                                <div className="flex-1 mx-2">
                                    <div className={`w-full ${sizeClasses.line} rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700`}>
                                        <div
                                            className={`h-full transition-all duration-500 ease-out ${
                                                stepStatus === 'completed' ? 'w-full bg-green-500' : 
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
            {/* Spacer for labels */}
            {labels.length > 0 && <div className="h-6" />}
        </div>
    );
};

export default WorkflowStepper;
