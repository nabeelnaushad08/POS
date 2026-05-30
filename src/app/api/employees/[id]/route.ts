import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        attendance: { orderBy: { date: "desc" }, take: 30 },
        payroll:    { orderBy: { year: "desc" } },
        performanceNotes: { orderBy: { date: "desc" } },
      },
    });
    if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: employee });
  } catch (err) {
    console.error("[employee GET]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        fullName:        body.fullName,
        nicNumber:       body.nicNumber       ?? undefined,
        dateOfBirth:     body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        gender:          body.gender          ?? undefined,
        contactNumber:   body.contactNumber   ?? undefined,
        email:           body.email           ?? undefined,
        address:         body.address         ?? undefined,
        emergencyContact:body.emergencyContact?? undefined,
        position:        body.position        ?? undefined,
        department:      body.department      ?? undefined,
        basicSalary:     body.basicSalary     ?? undefined,
        employmentType:  body.employmentType  ?? undefined,
        photo:           body.photo           ?? undefined,
        isActive:        body.isActive        ?? undefined,
        notes:           body.notes           ?? undefined,
      },
    });
    return NextResponse.json({ data: employee });
  } catch (err) {
    console.error("[employee PATCH]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.employee.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[employee DELETE]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
