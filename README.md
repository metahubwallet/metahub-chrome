# Metahub Wallet

A simple, multi-chain EOS web wallet browser extension.

Supports Chrome and Firefox, built on Manifest V3.

## Features

- **Multi-chain** — EOS, WAX, Telos, Proton, BOS, and several testnets
- **Secure key storage** — PBKDF2-SHA256 + AES-256-GCM; private keys are never held in plaintext
- **Token transfers** — send and receive any contract token
- **Resource management** — stake/unstake CPU/NET, PowerUp rental, RAM buy/sell
- **DApp integration** — page-injected API for identity and transaction signing
- **Smooth Mode** — CPU-free mode that lowers the barrier for new users
- **Backup & restore** — encrypted export/import
- **i18n** — English / 中文
- **Auto-lock** — configurable idle-timeout lock

## Getting started

### Requirements

- Node.js >= 18
- pnpm >= 10

### Install

```bash
pnpm install
```

### Development

```bash
# Chrome
pnpm dev

# Firefox
pnpm dev:firefox
```

Load the unpacked extension in your browser:

- **Chrome** — open `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select `.output/chrome-mv3`.
- **Firefox** — open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select `.output/firefox-mv2/manifest.json`.

### Build

```bash
# Production builds
pnpm build
pnpm build:firefox

# Zip for distribution
pnpm zip
pnpm zip:firefox
```

### Test & type-check

```bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # coverage report
pnpm compile           # TypeScript type check
```

## Usage

### First-time setup

1. Click the extension icon to open the wallet.
2. Set an unlock password (at least 6 characters).
3. Click "Get started".

### Import an account

1. Click the account name at the top to open the account switcher.
2. Select the target network (EOS, WAX, …).
3. Click "Import private key".
4. Paste a WIF private key — the wallet discovers associated accounts automatically.
5. Pick the account to import.

### Transfer

1. Tap a token on the home page to open the transfer form.
2. Enter the recipient, amount, and memo.
3. Confirm the details and enter your password to sign.

### Resource management

Open the **Resources** tab for the active account:

- **Stake** — stake CPU/NET for yourself or another account
- **Unstake** — unstake (tokens become available after 3 days)
- **PowerUp** — rent CPU/NET on demand (valid for 24 hours)
- **RAM** — buy or sell RAM

### DApp integration

DApps can talk to the wallet via the injected API:

```javascript
const identity = await metahub.login();
const result   = await metahub.requestSignature(transaction);
await metahub.logout();
```

Signature requests open an approval window where the user inspects the transaction and approves or rejects it. Frequently-used actions can be whitelisted for automatic approval.

### Backup & restore

**Export**

1. Settings → Export wallet
2. Enter your wallet password.
3. Set a backup encryption password (≥ 8 chars, letters and digits).
4. Download the `.backup` file and store it safely.

**Import**

1. On the password-setup screen, click "Import backup".
2. Select the backup file.
3. Enter the backup encryption password.
4. Set a new wallet password.

### Security tips

- Keep your private key safe — the wallet never uploads it.
- Use a strong unlock password.
- Export a backup periodically.
- Inspect every DApp transaction carefully before approving.
- Don't use the wallet on untrusted devices.

## Tech stack

- React 19 + TypeScript 5.9
- WXT 0.20 (Web Extension Toolkit, Manifest V3)
- Tailwind CSS 4
- Zustand 5 (state)
- @wharfkit/antelope 1.1 (EOS SDK)
- Vitest 4 (testing)

## Project layout

```
src/
├── entrypoints/     # Extension entry points (background, content, injected, popup, auth, transaction)
├── components/      # Shared React components (ui/ primitives + domain widgets)
├── hooks/           # React hooks
├── stores/          # Zustand stores
├── lib/             # Core libs — chain, keyring, handlers, api, messages, schemas
├── utils/           # Utilities (crypto, cache, network, …)
├── types/           # Shared TypeScript types
├── i18n/            # Translations (en, zh-CN)
├── assets/          # Static assets bundled with the code
└── test-setup.ts    # Vitest global setup
public/              # Files copied verbatim into the build (icons, etc.)
```

WXT is configured with `srcDir: 'src'` so all source code lives under `src/`. Static assets stay in the root `public/` directory (WXT's default `publicDir`).


## License

GPL 3.0
