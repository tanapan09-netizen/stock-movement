'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Palette, Check, X, Sparkles } from 'lucide-react';

interface ThemeColors {
    primary: string;
    accent: string;
}

interface ThemeContextType {
    colors: ThemeColors;
    setColors: (colors: ThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const colorPresets = [
    { name: 'Ocean Blue', primary: '#3b82f6', accent: '#8b5cf6' },
    { name: 'Forest Green', primary: '#10b981', accent: '#14b8a6' },
    { name: 'Sunset Orange', primary: '#f97316', accent: '#ef4444' },
    { name: 'Royal Purple', primary: '#8b5cf6', accent: '#ec4899' },
    { name: 'Rose Gold', primary: '#f43f5e', accent: '#fb7185' },
    { name: 'Midnight', primary: '#1e293b', accent: '#475569' },
];

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const [colors, setColorsState] = useState<ThemeColors>({
        primary: '#3b82f6',
        accent: '#8b5cf6'
    });

    const applyColors = (newColors: ThemeColors) => {
        document.documentElement.style.setProperty('--color-primary', newColors.primary);
        document.documentElement.style.setProperty('--color-accent', newColors.accent);

        // Generate lighter/darker variants
        const primaryRGB = hexToRgb(newColors.primary);
        if (primaryRGB) {
            document.documentElement.style.setProperty('--color-primary-light',
                `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, 0.1)`);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('themeColors');
        if (saved) {
            const parsed = JSON.parse(saved);
            setColorsState(parsed);
            applyColors(parsed);
        }
    }, []);

    const setColors = (newColors: ThemeColors) => {
        setColorsState(newColors);
        localStorage.setItem('themeColors', JSON.stringify(newColors));
        applyColors(newColors);
    };

    return (
        <ThemeContext.Provider value={{ colors, setColors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeColors() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeColors must be used within ThemeColorProvider');
    }
    return context;
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Theme customizer modal
export function ThemeCustomizer() {
    const [isOpen, setIsOpen] = useState(false);
    const { colors, setColors } = useThemeColors();
    const [tempColors, setTempColors] = useState(colors);

    const handleSave = () => {
        setColors(tempColors);
        setIsOpen(false);
    };

    const handlePreset = (preset: typeof colorPresets[0]) => {
        setTempColors({ primary: preset.primary, accent: preset.accent });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="ปรับแต่งธีม"
            >
                <Palette className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                ปรับแต่งธีม
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="ปิด">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Presets */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">ธีมสำเร็จรูป</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {colorPresets.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => handlePreset(preset)}
                                            className={`p-3 rounded-lg border-2 transition ${tempColors.primary === preset.primary
                                                ? 'border-blue-500'
                                                : 'border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex gap-1 mb-2">
                                                <div
                                                    className="w-6 h-6 rounded-full"
                                                    style={{ backgroundColor: preset.primary }}
                                                />
                                                <div
                                                    className="w-6 h-6 rounded-full"
                                                    style={{ backgroundColor: preset.accent }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300">{preset.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Colors */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">สีกำหนดเอง</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">สีหลัก (Primary)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={tempColors.primary}
                                                onChange={(e) => setTempColors(prev => ({ ...prev, primary: e.target.value }))}
                                                className="w-10 h-10 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={tempColors.primary}
                                                onChange={(e) => setTempColors(prev => ({ ...prev, primary: e.target.value }))}
                                                className="flex-1 px-2 py-1 border rounded text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">สีเสริม (Accent)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={tempColors.accent}
                                                onChange={(e) => setTempColors(prev => ({ ...prev, accent: e.target.value }))}
                                                className="w-10 h-10 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={tempColors.accent}
                                                onChange={(e) => setTempColors(prev => ({ ...prev, accent: e.target.value }))}
                                                className="flex-1 px-2 py-1 border rounded text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">ตัวอย่าง</h3>
                                <div className="p-4 rounded-lg border" style={{ background: `linear-gradient(135deg, ${tempColors.primary}, ${tempColors.accent})` }}>
                                    <p className="text-white font-medium">Stock Movement Pro</p>
                                    <p className="text-white/80 text-sm">ระบบจัดการคลังสินค้า</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
                                style={{ backgroundColor: tempColors.primary }}
                            >
                                <Check className="w-4 h-4" />
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
