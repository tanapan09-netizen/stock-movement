import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  FileClock,
  FolderKanban,
  ShoppingCart,
  Wallet,
} from 'lucide-react';

import {
  ACCOUNTING_DASHBOARD_COPY,
  ACCOUNTING_DASHBOARD_HERO_STATS,
  ACCOUNTING_DASHBOARD_QUICK_LINKS,
  type AccountingDashboardHeroStatKey,
  type AccountingDashboardMetricCardIconKey,
  type AccountingDashboardQuickLinkIconKey,
  getAccountingApprovalTypeMeta,
  getAccountingPettyCashStatusMeta,
  getAccountingPurchaseOrderStatusMeta,
} from '@/lib/accounting-dashboard';
import type { RolePermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { canAccessDashboardPage } from '@/lib/rbac';
import type { Prisma } from '@prisma/client';

type Props = {
  role?: string;
  permissions?: RolePermissions;
  isApprover?: boolean;
};

const money = (value: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value || 0);

const count = (value: number) => new Intl.NumberFormat('th-TH').format(value || 0);

const date = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }).format(value)
    : '-';

const num = (value: unknown) => Number(value || 0);

function StatCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>{icon}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

const accountingQuickLinkIcons: Record<AccountingDashboardQuickLinkIconKey, ReactNode> = {
  pettyCash: <Wallet className="h-5 w-5 text-emerald-600" />,
  approvals: <FileClock className="h-5 w-5 text-rose-600" />,
  purchaseRequests: <ShoppingCart className="h-5 w-5 text-cyan-600" />,
  purchaseOrders: <ClipboardCheck className="h-5 w-5 text-blue-600" />,
  partRequests: <FolderKanban className="h-5 w-5 text-amber-600" />,
  assets: <BriefcaseBusiness className="h-5 w-5 text-violet-600" />,
};

const accountingMetricCardIcons: Record<AccountingDashboardMetricCardIconKey, ReactNode> = {
  wallet: <Wallet className="h-6 w-6 text-emerald-700" />,
  approvals: <FileClock className="h-6 w-6 text-rose-700" />,
  purchaseOrders: <CreditCard className="h-6 w-6 text-blue-700" />,
  assets: <BriefcaseBusiness className="h-6 w-6 text-violet-700" />,
};

export default async function AccountingDashboard({
  role,
  permissions = {},
  isApprover = false,
}: Props) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const accountingApprovalWhere: Prisma.tbl_approval_requestsWhereInput = {
    status: 'pending',
    OR: [
      { request_type: 'expense' },
      { request_type: 'purchase', current_step: 3 },
    ],
  };

  const [
    pettyCashActive,
    pettyCashPending,
    pettyCashMonth,
    fund,
    approvalCount,
    approvalAmount,
    purchaseOrders,
    partRequests,
    assets,
    maintenance,
    recentPettyCash,
    recentApprovals,
    recentPurchaseOrders,
  ] = await Promise.all([
    prisma.tbl_petty_cash.aggregate({
      _count: { id: true },
      _sum: { requested_amount: true },
      where: { status: { in: ['pending', 'approved', 'dispensed', 'clearing'] } },
    }),
    prisma.tbl_petty_cash.count({ where: { status: 'pending' } }),
    prisma.tbl_petty_cash.aggregate({
      _sum: { actual_spent: true },
      where: { status: 'reconciled', reconciled_at: { gte: monthStart } },
    }),
    prisma.tbl_petty_cash_fund.findFirst({ where: { status: 'active' }, orderBy: { updated_at: 'desc' } }),
    prisma.tbl_approval_requests.count({ where: accountingApprovalWhere }),
    prisma.tbl_approval_requests.aggregate({
      _sum: { amount: true },
      where: accountingApprovalWhere,
    }),
    prisma.tbl_purchase_orders.aggregate({
      _count: { po_id: true },
      _sum: { total_amount: true },
      where: { status: { in: ['pending', 'approved', 'ordered', 'partial'] } },
    }),
    prisma.tbl_part_requests.aggregate({
      _count: { request_id: true },
      _sum: { estimated_price: true },
      where: { status: 'pending', current_stage: 1 },
    }),
    prisma.tbl_assets.aggregate({
      _count: { asset_id: true },
      _sum: { purchase_price: true },
      where: { status: 'Active', purchase_date: { gte: yearStart } },
    }),
    prisma.tbl_maintenance_requests.aggregate({
      _count: { request_id: true },
      _sum: { actual_cost: true },
      where: { status: 'completed', completed_at: { gte: monthStart } },
    }),
    prisma.tbl_petty_cash.findMany({
      where: { status: { in: ['pending', 'approved', 'dispensed', 'clearing'] } },
      orderBy: { updated_at: 'desc' },
      take: 5,
      select: { id: true, request_number: true, purpose: true, requested_by: true, requested_amount: true, status: true, updated_at: true },
    }),
    prisma.tbl_approval_requests.findMany({
      where: accountingApprovalWhere,
      include: { tbl_users: { select: { username: true } } },
      orderBy: { updated_at: 'desc' },
      take: 5,
    }),
    prisma.tbl_purchase_orders.findMany({
      where: { status: { in: ['pending', 'approved', 'ordered', 'partial'] } },
      orderBy: { updated_at: 'desc' },
      take: 5,
      select: { po_id: true, po_number: true, created_by: true, total_amount: true, status: true, updated_at: true },
    }),
  ]);

  const quickLinks = ACCOUNTING_DASHBOARD_QUICK_LINKS
    .map((item) => ({ ...item, icon: accountingQuickLinkIcons[item.iconKey] }))
    .filter((item) => canAccessDashboardPage(role, permissions, item.href, { isApprover }));

  const heroStatValues: Record<AccountingDashboardHeroStatKey, number> = {
    pettyCashPending,
    approvalQueue: approvalCount,
    openPurchaseOrders: purchaseOrders._count.po_id || 0,
    partRequestQueue: partRequests._count.request_id || 0,
  };

  const fundBalance = num(fund?.current_balance);
  const fundLimit = num(fund?.max_limit);
  const fundPercent = fundLimit > 0 ? Math.min((fundBalance / fundLimit) * 100, 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-emerald-100 ring-1 ring-white/10">
              {ACCOUNTING_DASHBOARD_COPY.heroEyebrow}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {ACCOUNTING_DASHBOARD_COPY.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {ACCOUNTING_DASHBOARD_COPY.heroDescription}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
            {ACCOUNTING_DASHBOARD_HERO_STATS.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-300">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{count(heroStatValues[item.key])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={ACCOUNTING_DASHBOARD_COPY.statCards.pettyCashActive.title}
          value={money(num(pettyCashActive._sum.requested_amount))}
          note={`${count(pettyCashActive._count.id || 0)} ${ACCOUNTING_DASHBOARD_COPY.statCards.pettyCashActive.noteSuffix}`}
          icon={accountingMetricCardIcons[ACCOUNTING_DASHBOARD_COPY.statCards.pettyCashActive.iconKey]}
          tone={ACCOUNTING_DASHBOARD_COPY.statCards.pettyCashActive.tone}
        />
        <StatCard
          title={ACCOUNTING_DASHBOARD_COPY.statCards.approvals.title}
          value={money(num(approvalAmount._sum?.amount))}
          note={`${count(approvalCount)} ${ACCOUNTING_DASHBOARD_COPY.statCards.approvals.noteSuffix}`}
          icon={accountingMetricCardIcons[ACCOUNTING_DASHBOARD_COPY.statCards.approvals.iconKey]}
          tone={ACCOUNTING_DASHBOARD_COPY.statCards.approvals.tone}
        />
        <StatCard
          title={ACCOUNTING_DASHBOARD_COPY.statCards.purchaseOrders.title}
          value={money(num(purchaseOrders._sum.total_amount))}
          note={`${count(purchaseOrders._count.po_id || 0)} ${ACCOUNTING_DASHBOARD_COPY.statCards.purchaseOrders.noteSuffix}`}
          icon={accountingMetricCardIcons[ACCOUNTING_DASHBOARD_COPY.statCards.purchaseOrders.iconKey]}
          tone={ACCOUNTING_DASHBOARD_COPY.statCards.purchaseOrders.tone}
        />
        <StatCard
          title={ACCOUNTING_DASHBOARD_COPY.statCards.assets.title}
          value={money(num(assets._sum.purchase_price))}
          note={`${count(assets._count.asset_id || 0)} ${ACCOUNTING_DASHBOARD_COPY.statCards.assets.noteSuffix}`}
          icon={accountingMetricCardIcons[ACCOUNTING_DASHBOARD_COPY.statCards.assets.iconKey]}
          tone={ACCOUNTING_DASHBOARD_COPY.statCards.assets.tone}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Section title={ACCOUNTING_DASHBOARD_COPY.financeSection.title} subtitle={ACCOUNTING_DASHBOARD_COPY.financeSection.subtitle}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 lg:col-span-2">
              <p className="text-sm font-medium text-slate-500">{ACCOUNTING_DASHBOARD_COPY.financeSection.fundTitle}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{money(fundBalance)}</p>
              <p className="mt-2 text-sm text-slate-500">{ACCOUNTING_DASHBOARD_COPY.financeSection.fundLimitPrefix} {money(fundLimit)}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${fundPercent}%` }} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-500">{ACCOUNTING_DASHBOARD_COPY.financeSection.pettyCashMonthTitle}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{money(num(pettyCashMonth._sum.actual_spent))}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-500">{ACCOUNTING_DASHBOARD_COPY.financeSection.maintenanceMonthTitle}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{money(num(maintenance._sum.actual_cost))}</p>
                <p className="mt-1 text-sm text-slate-500">{count(maintenance._count.request_id || 0)} {ACCOUNTING_DASHBOARD_COPY.financeSection.maintenanceMonthNoteSuffix}</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title={ACCOUNTING_DASHBOARD_COPY.quickLinksSection.title} subtitle={ACCOUNTING_DASHBOARD_COPY.quickLinksSection.subtitle}>
          <div className="grid grid-cols-1 gap-3">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-200/70">{item.icon}</div>
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-600" />
              </Link>
            ))}
            {quickLinks.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{ACCOUNTING_DASHBOARD_COPY.quickLinksSection.empty}</div>}
          </div>
        </Section>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Section title={ACCOUNTING_DASHBOARD_COPY.recentSections.pettyCashTitle} subtitle={ACCOUNTING_DASHBOARD_COPY.recentSections.pettyCashSubtitle}>
          <div className="space-y-3">
            {recentPettyCash.map((item) => {
              const status = getAccountingPettyCashStatusMeta(item.status);
              return (
                <Link
                  key={item.id}
                  href="/petty-cash"
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            {ACCOUNTING_DASHBOARD_COPY.activityLabels.pettyCash}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.request_number}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.purpose}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm shadow-slate-200/70 ring-1 ring-slate-200">
                        <p className="text-xs font-medium text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.amount}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{money(num(item.requested_amount))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.requester}</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900">{item.requested_by}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.updatedAt}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{date(item.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>

        <Section title={ACCOUNTING_DASHBOARD_COPY.recentSections.approvalsTitle} subtitle={ACCOUNTING_DASHBOARD_COPY.recentSections.approvalsSubtitle}>
          <div className="space-y-3">
            {recentApprovals.map((item) => {
              const type = getAccountingApprovalTypeMeta(item.request_type);
              return (
                <Link
                  key={item.request_id}
                  href="/approvals"
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-rose-200 hover:bg-rose-50/40"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${type.badgeClass}`}>
                            {type.label}
                          </span>
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                            รออนุมัติ
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.request_number}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm shadow-slate-200/70 ring-1 ring-slate-200">
                        <p className="text-xs font-medium text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.amount}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{money(num(item.amount))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.requester}</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900">
                          {item.tbl_users?.username || `User #${item.requested_by}`}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.createdAt}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{date(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {recentApprovals.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {ACCOUNTING_DASHBOARD_COPY.recentSections.approvalsEmpty}
              </div>
            )}
          </div>
        </Section>
        <Section title={ACCOUNTING_DASHBOARD_COPY.recentSections.purchaseOrdersTitle} subtitle={ACCOUNTING_DASHBOARD_COPY.recentSections.purchaseOrdersSubtitle}>
          <div className="space-y-3">
            {recentPurchaseOrders.map((item) => {
              const status = getAccountingPurchaseOrderStatusMeta(item.status);
              return (
                <Link
                  key={item.po_id}
                  href="/purchase-orders"
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                            {ACCOUNTING_DASHBOARD_COPY.activityLabels.purchaseOrder}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.po_number}</p>
                        <p className="mt-1 text-sm text-slate-600">{ACCOUNTING_DASHBOARD_COPY.activityLabels.creatorPrefix} {item.created_by || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm shadow-slate-200/70 ring-1 ring-slate-200">
                        <p className="text-xs font-medium text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.total}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{money(num(item.total_amount))}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{ACCOUNTING_DASHBOARD_COPY.activityLabels.updatedAt}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{date(item.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
            {recentPurchaseOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {ACCOUNTING_DASHBOARD_COPY.recentSections.purchaseOrdersEmpty}
              </div>
            )}
          </div>
        </Section>
      </section>
    </div>
  );
}
