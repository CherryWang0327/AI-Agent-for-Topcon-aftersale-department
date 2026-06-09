# Detailed Cloudflare and WhatsApp Setup Guide

This document only expands two parts of the setup:

1. `CF_TUNNEL_TOKEN` in `MetaAgents/.env`
2. `WhatsApp OAuth account` and `WhatsApp account` in n8n

If you only want the full project workflow, continue following `MetaAgents/README.md`.

You can refer to these tutorial video for configuration instructions.
- Cloudflare Tunnel: https://youtu.be/FBNo42bhozw?si=lA7hhECJKygYLwry
- WhatsApp credentials: https://youtu.be/DU2hwUsMBBM?si=k3FuH8O53sR_gmU9

## 1. Detailed Cloudflare Tunnel Setup

### 1.1 Prepare the Domain and Cloudflare Account First

Before starting, confirm these two points:

1. The domain you want to use is already managed in Cloudflare. 
2. The Cloudflare account you are logged into has permission to manage that domain

If you plan to keep using the default domain from the public package, the n8n main domain should remain `n8n.metagents6.xyz`.

If you want to switch to your own domain, that is also acceptable, but you must update both of the following:

- `DOMAIN` in `MetaAgents/.env`
- The public hostname configured for n8n in Cloudflare Tunnel

### 1.2 Create or Choose a Tunnel

Depending on the current Cloudflare interface, the Tunnel entry point is usually one of these:

1. `Networking > Tunnels`
2. `Zero Trust > Networks > Connectors > Cloudflare Tunnels`

Either path is acceptable as long as you can reach the Tunnel management page.

If you already have a Tunnel prepared for this project, open that Tunnel and continue.

If you do not already have one, create a new Tunnel:

1. Open the Tunnel page
2. Choose to create a Tunnel
3. Select the `cloudflared` type
4. Give the Tunnel an easy-to-recognize name, for example `MetaAgents`

### 1.3 Get the Tunnel Token and Fill It into `MetaAgents/.env`

Open the target Tunnel and look for the place where Cloudflare shows the run command or where you can add another connector.

The Cloudflare documentation currently recommends a token retrieval flow like this:

1. Open the target Tunnel
2. Choose `Add a connector`
3. Cloudflare will display a `cloudflared` installation or run command
4. Do not run that command directly here. Instead, copy only the long `eyJ...` token from it

Then open `MetaAgents/.env` and place it into:

```text
CF_TUNNEL_TOKEN=<YOUR_TUNNEL_TOKEN>
```

If you need to replace the token later, return to the same kind of page, copy the new token, and overwrite the old value in `MetaAgents/.env`.

### 1.4 Configure the Two Public Hostnames

This project requires at least two public mappings:

1. One for the n8n editor and webhooks
2. One for the `form-filler` report UI

In the Tunnel page, find the section for Public Hostnames or Published applications and add the following mappings.

#### n8n Mapping

If you keep the default domain:

- Public hostname: `n8n.metagents6.xyz`
- Service: `http://n8n:5678`

If you want to use your own domain:

- Public hostname: your own n8n domain
- Service: still `http://n8n:5678`

At the same time, update `DOMAIN` in `MetaAgents/.env` so it matches the same n8n domain.

#### Report UI Mapping

- Public hostname: `reports.metagents6.xyz`
- Service: `http://form-filler:8000`

If you want the report UI under your own domain instead, you may change the hostname to your own subdomain, but the service must still remain `http://form-filler:8000`.

### 1.5 Check the Result After Starting the Containers

After completing the token and hostname configuration above, continue with the Docker startup steps in `MetaAgents/README.md`.

Once the containers are running, focus on checking these two URLs:

1. `https://<DOMAIN>`
   This should open n8n
2. `https://reports.metagents6.xyz`
   If you kept the default mapping, this should open the report UI

If n8n does not open, troubleshoot in this order:

1. Check whether `CF_TUNNEL_TOKEN` in `MetaAgents/.env` is correct
2. Check whether `DOMAIN` in `MetaAgents/.env` matches the hostname configured in the Tunnel
3. Check whether the Tunnel service really points to `http://n8n:5678`
4. Check whether another machine is still running the same Tunnel at the same time
5. Restart the containers defined by `MetaAgents/docker-compose.yml`

### 1.6 The Most Common Cloudflare Mistakes

1. `CF_TUNNEL_TOKEN` is correct, but `DOMAIN` was not updated to match
2. The Tunnel points to the wrong service, for example a wrong container name instead of `n8n`
3. The same Tunnel token is being used on two machines at the same time
4. The original machine's `cloudflared` process was not stopped before testing on the new machine

## 2. Detailed WhatsApp Credential Setup

In this project, the WhatsApp-related settings are not stored in `MetaAgents/.env`. They are stored in two n8n credentials:

1. `WhatsApp OAuth account`
2. `WhatsApp account`

Their roles are:

- `WhatsApp OAuth account` is used by `WhatsApp Trigger`
- `WhatsApp account` is used by the WhatsApp send-message nodes

## 2.1 Prepare the Meta App First

Before continuing, confirm the following:

1. You already have a Meta developer account
2. You have already created an app in Meta for Developers
3. That app already has the WhatsApp product added

If you do not yet have an app, create one in this order:

1. Open Meta for Developers
2. Go to the Apps dashboard
3. Create a new app
4. On the product page, add the WhatsApp product to that app

Both n8n credentials described below must come from the same Meta app. Do not mix values from different apps.

## 2.2 Create `WhatsApp OAuth account`

This credential is used by the `WhatsApp Trigger` node in `v1`.

Create it in n8n using the following steps:

1. Open n8n
2. Go to Credentials
3. Create a new credential of type `WhatsApp Trigger API`
4. Name the credential `WhatsApp OAuth account`

Then retrieve the values from the Meta app:

1. Open the Meta for Developers Apps dashboard
2. Enter the current WhatsApp app
3. In the left menu, go to `App settings > Basic`
4. Copy `App ID`
5. Fill it into `clientId` in n8n
6. Copy `App Secret`
7. Fill it into `clientSecret` in n8n

Save the credential after filling both values.

## 2.3 Create `WhatsApp account`

This credential is used by the WhatsApp send-message nodes inside `v1`.

Create it in n8n using the following steps:

1. Go to Credentials
2. Create a new credential of type `WhatsApp API`
3. Name the credential `WhatsApp account`

Then retrieve the values from the Meta app:

1. Open the current Meta app
2. In the left menu, go to `WhatsApp > API Setup`
3. Choose `Generate access token`
4. Copy the generated Access Token into `accessToken` in n8n
5. On the same page, copy `WhatsApp Business Account ID`
6. Fill it into `businessAccountId` in n8n

Save the credential after filling both values.

## 2.4 Bind Both Credentials to `v1`

After creating both credentials, open the `v1` workflow and check:

1. The `WhatsApp Trigger` node uses `WhatsApp OAuth account`
2. All WhatsApp send-message nodes use `WhatsApp account`

If the workflow shows missing credentials after import, do not delete the nodes. Simply re-select the matching credential inside each affected node.

## 2.5 How to Confirm the WhatsApp Setup Works After Activating `v1`

After binding the credentials, manually activate `v1`.

Then use the phone number that matches the current WhatsApp Cloud API configuration and send one new message to the business number.

If all of the following happen, the WhatsApp configuration is basically correct:

1. `v1` is triggered
2. You can see `WhatsApp Trigger` in the n8n execution record
3. The database automatically creates the `n8n_info_record_<phone_number>` source table
4. The workflow successfully sends a reply message

## 2.6 If `WhatsApp Trigger` Does Not Receive Any Message

Check the following in order:

1. Confirm that `WhatsApp Trigger` is really bound to `WhatsApp OAuth account`
2. Confirm that `v1` is already activated
3. Confirm that the current App ID and App Secret come from the same Meta app
4. Confirm that the Access Token and Business Account ID in `WhatsApp account` also come from the same Meta app
5. Confirm that no other machine is simultaneously running the same workflow with the same WhatsApp configuration

## 2.7 About Test URLs and Production URLs

This project is intended to be used in the production-style path by default, meaning that once the workflow is activated, external messages should directly enter `v1`.

If you temporarily test the trigger configuration, keep this limitation in mind:

- Each WhatsApp app can register only one webhook

So do not keep switching back and forth between test URLs and production URLs and forget to restore the correct one. The safer approach is:

1. Stop the same workflow on any other machine first
2. Keep only one activated `v1`
3. Use the production path consistently for testing

## 2.8 Final Check

After both Cloudflare and WhatsApp are configured, return to `MetaAgents/README.md` and continue with:

1. Activating the workflows
2. Letting `v1` generate the first Excel file automatically
3. Testing the email round-trip through `gmail`

## References

- Cloudflare Tunnel token guide: [Tunnel tokens](https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/)
- Cloudflare Tunnel hostname routing guide: [Routing](https://developers.cloudflare.com/tunnel/routing/)
- n8n WhatsApp credential guide: [WhatsApp Business Cloud credentials](https://docs.n8n.io/integrations/builtin/credentials/whatsapp/)
- n8n WhatsApp Trigger guide: [WhatsApp Trigger node](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.whatsapptrigger/)
