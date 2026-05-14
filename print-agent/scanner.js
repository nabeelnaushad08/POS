const os = require("os");
const { probePort } = require("./printer");

function getLocalSubnets() {
  const ifaces = os.networkInterfaces();
  const subnets = [];

  for (const [ifaceName, addrs] of Object.entries(ifaces || {})) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        const parts = addr.address.split(".");
        if (parts.length === 4) {
          subnets.push({
            subnet: parts.slice(0, 3).join("."),
            ip: addr.address,
            iface: ifaceName,
          });
        }
      }
    }
  }
  return subnets;
}

// Scan common static IP octets first (printers are typically assigned static IPs)
const COMMON_OCTETS = [
  1, 2, 100, 101, 102, 103, 104, 105, 110, 120,
  150, 200, 201, 202, 203, 204, 205, 210, 250, 253, 254,
];

async function scanSubnet(subnet, port, probeTimeout, concurrency) {
  const octets = [...COMMON_OCTETS];
  // Fill remaining 3-254
  for (let i = 3; i <= 254; i++) {
    if (!COMMON_OCTETS.includes(i)) octets.push(i);
  }

  const found = [];
  for (let i = 0; i < octets.length; i += concurrency) {
    const batch = octets.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (o) => {
        const ip = `${subnet}.${o}`;
        const ok = await probePort(ip, port, probeTimeout);
        return ok ? ip : null;
      })
    );
    results.forEach((ip) => ip && found.push(ip));
    if (found.length >= 5) break; // stop early if we found enough
  }
  return found;
}

module.exports = { getLocalSubnets, scanSubnet, COMMON_OCTETS };
