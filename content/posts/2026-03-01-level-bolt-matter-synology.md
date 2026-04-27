{
  title: "Adding a Level Bolt to Home Assistant with Matter (and Claude)",
  date:  "2026-03-02",
  description: "How I finally got python-matter-server working on Synology after many failed attempts, and then connected my Level Bolt Thread lock to Home Assistant",
  type: "blog"
}

## If you just want Matter working on Synology

I spent a long time trying to get python-matter-server running on my Synology NAS. I tried multiple times over multiple months and kept hitting walls. Getting it running without errors was a genuine ordeal, and I've seen enough people struggling with the same thing online that it feels worth surfacing the working config up front before getting into my specific Level Bolt adventure.

**The short version: host networking doesn't work reliably on Synology. Use macvlan.**

Synology uses Open vSwitch internally, which means your active network interface is something like `ovs_eth2` rather than a standard `eth0`. This is especially common if you're using the official Synology 10G expansion card -- the built-in ethernet ports (`eth0`, `eth1`) end up down with no carrier while your actual traffic runs through the OVS interface. The CHIP/Matter C++ stack that python-matter-server is built on does its own interface detection independently of what you pass via `--primary-interface`, and it will find and bind to the wrong interface (`eth0`, which is down with no IPv6). No amount of flags or environment variables reliably fixes this. The solution is to give the container its own macvlan interface so the wrong interfaces simply don't exist inside the container.

**Step 1: Find your active interface and IPv6 subnet.**

SSH into your Synology and run:

```bash
ip link show
ip -6 addr show
```

Look for the interface that is `state UP` with `LOWER_UP`. On my NAS it's `ovs_eth2`. Note its IPv6 prefix (the `fd...` address in the `inet6` output, not the `fe80::` link-local one).

**Step 2: Create the macvlan network.**

Replace the subnet, gateway, and IPv6 subnet with your actual values. The IPv6 subnet should match the prefix you found in step 1.

```bash
docker network create -d macvlan \
  --subnet=192.168.50.0/24 \
  --gateway=192.168.50.1 \
  --ipv6 \
  --subnet=YOUR_IPV6_PREFIX/64 \
  --gateway=YOUR_IPV6_GATEWAY \
  -o parent=ovs_eth2 \
  matter-macvlan
```

**Step 3: Create a macvlan shim on the host.**

This is necessary because the Synology host itself cannot talk to macvlan containers by default. If Home Assistant is also running on the same NAS, it needs this to reach the matter-server. Pick an unused IP on your subnet for the shim (I used `.102`).

```bash
ip link add macvlan-shim link ovs_eth2 type macvlan mode bridge
ip addr add 192.168.50.102/32 dev macvlan-shim
ip link set macvlan-shim up
ip route add 192.168.50.101/32 dev macvlan-shim
```

Add this to a boot-up script in Synology Task Scheduler so it runs on every restart.

**Step 4: Run the container.**

Note `--primary-interface eth0` here. Inside a macvlan container the interface is always named `eth0` regardless of what it's called on the host.

```bash
docker run -d \
  --name matter-server \
  --network matter-macvlan \
  --ip 192.168.50.101 \
  --cap-add NET_ADMIN \
  --restart unless-stopped \
  -v /volume1/docker/matter-server:/data \
  ghcr.io/matter-js/python-matter-server:stable \
  --primary-interface eth0 \
  --storage-path /data
```

**Step 5: Connect Home Assistant.**

In Home Assistant go to Settings > Devices & Services > Add Integration > Matter. Enter the WebSocket URL as `ws://192.168.50.101:5580/ws`.

That should be enough to get a working Matter Server connected to Home Assistant on Synology. The rest of this post is about what I had to do on top of this to get my specific Thread lock working.

## What I was actually trying to do

I have a [Level Bolt](https://level.co/products/bolt) smart lock that I'd been using with Google Home for a while. I also run [Home Assistant](https://www.home-assistant.io/) on my Synology NAS. Matter theoretically lets you add a device to multiple ecosystems simultaneously. So after finally getting the matter-server running, I figured I'd try adding the Level Bolt to Home Assistant too.

The setup:

- Synology NAS running Home Assistant in a Docker container
- Level Bolt (a Thread-based Matter lock, already paired to Google Home)
- Google TV Streamer (the 2024 puck) acting as my Thread Border Router

I leaned heavily on [Claude](https://claude.ai) across two sessions to debug this.

## How Matter multi-admin commissioning works

Since the Level Bolt was already paired to Google Home, I didn't need to factory reset it. Matter supports adding a device to multiple ecosystems ("fabrics") at the same time. The flow via Google Home is:

1. Open the Level Bolt in Google Home
2. Tap Info > Linked Matter apps & services > Link apps & services
3. Select Home Assistant
4. Google Home hands off directly to the HA app, which triggers commissioning

No QR code scanning, no BLE required since the device is already on the Thread network. In theory.

One tip that made this reliable: before starting the Google Home linking flow, open the Level app and interact with the lock first. Thread locks spend most of their time in low-power sleep mode, and even when the lock is working fine for normal lock/unlock commands, opening a commissioning window requires it to be more fully awake. Triggering an action in the Level app right before starting the Google Home flow consistently got it into a receptive state.

In practice, every attempt ended with `Discovery timed out` and `PASESession timed out` in the logs. The matter-server was starting the commissioning attempt but couldn't reach the lock.

At this point Claude suggested the Google TV Streamer might not be exposing Thread routing to the LAN and recommended getting an ESP32-H2 or HomePod mini as an open Thread border router. I was about to order an ESP32. I decided to dig deeper first.

## The actual problem: wrong IPv6 subnet and missing routes

Running `avahi-browse -a | grep -i matter` on the host showed Matter devices advertising on the network, including a `_matterc._udp` record for the Level Bolt with a resolvable IPv6 address. The Google TV Streamer was exposing the device fine. Network visibility wasn't the problem.

The actual problem was that the macvlan network had been created with `--subnet=fd00::/64` as its IPv6 range. The actual IPv6 prefix on my network is `fd78:1338:9397:220a::/64`. The container was on the completely wrong IPv6 subnet. After recreating the macvlan with the correct prefix (per step 2 in the quick start above), the container could see mDNS records.

But commissioning still failed. The Level Bolt's Thread address lives on a different prefix (`fda3:ad95:99f:1::`) from the LAN. The Google TV Streamer should be advertising a route to that Thread mesh prefix via Router Advertisement so other devices on the LAN can reach Thread devices, but it wasn't. This appears to be a known limitation of Google's Border Router implementation.

To confirm this, running `ip -6 route | grep fda3` on the host returned nothing. But after manually adding a route via the Streamer's link-local address, `ping6` to the lock's IPv6 address worked.

The host needed this route added manually:

```bash
# Find your border router's link-local address first
ip -6 neigh | grep -v FAILED
# Look for entries marked "router"

sudo ip -6 route add YOUR_THREAD_PREFIX/48 via YOUR_BORDER_ROUTER_LINK_LOCAL dev ovs_eth2
```

Add this to your Task Scheduler boot script to make it persistent.

The container also needed the same route, which requires `--cap-add NET_ADMIN` on the container (already included in the docker run command above).

## One more gotcha: IPv6 autoconfiguration

With the routes in place, the host could ping the lock but the container still couldn't. The macvlan interface was auto-configuring a second IPv6 address, and the container was using that auto-configured address as the source for outbound packets. The Google TV Streamer's Border Router silently dropped traffic from that address and only accepted the static one.

The fix is to disable IPv6 autoconfiguration inside the container. Rather than a plain `docker run`, I switched to Docker Compose with an entrypoint script that handles this on every start.

`docker-compose.yml`:

```yaml
services:
  matter-server:
    image: ghcr.io/matter-js/python-matter-server:stable
    container_name: matter-server
    restart: unless-stopped
    sysctls:
      - net.ipv6.conf.all.accept_ra=0
      - net.ipv6.conf.eth0.accept_ra=0
      - net.ipv6.conf.all.autoconf=0
      - net.ipv6.conf.eth0.autoconf=0
    networks:
      matter-macvlan:
        ipv4_address: 192.168.50.101
    cap_add:
      - NET_ADMIN
    volumes:
      - /volume1/docker/matter-server:/data
      - ./entrypoint.sh:/entrypoint.sh
    entrypoint: ["/bin/sh", "/entrypoint.sh"]
    command:
      - --primary-interface
      - eth0
      - --storage-path
      - /data

networks:
  matter-macvlan:
    external: true
    name: matter-macvlan
```

`entrypoint.sh`:

```sh
#!/bin/sh

# Note: IPv6 autoconfiguration is disabled via the sysctls block in compose.
# The sysctl binary is not available in recent versions of this image, so
# we handle it at the compose level instead.

# Add IPv6 route to Thread network via Border Router.
# Replace with your Thread prefix and border router link-local address.
# If this breaks after a network change, find the new values with:
#   avahi-browse -r _matter._tcp | grep -A 5 "0000000000000007"  (lock's IPv6)
#   ip -6 neigh show dev ovs_eth2 | grep router                  (border router)
ip -6 route add YOUR_THREAD_PREFIX/48 via YOUR_BORDER_ROUTER_LINK_LOCAL dev eth0 || true

# Start matter-server
exec matter-server "$@"
```

After that, `ping6` from inside the container worked and commissioning succeeded.

## What can break after a network change

A few months after initial setup I found the lock had stopped responding in Home Assistant. The matter-server container was running fine but couldn't establish a CASE session with the lock. Here's what I learned debugging it.

**The Thread mesh prefix can change silently.** The Google TV Streamer generates a Thread mesh-local prefix for the Thread network. This prefix can change after a firmware update or network reset -- with no notification. When it does, any hardcoded routes to the old prefix stop working.

The symptom is `CASESession timed out` errors in the matter-server logs despite mDNS discovery succeeding. The lock is visible but unreachable.

To find the lock's current Thread prefix and address:

```bash
avahi-browse -r _matter._tcp | grep -A 5 "0000000000000007"
```

This resolves the mDNS record and shows the actual IPv6 address the lock is advertising. The `/48` prefix of that address is what you need for the routes. Update `YOUR_THREAD_PREFIX` in entrypoint.sh and your Task Scheduler boot script to match, then restart the container.

**`sysctl` may disappear from the image.** A Watchtower-triggered image update removed `sysctl` from the container, silently breaking the autoconfiguration fix. The `sysctl` lines in entrypoint.sh fail with "not found" but the script continues anyway (no `set -e`), so the server starts but IPv6 autoconf is never disabled. The fix is the `sysctls:` block in compose shown above, which applies the settings at the kernel level before the container starts and has no binary dependency.

**Make sure your compose IP matches your boot script.** The macvlan shim in the Task Scheduler boot script routes to a specific container IP. Make sure `ipv4_address` in compose matches the IP in `ip route add` in your boot script, or Home Assistant won't be able to reach the container.

## How did Claude help?

I used [Claude](https://claude.ai) as a debugging partner throughout. The workflow was: share log files and command output, get a diagnosis and suggested next steps, run the commands, share results, repeat. It was a lot faster than going it alone with GitHub issues and forum posts.

Things Claude got right: identifying that macvlan was the right solution for the OVS interface detection problem, the macvlan shim pattern for host-to-container communication, spotting the IPv6 subnet mismatch, and diagnosing the autoconfigured address issue.

Things Claude got wrong: it concluded too early that the Google TV Streamer couldn't expose Thread routing and recommended buying hardware that turned out to be unnecessary. It also initially created the macvlan with the wrong IPv6 subnet. And there was some early confusion about Google Home developer settings vs Android developer settings.

It's a decent illustration of what AI is actually useful for right now. Not replacing the expertise needed to understand what's happening, but compressing the feedback loop when you're debugging across several complex systems at once. The Level Bolt shows up in Home Assistant, commands go through, and it survives container restarts. It "just works"(tm) -- eventually.