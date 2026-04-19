import { NextResponse } from "next/server";
import os from "os";
import net from "net";

// Return all local non-loopback IPv4 addresses from the server's network interfaces
function getLocalIPs(): { name: string; address: string; subnet: string }[] {
  const ifaces = os.networkInterfaces();
  const results: { name: string; address: string; subnet: string }[] = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs || []) {
      if (addr.family === "IPv4" && !addr.internal) {
        results.push({
          name,
          address: addr.address,
          subnet: addr.address.split(".").slice(0, 3).join("."),
        });
      }
    }
  }
  return results;
}

// Try to probe a list of candidate IPs for port 9100 (ESC/POS printer port)
function probeIP(ip: string, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(9100, ip, () => { socket.destroy(); resolve(true); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
  });
}

export async function GET() {
  const ips = getLocalIPs();

  // Probe common printer IPs (last octet: 1, 100-110, 200-210, 254) on detected subnets
  const printerCandidates: string[] = [];
  const commonOctets = [1, 100, 101, 102, 103, 104, 105, 110, 200, 201, 202, 210, 254];

  for (const { subnet } of ips) {
    for (const octet of commonOctets) {
      printerCandidates.push(`${subnet}.${octet}`);
    }
  }

  // Remove duplicates
  const unique = [...new Set(printerCandidates)];

  // Probe all candidates in parallel (fast, 800ms timeout each)
  const results = await Promise.all(
    unique.map(async (ip) => ({ ip, found: await probeIP(ip) }))
  );

  const foundPrinters = results.filter((r) => r.found).map((r) => r.ip);

  return NextResponse.json({
    serverIPs: ips,
    detectedPrinters: foundPrinters,
    primaryIP: ips[0]?.address ?? null,
    primarySubnet: ips[0]?.subnet ?? null,
  });
}
