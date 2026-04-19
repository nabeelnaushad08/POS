import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import net from "net";

function tcpProbe(ip: string, port: number, timeoutMs: number): Promise<"online" | "offline"> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(port, ip, () => {
      socket.destroy();
      resolve("online");
    });
    socket.on("error", () => { socket.destroy(); resolve("offline"); });
    socket.on("timeout", () => { socket.destroy(); resolve("offline"); });
  });
}

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findFirst().catch(() => null);
    const ip = settings?.printerIp;
    const enabled = settings?.printerEnabled ?? false;

    if (!enabled || !ip) {
      return NextResponse.json({ status: "disabled", ip: ip || null });
    }

    const status = await tcpProbe(ip, 9100, 2500);
    return NextResponse.json({ status, ip });
  } catch {
    return NextResponse.json({ status: "offline", ip: null });
  }
}
