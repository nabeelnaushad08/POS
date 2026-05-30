import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type  = searchParams.get("type") || "pl";
  const start = searchParams.get("start") ? new Date(searchParams.get("start")!) : new Date(new Date().getFullYear(), 0, 1);
  const end   = searchParams.get("end")   ? new Date(searchParams.get("end")!)   : new Date();
  end.setHours(23, 59, 59, 999);

  if (type === "pl") {
    const sales = await prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end } }, include: { items: true } });
    const revenue    = sales.reduce((s, x) => s + Number(x.total), 0);
    const discount   = sales.reduce((s, x) => s + Number(x.discount), 0);
    const cogs       = sales.reduce((s, x) => s + x.items.reduce((si, i) => si + Number(i.costPrice) * i.quantity, 0), 0);
    const grossProfit = revenue - cogs;
    const expenses   = await prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, include: { category: true } });
    const totalExp   = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const payroll    = await prisma.payroll.findMany();
    const totalPayroll = payroll.filter(p => { const d = new Date(p.year, p.month-1,1); return d>=start && d<=end; }).reduce((s,p)=>s+Number(p.netSalary),0);
    const netProfit  = grossProfit - totalExp - totalPayroll;
    const expByCategory: Record<string, number> = {};
    for (const e of expenses) { const k = e.category?.name || "Uncategorised"; expByCategory[k] = (expByCategory[k]||0) + Number(e.amount); }
    return NextResponse.json({ data: { type: "pl", period: { start: start.toISOString(), end: end.toISOString() }, revenue, discount, cogs, grossProfit, expenses: totalExp, payroll: totalPayroll, netProfit, expenseBreakdown: Object.entries(expByCategory).map(([name,amount]) => ({ name, amount })) } });
  }

  if (type === "expense") {
    const expenses = await prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, include: { category: true }, orderBy: { date: "desc" } });
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    for (const e of expenses) { const k = e.category?.name || "Uncategorised"; byCategory[k] = (byCategory[k]||0) + Number(e.amount); }
    return NextResponse.json({ data: { type: "expense", period: { start: start.toISOString(), end: end.toISOString() }, total, byCategory: Object.entries(byCategory).map(([name,amount]) => ({ name, amount })), items: expenses.map(e => ({ date: e.date, title: e.title, category: e.category?.name || "Uncategorised", amount: Number(e.amount), method: e.paymentMethod, reference: e.reference })) } });
  }

  if (type === "investment") {
    const investments = await prisma.investment.findMany({ orderBy: { date: "desc" } });
    const total = investments.reduce((s, i) => s + Number(i.amount), 0);
    return NextResponse.json({ data: { type: "investment", period: { start: start.toISOString(), end: end.toISOString() }, total, items: investments.map(i => ({ date: i.date, title: i.title, type: i.type, amount: Number(i.amount), description: i.description })) } });
  }

  if (type === "asset") {
    const assets = await prisma.asset.findMany({ orderBy: { purchaseDate: "desc" } });
    const totalCost  = assets.filter(a=>a.isActive).reduce((s,a)=>s+Number(a.purchaseCost),0);
    const totalValue = assets.filter(a=>a.isActive).reduce((s,a)=>s+Number(a.currentValue),0);
    return NextResponse.json({ data: { type: "asset", period: { start: start.toISOString(), end: end.toISOString() }, totalCost, totalValue, depreciation: totalCost - totalValue, items: assets.map(a => ({ name: a.name, type: a.type, purchaseDate: a.purchaseDate, purchaseCost: Number(a.purchaseCost), currentValue: Number(a.currentValue), notes: a.notes, isActive: a.isActive })) } });
  }

  if (type === "cashflow") {
    const sales = await prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "asc" } });
    const purchases = await prisma.purchase.findMany({ where: { createdAt: { gte: start, lte: end } }, orderBy: { createdAt: "asc" } });
    const expenses  = await prisma.expense.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "asc" } });
    const inflows   = sales.reduce((s, x) => s + Number(x.total), 0);
    const outPurch  = purchases.reduce((s, p) => s + Number(p.amountPaid), 0);
    const outExp    = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netFlow   = inflows - outPurch - outExp;
    return NextResponse.json({ data: { type: "cashflow", period: { start: start.toISOString(), end: end.toISOString() }, inflows, outflows: outPurch + outExp, purchaseOutflows: outPurch, expenseOutflows: outExp, netCashFlow: netFlow, transactions: [...sales.map(s => ({ date: s.createdAt, type: "IN", description: `Sale ${s.receiptNumber}`, amount: Number(s.total) })), ...expenses.map(e => ({ date: e.date, type: "OUT", description: e.title, amount: Number(e.amount) }))] .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) } });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
