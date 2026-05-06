'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Globe, Check } from 'lucide-react';

type Locale = 'th' | 'en' | 'zh';

interface Translations {
    [key: string]: {
        th: string;
        en: string;
        zh: string;
    };
}

const translations: Translations = {
    // Navigation
    'nav.dashboard': { th: 'หน้าหลัก', en: 'Dashboard', zh: '仪表板' },
    'nav.products': { th: 'สินค้า', en: 'Products', zh: '产品' },
    'nav.movements': { th: 'เคลื่อนไหว', en: 'Movements', zh: '移动' },
    'nav.borrow': { th: 'ยืม/คืน', en: 'Borrow/Return', zh: '借用/归还' },
    'nav.po': { th: 'ใบสั่งซื้อ', en: 'Purchase Orders', zh: '采购订单' },
    'nav.settings': { th: 'ตั้งค่า', en: 'Settings', zh: '设置' },
    'nav.reports': { th: 'รายงาน', en: 'Reports', zh: '报告' },

    // Actions
    'action.add': { th: 'เพิ่ม', en: 'Add', zh: '添加' },
    'action.edit': { th: 'แก้ไข', en: 'Edit', zh: '编辑' },
    'action.delete': { th: 'ลบ', en: 'Delete', zh: '删除' },
    'action.save': { th: 'บันทึก', en: 'Save', zh: '保存' },
    'action.cancel': { th: 'ยกเลิก', en: 'Cancel', zh: '取消' },
    'action.search': { th: 'ค้นหา', en: 'Search', zh: '搜索' },
    'action.export': { th: 'ส่งออก', en: 'Export', zh: '导出' },
    'action.import': { th: 'นำเข้า', en: 'Import', zh: '导入' },

    // Common
    'common.loading': { th: 'กำลังโหลด...', en: 'Loading...', zh: '加载中...' },
    'common.noData': { th: 'ไม่มีข้อมูล', en: 'No data', zh: '没有数据' },
    'common.total': { th: 'รวม', en: 'Total', zh: '总计' },
    'common.quantity': { th: 'จำนวน', en: 'Quantity', zh: '数量' },
    'common.price': { th: 'ราคา', en: 'Price', zh: '价格' },
    'common.status': { th: 'สถานะ', en: 'Status', zh: '状态' },
    'common.date': { th: 'วันที่', en: 'Date', zh: '日期' },
    'common.name': { th: 'ชื่อ', en: 'Name', zh: '名称' },
    'common.all': { th: 'ทั้งหมด', en: 'All', zh: '全部' },

    // Products
    'product.code': { th: 'รหัสสินค้า', en: 'Product Code', zh: '产品代码' },
    'product.name': { th: 'ชื่อสินค้า', en: 'Product Name', zh: '产品名称' },
    'product.category': { th: 'หมวดหมู่', en: 'Category', zh: '类别' },
    'product.stock': { th: 'คงเหลือ', en: 'In Stock', zh: '库存' },
    'product.lowStock': { th: 'สต็อกต่ำ', en: 'Low Stock', zh: '库存不足' },

    // Dashboard
    'dashboard.welcome': { th: 'ยินดีต้อนรับ', en: 'Welcome', zh: '欢迎' },
    'dashboard.totalProducts': { th: 'สินค้าทั้งหมด', en: 'Total Products', zh: '产品总数' },
    'dashboard.totalValue': { th: 'มูลค่ารวม', en: 'Total Value', zh: '总价值' },
    'dashboard.pendingPO': { th: 'PO รอดำเนินการ', en: 'Pending PO', zh: '待处理订单' },
    'dashboard.recentActivity': { th: 'กิจกรรมล่าสุด', en: 'Recent Activity', zh: '最近活动' },

    // Messages
    'msg.saveSuccess': { th: 'บันทึกสำเร็จ!', en: 'Saved successfully!', zh: '保存成功！' },
    'msg.deleteConfirm': { th: 'ต้องการลบข้อมูลนี้?', en: 'Delete this item?', zh: '删除此项？' },
    'msg.error': { th: 'เกิดข้อผิดพลาด', en: 'An error occurred', zh: '发生错误' },
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('locale') as Locale;
            if (saved && ['th', 'en', 'zh'].includes(saved)) {
                return saved;
            }
        }
        return 'th';
    });

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
    };

    const t = (key: string): string => {
        const translation = translations[key];
        if (!translation) return key;
        return translation[locale] || translation['th'] || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}

// Language Switcher Component
export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'th' as Locale, name: 'ไทย', flag: '🇹🇭' },
        { code: 'en' as Locale, name: 'English', flag: '🇺🇸' },
        { code: 'zh' as Locale, name: '中文', flag: '🇨🇳' },
    ];

    const current = languages.find(l => l.code === locale);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="เลือกภาษา"
            >
                <Globe className="w-4 h-4" />
                <span className="text-lg">{current?.flag}</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-50 overflow-hidden min-w-[140px]">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLocale(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${locale === lang.code ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                    }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="flex-1 text-left">{lang.name}</span>
                                {locale === lang.code && (
                                    <Check className="w-4 h-4 text-blue-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
