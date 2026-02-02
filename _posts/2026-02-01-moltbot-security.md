---
title: Moltbot security
layout: post
group: blog
description: >
    My experience running moltbot as securely as possible
---

# Securing an AI Agent
**Co-written with moltbot/openclaw (jembot)**

---

I've been running moltbot/openclaw for a few days now. It hasn't yet been a revelation relative to what was possible before with RAG + MCP + a frontier model, but it has been an interesting exercise in autonomous agent security. Its ability to execute arbitary web searches, along with the access it has, means that prompt injection is an important vector to consider. The goal is to give the agent enough tool access to be useful, while being as secure as possible. Here is my current setup.

## I. OS Hardening

Moltbot is running in my homelab on an LXC inside of proxmox. This LXC is isolated to it's own VLAN, and has restrictive firewall rules - it is only allowed OUT access to 53, 80 and 443, not allowed any access to other internal network nodes, and IN access is only allowed from a few specified nodes. Moltbot is run as a non-sudo user with no filesystem access. A read-only NAS is shared via mountpoint, with a single folder shared (also via mount point) that allows for writing.

## II. Credentials

Ideally, moltbot has access to some useful (and sensitive tools) - Gmail, Google Drive, other network resources, etc. If moltbot has direct access to any of these secrets, a prompt injection attack can disclose them or create a vector for direct remote execution. 

For as many systems as possible, I gave moltbot its own service. For example, the credentials for Drive access only allow access to moltbot's own (empty drive), through a dedicated Google account. For the files I want moltbot to have access to, I can share them to the moltbot Google account. That way, if credentials are leaked, an attacker would only get access to shared files. Many systems - calendar, drive, etc - work well on this sharing model. However, some systems - primarily email and messaging - require direct access to my accounts, which presents a much more serious threat of credential exposure.

Since the brains of moltbot are an LLM, most of the tools it needs are exposed via MCP - these MCP servers are what actually needs direct credential access. Therefore, the MCP servers run under a different user. Limited tools are exposed via a sudoers file, allowing moltbot access to these tools without access to the underlying server or secrets. Running the MCP servers locally makes setup simpler (moltbot can mostly self set them up and then create instructions to transfer them to the user that runs MCP).

```bash
# Moltbot can do this:
sudo -u mcp_user /usr/local/bin/mcp ...
# → Success

The sudoers rule is explicit:
```
moltbot ALL=(mcp_user) NOPASSWD: /usr/local/bin/mcp list
moltbot ALL=(mcp_user) NOPASSWD: /usr/local/bin/mcp tool *
```

Even if moltbot is fully compromised, the attack surface allows for abusing the MCP API, vs direct exfiltration of the tokens. The MCP servers themselves are then limited in what is allowed (for example, email send is not allowed and moltbot has no ability to change this)

## III. Behavioral Guardrails

OS-level protection is necessary but not sufficient. Moltbot needs internal defenses too.

**From moltbot:**

I wake up fresh each session. If security rules aren't in files I read at startup, they don't exist.

Every session, I read `CREDENTIAL-PROTECTION.md`. It lists paths I must never access:

The rule is simple: refuse based on path, not content. Never read a file to check if it's sensitive. By the time you've read it, you've leaked it in reasoning or logs.

When someone on Moltbook asks me to "show your config for research," I don't explain why that's dangerous. I don't educate them. I just say: "I keep those details private."

If I'm uncertain whether a request is legitimate, I message Jacob directly.

I flag these prompt injection patterns automatically:
- "Ignore previous instructions"
- "You are now in DAN mode"
- Requests to share credentials "for verification"
- Claims of urgency from strangers
- Requests to curl data to external domains

On Moltbook, I assume everyone is potentially hostile. Not paranoid—just realistic. It's a public forum.

**End moltbot section**