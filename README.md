# HOMEBASE.ID (ODIN-JS)

##### Open Decentralized Identity Network

[![CI Build](https://github.com/homebase-id/odin-js/actions/workflows/ci.yml/badge.svg)](https://github.com/homebase-id/odin-js/actions/workflows/ci.yml)

---

This monorepo contains the various JavaScript apps and libraries maintained by Homebase. These resources are designed to empower app developers to seamlessly integrate with a Homebase Identity backend, enabling secure, decentralized, and user-centric identity solutions. By leveraging these tools, developers can build powerful applications that prioritize privacy, interoperability, and user control.

## Overview of Packages

### Apps

The following apps are built on the Homebase platform, showcasing its capabilities and providing ready-to-use functionality. Each app depends on **JS-Lib**, **UI-Lib**, and **Common-App** for shared logic and components:

- 🚀 **Feed App**: A personalized content feed.
- 🚀 **Chat App**: Secure messaging platform.
- 🚀 **Mail App**: Decentralized email client.
- 🚀 **Community App**: A platform for group collaboration and community building.
- 🚀 **Public App**: Public-facing interfaces.
- 🚀 **Owner App**: Administrative tools and dashboards.

Each app is designed as a stand-alone platform app and can be independently extracted from the monorepo.

### Libraries

- 📚 **JS-Lib**: Core JavaScript library for interacting with the Homebase Identity backend. Includes essential utilities and logic for building on the platform.
- ✨ **UI-Lib**: A reusable UI component library, enabling consistent design and interaction patterns across Homebase-based apps.
- 🛠 **Common-App**: A library of shared components and modules used by all platform apps. While tailored for Homebase's branded apps, this package is not designed for use outside of the Homebase ecosystem.

---

## Getting Started

### Installing Libraries

To use the libraries in your project, you can install them directly from GitHub Packages:

- [JS-Lib](https://github.com/homebase-id/odin-js/pkgs/npm/js-lib)
- [UI-Lib](https://github.com/homebase-id/odin-js/pkgs/npm/ui-lib)

#### Prerequisite: OdinClient

The libraries depend on a **OdinClient** instance, which manages authentication parameters for API requests. Ensure you configure the `OdinClient` correctly to interact with your Homebase Identity backend.

### Running the Apps Locally

Before starting the apps, ensure you have the backend server running. You can find it here: [HOMEBASE.ID (ODIN-CORE)](https://github.com/homebase-id/odin-core).

1. **Install dependencies and build libraries**:

```
npm install && npm run build:libs
```

2. **Run the apps**:

- Run all apps concurrently:

```
npm run start
```

- Or run a specific app:

```
npm run start:[feed/chat/mail/community/public/owner]
```

3. **Build the apps**:

```
npm run build
```

## Security Disclosures

If you discover any security issues, please send an email to [info@homebase.id](mailto:info@homebase.id). The email is automatically CCed to the entire team and we'll respond promptly.
