'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LANGS, type Lang } from '../translations';
import { ArrowLeft, FileX, ShieldCheck } from 'lucide-react';

const termsContent = {
    th: {
        title: 'นโยบายการเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล',
        subtitle: 'เงื่อนไขการเก็บรักษาข้อมูลของลูกค้า',
        lastUpdated: 'อัปเดตล่าสุด: มีนาคม 2026',
        sections: [
            {
                heading: '1. ข้อมูลที่เราเก็บรวบรวม',
                body: 'เราเก็บรวบรวมข้อมูลดังต่อไปนี้เมื่อท่านลงทะเบียน:\n• ชื่อ-นามสกุล\n• เบอร์โทรศัพท์\n• หมายเลขห้อง (ถ้ามี)\n• LINE User ID\n• ข้อมูลเพิ่มเติม/หมายเหตุ',
            },
            {
                heading: '2. วัตถุประสงค์การใช้ข้อมูล',
                body: 'ข้อมูลของท่านจะถูกใช้เพื่อ:\n• ระบุตัวตนสำหรับการแจ้งซ่อมและบริการต่าง ๆ ผ่าน LINE\n• ติดต่อกลับเพื่อนัดหมายหรือแจ้งความคืบหน้า\n• ปรับปรุงคุณภาพการให้บริการ',
            },
            {
                heading: '3. การเปิดเผยข้อมูลต่อบุคคลที่สาม',
                body: 'เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของท่านต่อบุคคลภายนอก ยกเว้นกรณีที่กฎหมายกำหนดหรือได้รับความยินยอมจากท่านอย่างชัดเจน',
            },
            {
                heading: '4. ระยะเวลาในการเก็บรักษาข้อมูล',
                body: 'ข้อมูลจะถูกเก็บรักษาตลอดระยะเวลาที่ท่านเป็นลูกค้า และจะถูกลบออกเมื่อท่านร้องขอหรือเมื่อสิ้นสุดความสัมพันธ์ทางธุรกิจ',
            },
            {
                heading: '5. สิทธิ์ของท่าน',
                body: 'ท่านมีสิทธิ์:\n• เข้าถึงและแก้ไขข้อมูลส่วนบุคคลของท่าน\n• ขอลบข้อมูลของท่าน\n• ถอนความยินยอมได้ทุกเมื่อโดยติดต่อผู้ดูแลระบบ',
            },
            {
                heading: '6. การรักษาความปลอดภัย',
                body: 'เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของท่านจากการเข้าถึงโดยไม่ได้รับอนุญาต',
            },
        ],
        backBtn: '← กลับ',
    },
    en: {
        title: 'Personal Data Collection & Use Policy',
        subtitle: 'Customer Data Retention Terms',
        lastUpdated: 'Last updated: March 2026',
        sections: [
            {
                heading: '1. Data We Collect',
                body: 'We collect the following information when you register:\n• Full name\n• Phone number\n• Room number (if applicable)\n• LINE User ID\n• Additional notes / remarks',
            },
            {
                heading: '2. Purpose of Use',
                body: 'Your data will be used to:\n• Identify you for repair requests and LINE-based services\n• Contact you for appointment scheduling and progress updates\n• Improve the quality of our services',
            },
            {
                heading: '3. Third-Party Disclosure',
                body: 'We will not disclose your personal data to third parties, except where required by law or with your explicit consent.',
            },
            {
                heading: '4. Data Retention Period',
                body: 'Data will be retained for the duration of your customer relationship and deleted upon your request or when the business relationship ends.',
            },
            {
                heading: '5. Your Rights',
                body: 'You have the right to:\n• Access and correct your personal data\n• Request deletion of your data\n• Withdraw consent at any time by contacting the system administrator',
            },
            {
                heading: '6. Security',
                body: 'We implement appropriate security measures to protect your data from unauthorized access.',
            },
        ],
        backBtn: '← Back',
        },
    ja: {
        title: '個人情報の収集・利用に関するポリシー',
        subtitle: '顧客データ保管規約',
        lastUpdated: '最終更新：2026年3月',
        sections: [
            {
                heading: '1. 収集する情報',
                body: '登録時に以下の情報を収集します：\n• 氏名\n• 電話番号\n• 部屋番号（該当する場合）\n• LINE ユーザーID\n• 備考・追記事項',
            },
            {
                heading: '2. 利用目的',
                body: 'お客様の情報は以下の目的で使用されます：\n• 修理依頼およびLINEを通じたサービスの本人確認\n• 予約連絡および進捗のご報告\n• サービス品質の向上',
            },
            {
                heading: '3. 第三者への開示',
                body: '法律で定められた場合またはお客様の明示的な同意がある場合を除き、個人情報を第三者に開示することはありません。',
            },
            {
                heading: '4. データ保管期間',
                body: 'データはお客様がご利用されている期間中保管され、ご要望または取引関係の終了時に削除されます。',
            },
            {
                heading: '5. お客様の権利',
                body: 'お客様は以下の権利を有します：\n• 個人データへのアクセスおよび修正\n• データの削除要請\n• システム管理者への連絡により、いつでも同意を撤回',
            },
            {
                heading: '6. セキュリティ',
                body: '不正アクセスからお客様のデータを保護するために、適切なセキュリティ対策を講じています。',
            },
        ],
        backBtn: '← 戻る',
    },
} as const satisfies Record<Lang, {
    title: string;
    subtitle: string;
    lastUpdated: string;
    sections: { heading: string; body: string }[];
    backBtn: string;
}>;

function TermsContent() {
    const searchParams = useSearchParams();
    const initialLang = (['th', 'en', 'ja'].includes(searchParams.get('lang') ?? '')
        ? searchParams.get('lang')
        : 'th') as Lang;
    const [lang, setLang] = useState<Lang>(initialLang);
    const content = termsContent[lang];

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white px-4 py-10">
            <div className="max-w-lg mx-auto bg-white border border-green-100 rounded-2xl shadow-sm p-6">

                {/* Language switcher */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit ml-auto mb-4">
                    {LANGS.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            onClick={() => setLang(l.code)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                lang === l.code
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>{l.flag}</span>
                            <span>{l.label}</span>
                        </button>
                    ))}
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                        <FileX size={20} /> //แก้ให้เลือกภาษาได้
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">{content.title}</h1>
                        <p className="text-xs text-gray-500">{content.subtitle}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mb-6">{content.lastUpdated}</p>

                {/* Sections */}
                <div className="space-y-5">
                    {content.sections.map((section) => (
                        <div key={section.heading}>
                            <h2 className="text-sm font-semibold text-gray-800 mb-1">{section.heading}</h2>
                            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                {section.body}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Back button */}
                <div className="mt-8 pt-5 border-t">
                    <button
                        type="button"
                        onClick={() => window.close()}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        {content.backBtn}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TermsContent;
