---
title: OpenClaw MAI Transcribe Plugin
description: MAI-Transcribe-1 speech-to-text plugin for OpenClaw using Azure Speech.
---

# OpenClaw MAI Transcribe Plugin

MAI-Transcribe-1 speech-to-text plugin for OpenClaw using Azure Speech.

## Overview

This plugin adds speech-to-text transcription to OpenClaw using Azure Speech MAI-Transcribe-1. It is designed for voice-message workflows where audio is uploaded, transcribed, and then passed back into the agent flow as text.

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

## Installation

The exact plugin-loading workflow depends on your OpenClaw host, but the minimum setup is:

1. Copy this repository into a directory that your OpenClaw runtime can read.
2. Add the plugin to your OpenClaw plugin configuration.
3. Configure the Azure Speech region and API key.
4. Restart OpenClaw so the plugin is loaded.

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

## Testing

Run the plugin tests with:

```bash
npm test
```

## Limitations

* This plugin is intentionally Azure-specific.
* The current implementation is aimed at batch transcription, not real-time streaming.
* Supported formats and limits still depend on Azure Speech behavior and your host environment.
* The public repository should document minimal Azure Speech setup, but it should not copy the full private deployment infrastructure.

## Status

This is the first public extraction of the plugin from a private deployment repository. Additional packaging cleanup and broader installation guidance can be added over time.


