import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const records = await prisma.payroll.findMany({ where: { employeeId: id }, orderBy: [{ year: "desc" }, { month: "desc" }] });
  return NextResponse.json({ data: records });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const basicSalary    = parseFloat(String(body.basicSalary   ?? employee.basicSalary));
  const workingDays    = parseInt(body.workingDays  || "26");
  const presentDays    = parseInt(body.presentDays  || "26");
  const overtimeHours  = parseFloat(body.overtimeHours  || "0");
  const overtimeRate   = parseFloat(body.overtimeRate   || "0");
  const allowances     = parseFloat(body.allowances     || "0");
  const deductions     = parseFloat(body.deductions     || "0");
  const bonus          = parseFloat(body.bonus          || "0");
  const advance        = parseFloat(body.advance        || "0");
  const dailyRate      = workingDays > 0 ? basicSalary / workingDays : 0;
  const earnedSalary   = dailyRate * presentDays;
  const overtimePay    = overtimeHours * overtimeRate;
  const netSalary      = earnedSalary + overtimePay + allowances + bonus - deductions - advance;

  const payroll = await prisma.payroll.upsert({
    where: { employeeId_month_year: { employeeId: id, month: body.month, year: body.year } },
    create: { employeeId: id, month: body.month, year: body.year, basicSalary, workingDays, presentDays, overtimeHours, overtimeRate, allowances, deductions, bonus, advance, netSalary, status: body.status || "PENDING", paidAt: body.paidAt ? new Date(body.paidAt) : null, notes: body.notes },
    update: { basicSalary, workingDays, presentDays, overtimeHours, overtimeRate, allowances, deductions, bonus, advance, netSalary, status: body.status || undefined, paidAt: body.paidAt ? new Date(body.paidAt) : undefined, notes: body.notes },
  });
  return NextResponse.json({ data: payroll });
}
