# Manual n8n Credential Setup Guide

This public package does not include any real credential JSON files, OAuth tokens, or plaintext secret values.

If you already received the private add-on package, first copy the five credential `*.json` files from that package into `MetaAgents/n8n/credentials`, and then run `MetaAgents/scripts/import-n8n-assets.ps1`.

If you do not have the private add-on package, create the five credentials manually by following the instructions below.

## Before You Start

- Try to create the credentials using exactly the names listed below.
- Create the credentials first, then import `MetaAgents/n8n/imports/v1.json` and `MetaAgents/n8n/imports/gmail.json`.
- If the workflows still show missing credentials after import, manually re-bind the matching credential inside the affected workflow nodes.

## 1. `WhatsApp OAuth account`

- Credential type: `WhatsApp Trigger API`
- Required fields:
  - `clientId`
  - `clientSecret`
- Value source:
  - The same Meta for Developers app that is used for the current WhatsApp webhook
- Consistency requirements:
  - `clientId` and `clientSecret` must come from the same Meta app
  - That Meta app must be the one you actually plan to use for receiving inbound WhatsApp webhooks

## 2. `WhatsApp account`

- Credential type: `WhatsApp API`
- Required fields:
  - `accessToken`
  - `businessAccountId`
- Value source:
  - The Meta WhatsApp Cloud API or the related Business configuration pages
- Consistency requirements:
  - `accessToken` must be valid for the current business phone number and Business Account
  - `businessAccountId` must match the actual business account used for sending messages

## 3. `Gmail account`

- Credential type: `Gmail OAuth2`
- Required fields:
  - `clientId`
  - `clientSecret`
- Creation steps:
  1. Create a new `Gmail OAuth2` credential in n8n
  2. Copy the OAuth Redirect URL shown by n8n
  3. Open Google Cloud Console, create or choose a project, and enable the Gmail API
  4. Create an OAuth client and add the Redirect URL from the previous step to the Authorized redirect URIs list
  5. Copy the generated `clientId` and `clientSecret` from Google Cloud back into n8n
  6. Complete authorization using the Gmail account that will actually be monitored by the `gmail` workflow
- Consistency requirements:
  - The Gmail account used for authorization must be the same inbox that the `gmail` workflow is supposed to monitor

## 4. `Postgres account`

- Credential type: `Postgres`
- Fixed connection parameters:
  - `host=host.docker.internal`
  - `port=5432`
  - `ssl=disabled`
- Fields that must match `MetaAgents/.env`:
  - `database`
  - `user`
  - `password`
- Recommended approach:
  - Make the `database`, `user`, and `password` here exactly match `FORM_FILLER_POSTGRES_DATABASE`, `FORM_FILLER_POSTGRES_USER`, and `FORM_FILLER_POSTGRES_PASSWORD` in `MetaAgents/.env`

## 5. `Ollama account`

- Credential type: `Ollama`
- Required fields:
  - `baseUrl`
  - Some n8n versions may also show `apiKey`
- Recommended values:
  - `baseUrl=http://host.docker.internal:11434`
  - If the page forces you to fill in `apiKey`, any non-empty placeholder string is acceptable, for example `local-ollama`
- Consistency requirements:
  - `MetaAgents/scripts/pull-ollama-models.ps1` must already have completed successfully
  - The n8n container must be able to reach Ollama through `host.docker.internal:11434`

## Final Checks After Binding

- Open `v1` and confirm that all WhatsApp, Ollama, and Postgres related nodes are bound to the correct credentials
- Open `gmail` and confirm that all Gmail, Postgres, and Ollama related nodes are bound to the correct credentials
- If you later receive the private add-on package and no longer want to create credentials manually, you can still copy the private credential JSON files into `MetaAgents/n8n/credentials` and re-run `MetaAgents/scripts/import-n8n-assets.ps1`
