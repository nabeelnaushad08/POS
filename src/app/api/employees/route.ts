import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search") || "";
    const status   = searchParams.get("status");
    const position = searchParams.get("position");
    const page     = parseInt(searchParams.get("page") || "1");
    const limit    = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (status !== null && status !== "") where.isActive = status === "true";
    if (position) where.position = position;
    if (search) where.OR = [
      { fullName: { contains: search } },
      { employeeId: { contains: search } },
      { contactNumber: { contains: search } },
      { email: { contains: search } },
    ];

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page-1)*limit, take: limit }),
      prisma.employee.count({ where }),
    ]);
    return NextResponse.json({ data: employees, total, page, limit });
  } catch (err) {
    console.error("[employees GET]", err);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();

    // Auto-generate employee ID
    const count = await prisma.employee.count();
    const employeeId = `EMP-${String(count + 1).padStart(4, "0")}`;

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        fullName:        body.fullName,
        nicNumber:       body.nicNumber       || null,
        dateOfBirth:     body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender:          body.gender          || null,
        contactNumber:   body.contactNumber   || null,
        email:           body.email           || null,
        address:         body.address         || null,
        emergencyContact:body.emergencyContact|| null,
        dateJoined:      body.dateJoined ? new Date(body.dateJoined) : new Date(),
        position:        body.position        || "Cashier",
        department:      body.department      || null,
        basicSalary:     body.basicSalary     || 0,
        employmentType:  body.employmentType  || "FULL_TIME",
        photo:           body.photo           || null,
        notes:           body.notes           || null,
      },
    });
    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (err) {
    console.error("[employees POST]", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
