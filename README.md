---
title: OpenClaw MAI Transcribe Plugin
description: MAI-Transcribe-1 speech-to-text plugin for OpenClaw using Azure Speech.
---

# OpenClaw MAI Transcribe Plugin

MAI-Transcribe-1 speech-to-text plugin for OpenClaw using Azure Speech.

## Overview

This plugin adds speech-to-text transcription to OpenClaw using Azure Speech MAI-Transcribe-1. It is designed for voice-message workflows where audio is uploaded, transcribed, and then passed back into the agent flow as text.

## Compatibility

This repository targets OpenClaw environments that can:

* Load local plugins from a filesystem path
* Provide audio files or audio references to plugin tooling
* Inject Azure Speech credentials into the runtime environment

Because audio acquisition varies by channel integration, validate the plugin with your actual media flow before production use.

## Features

* Speech-to-text tool for OpenClaw
* Azure Speech integration for MAI-Transcribe-1
* Multipart upload client for audio transcription
* Tests for transcription API behavior and error handling
* Documentation for supported formats and non-streaming constraints

## Prerequisites

* An OpenClaw instance that supports local plugin loading
* Access to an Azure Speech resource that supports MAI-Transcribe-1
* Audio inputs compatible with the plugin and Azure Speech limits

## Repository Layout

* `index.js`: plugin entry point
* `lib/api.js`: transcription API client
* `test/`: tests for successful transcription and error handling
* `openclaw.plugin.json`: plugin manifest and configuration schema

## Configuration

See [example-config.json](./example-config.json) for a minimal configuration example.

Supported plugin configuration keys:

* `region`: Azure Speech region
* `apiKey`: Azure Speech API key
* `model`: speech model name
* `apiVersion`: Azure Speech API version
* `maxFileSize`: maximum accepted audio size in bytes

## Authentication

The plugin is designed to resolve credentials at runtime instead of hardcoding secrets in the repository.

Typical runtime sources are:

* Plugin configuration values
* Host-provided secret injection
* Environment variables exposed to the OpenClaw process

For public usage, prefer environment or host-secret injection instead of storing keys directly in checked-in config files.

## Installation

The exact plugin-loading workflow depends on your OpenClaw host, but the minimum setup is:

1. Copy this repository into a directory that your OpenClaw runtime can read.
2. Add the plugin to your OpenClaw plugin configuration.
3. Configure the Azure Speech region and API key.
4. Restart OpenClaw so the plugin is loaded.

If your environment normalizes incoming audio before the plugin sees it, document that behavior locally. Different channels may deliver different formats or encodings.

## OpenClaw Configuration Example

```json
{
	"plugins": {
		"allow": ["mai-transcribe"],
		"entries": {
			"mai-transcribe": {
				"enabled": true,
				"config": {
					"region": "eastus",
					"apiKey": "<speech-api-key>",
					"model": "mai-transcribe-1",
					"apiVersion": "2025-10-15",
					"maxFileSize": 26214400
				}
			}
		},
		"load": {
			"paths": ["/absolute/path/to/openclaw-mai-transcribe-plugin"]
		}
	}
}
```

## Usage Notes

This plugin is intended for workflows where audio should become plain text before continuing through the agent pipeline. In practice:

* Keep files within the configured size limit
* Prefer supported audio formats for your Azure Speech setup
* Treat the plugin as batch transcription, not a streaming voice interface

## What This Repository Does Not Include

This public repository contains the plugin runtime, tests, and configuration examples. It does not include:

* Full Azure Speech deployment templates for the private production environment
* VM provisioning scripts
* Key Vault automation
* Channel-specific media acquisition code outside the plugin boundary

## Testing

Run the plugin tests with:

```bash
npm test
```

## Development

Useful local commands:

```bash
npm test
```

Key files to inspect when modifying behavior:

* `lib/api.js` for multipart transcription requests and response parsing
* `index.js` for tool registration and runtime configuration behavior
* `test/api.test.js` for success and failure cases

## Limitations

* This plugin is intentionally Azure-specific.
* The current implementation is aimed at batch transcription, not real-time streaming.
* Supported formats and limits still depend on Azure Speech behavior and your host environment.
* The public repository should document minimal Azure Speech setup, but it should not copy the full private deployment infrastructure.

## Status

This is the first public extraction of the plugin from a private deployment repository. Additional packaging cleanup and broader installation guidance can be added over time.


