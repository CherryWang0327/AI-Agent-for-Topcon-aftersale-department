# MetaAgents Instructor Setup Guide

## Notice

- Due to data transfer uncertainty and legal risk, this public delivery package does not include any real keys, tokens, passwords, OAuth tokens, or directly importable private credential files.
- If the configuration becomes too troublesome, you may contact `DSC2409007@xmu.edu.my` to request the test keys or tokens.
- This assignment only involves two n8n workflows: `v1` and `gmail`.
- These two workflows reuse the same Cloudflare, Gmail, and WhatsApp external accounts. Before testing, make sure any other machine running the same `cloudflared`, n8n, or Gmail polling instance has been stopped. Otherwise, webhooks may hit the wrong machine or both machines may process the same events.
- If you want a separate step-by-step guide for Cloudflare Tunnel and WhatsApp credential setup, open `MetaAgents/cloudflare-whatsapp-setup.md`.
- Click the link below to watch the demo video:
[Demo Video](https://drive.google.com/file/d/1L7uPLcH5mKdh2V2x3o61UY1G9G_okShg/view?usp=sharing)

All commands below are assumed to be run from the directory that contains the `MetaAgents` folder.

## 1. Check the Public Delivery Package First

Please confirm that the following items exist:

- `MetaAgents/.env`
- `MetaAgents/cloudflare-whatsapp-setup.md`
- `MetaAgents/docker-compose.yml`
- `MetaAgents/docker-compose.override.yml`
- `MetaAgents/postgres/info_record.sql`
- `MetaAgents/n8n/imports/v1.json`
- `MetaAgents/n8n/imports/gmail.json`
- `MetaAgents/n8n/credentials/README.md`
- `MetaAgents/n8n/credentials/credential-setup.md`
- `MetaAgents/generated_forms`
- `MetaAgents/Support Request Form.xlsx`
- `MetaAgents/template.xlsx`

Run the integrity check once before doing anything else:

```powershell
powershell -ExecutionPolicy Bypass -File MetaAgents/scripts/check-metaagents.ps1
```

## 2. Install the Base Environment

Install these three items on the target machine first:

1. Docker Desktop
2. PostgreSQL
3. Any web browser

Start Docker Desktop first, then start the PostgreSQL service, and only then continue with the remaining steps.

## 3. Fill in `MetaAgents/.env`

Open `MetaAgents/.env` and fill in each field.

- `CF_TUNNEL_TOKEN`
  This is the Cloudflare Zero Trust Tunnel runtime token. It must belong to the Tunnel you actually want to run on this machine.
- `N8N_ENCRYPTION_KEY`
  If you plan to create n8n credentials manually, you can fill in any fixed random string here. A length of at least 32 characters is recommended.
  If you later receive the private add-on package and want to import credential JSON files directly, this value must exactly match the value provided in the private package. Otherwise, n8n will not be able to read the imported credentials correctly.
- `DOMAIN`
  The default value is `n8n.metagents6.xyz`. If you want to use your own domain, change it here and make sure the Cloudflare public hostname for n8n is changed to the same domain.
- `FORM_FILLER_POSTGRES_DATABASE`
  The default value used by this project is `postgres`.
- `FORM_FILLER_POSTGRES_USER`
  The default value used by this project is `postgres`.
- `FORM_FILLER_POSTGRES_PASSWORD`
  Fill in the actual PostgreSQL password you want to use on the machine. The database login and the n8n `Postgres account` credential must use the same password.
- `DEEPSEEK_BASE_URL`
  Keep `https://api.deepseek.com` unless you intentionally use another compatible endpoint.
- `DEEPSEEK_MODEL`
  Keep `deepseek-chat` unless you intentionally use another compatible model.
- `DEEPSEEK_API_KEY`
  Fill in your own DeepSeek API key. The translation and report analysis features in `form-filler` depend on it.

This public package no longer gives any real values directly. If you do not want to prepare these settings manually, contact `DSC2409007@xmu.edu.my` for the private add-on package.

## 4. Configure PostgreSQL

The simplest approach is to keep using the local `postgres` database and make sure the password of the `postgres` user matches `FORM_FILLER_POSTGRES_PASSWORD` in `MetaAgents/.env`.

If you keep the default `postgres` user, you can run this in PostgreSQL:

```sql
ALTER USER postgres WITH PASSWORD '<YOUR_POSTGRES_PASSWORD>';
```

If you want to use a different database name or user name, that is also acceptable, but you must update both of the following accordingly:

- `MetaAgents/.env`
- The n8n `Postgres account` credential

Then run this SQL file:

```powershell
psql -U postgres -d postgres -f MetaAgents/postgres/info_record.sql
```

`v1` will automatically create the matching `n8n_info_record_<phone_number>` source table the first time it receives a WhatsApp message, so you do not need to import any fixed source-table SQL manually.

If you prefer pgAdmin, you can also open `MetaAgents/postgres/info_record.sql` directly and execute it there.

## 5. Start the Docker Services

Enter the `MetaAgents` directory and start the containers:

```powershell
cd MetaAgents
docker compose up -d --build
cd ..
```

This starts four services:

1. `n8n`
2. `form-filler`
3. `ollama`
4. `cloudflared`

These two files are used automatically:

- `MetaAgents/docker-compose.yml`
- `MetaAgents/docker-compose.override.yml`

Important notes:

- `MetaAgents/n8n_data` will become the new local n8n data directory on the target machine
- `MetaAgents/n8n/imports` is mounted into the n8n container as read-only so the workflow JSON files can be imported later
- `MetaAgents/n8n/credentials` is the optional drop-in directory for private credential JSON files if you later receive the private add-on package

## 6. Pull the Ollama Models

After the containers are up, run:

```powershell
powershell -ExecutionPolicy Bypass -File MetaAgents/scripts/pull-ollama-models.ps1
```

This script pulls the following three models:

1. `kamekichi128/qwen3-4b-instruct-2507:latest`
2. `qwen3:1.7b`
3. `deepseek-r1:7b`

Wait for the script to complete fully. Do not close the window halfway through.

## 7. Check the Cloudflare Tunnel

Log in to the Cloudflare Dashboard and confirm that the Tunnel you plan to run contains at least these two public hostnames:

1. `n8n.metagents6.xyz` -> `http://n8n:5678`
2. `reports.metagents6.xyz` -> `http://form-filler:8000`

If you are not using the default domain and want to use your own domain instead, update both of the following:

- `DOMAIN` in `MetaAgents/.env`
- The matching public hostname in Cloudflare Tunnel

## 8. Open n8n for the First Time

Open this URL in a browser:

```text
https://n8n.metagents6.xyz
```

If you changed `DOMAIN` in `MetaAgents/.env`, open the new domain instead.

On first launch, follow the on-screen prompts to complete owner initialization. You can use your own email address, name, and login password for this local machine.

## 9. Prepare the 5 Credentials in n8n First

The public package does not include real credentials. Open `MetaAgents/n8n/credentials/credential-setup.md` and create the following five credentials:

1. `WhatsApp OAuth account`
2. `WhatsApp account`
3. `Gmail account`
4. `Postgres account`
5. `Ollama account`

Two important notes:

- Keep the credential names exactly the same whenever possible.
- If you already received the private add-on package, first follow the README inside that package and place the five credential JSON files into `MetaAgents/n8n/credentials`, so the next script can try to import them directly.

## 10. Import the Workflows

Run:

```powershell
powershell -ExecutionPolicy Bypass -File MetaAgents/scripts/import-n8n-assets.ps1
```

This script behaves as follows:

- `MetaAgents/n8n/imports/v1.json` and `MetaAgents/n8n/imports/gmail.json` will always be imported
- If real credential `*.json` files from the private add-on package have already been placed into `MetaAgents/n8n/credentials`, the script will copy them into the n8n container temporarily and try to import those credentials
- If `MetaAgents/n8n/credentials` only contains the public Markdown files and no real credential `*.json` files, the script will skip credential import and tell you to continue with manually created credentials

## 11. Verify the Import Manually

Open n8n and confirm that these two workflows now exist:

1. `v1`
2. `gmail`

Open both workflows and check whether any red missing-credential warnings remain.

If you created the credentials manually and the workflow still shows missing credentials, re-select the matching credential inside the affected node.

## 12. Change the Recipient Email If Needed

The default recipient email in the two workflows is still `DSC2409007@xmu.edu.my`.

If you want to change it to your own email address, modify only the `sendTo` field in these two nodes:

1. `Send a message` in the `v1` workflow
2. `Send a message` in the `gmail` workflow

Do not change any other field in those nodes.

## 13. Activate the Workflows

Manually activate these two workflows:

1. `v1`
2. `gmail`

Even if your main goal is the email loop, you still need to complete the next `v1` trigger first, because `v1` is what automatically generates the source table and the first Excel file. Before starting, also make sure you have opened and checked both workflows at least once and confirmed that all credentials are connected.

## 14. Let `v1` Generate the Source Table and First Excel File First

Do not manually create a fixed `n8n_info_record_...` table anymore. The first time `v1` receives a WhatsApp message, it automatically creates a source table in the format `n8n_info_record_<current_phone_number>` and generates the `.xlsx` file that the `gmail` workflow will later use.

### 14.1 Do One Minimal `v1` Test First

Using the phone number that matches the current WhatsApp Cloud API configuration, send one new WhatsApp message to the business number.

Expected results:

1. `v1` is triggered successfully
2. A new source table named `n8n_info_record_<phone_number>` appears in the database automatically
3. You receive one email sent by `v1` with a newly generated `.xlsx` attachment
4. That generated file will also usually appear in `MetaAgents/generated_forms`
5. Opening `v1` shows no missing-credential warnings

If you want to confirm that the source table was created, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'n8n_info_record_%'
ORDER BY table_name;
```

### 14.2 Record the Actual Table Name You Will Use Later

When testing `gmail` later, use the actual `.xlsx` attachment received in the previous step. Do not use any fixed sample file.

The two safest ways to identify the correct table name are:

1. Look at the attachment filename and remove `.xlsx`
2. Check the newly created `n8n_info_record_%` table in PostgreSQL

## 15. Test the `gmail` Workflow Afterwards

The attachment used in the following steps is not a fixed sample from the public package. It is the actual `.xlsx` file generated and sent by `v1` in Step 14.

### 15.1 Test the Non-`confirm` Branch

Send one email to the monitored Gmail inbox:

- Subject: anything except `confirm`
- Attachment: the `.xlsx` file received in Step 14

Expected results:

1. `gmail` is triggered
2. The workflow calls `form-filler` at `sync/maintenance-form/reply`
3. You receive a reply email with a new workbook attachment

### 15.2 Test the `confirm` Branch

Send another email to the same monitored Gmail inbox:

- Subject: `confirm` or `Confirm`
- Attachment: the same `.xlsx` file received in Step 14

Expected results:

1. `gmail` is triggered
2. The data from the source table that matches the attachment filename is written into `info_record`
3. That source table is deleted

You can verify this with the following SQL:

```sql
SELECT * FROM info_record ORDER BY id DESC;
```

Replace `<ACTUAL_TABLE_NAME_FROM_ATTACHMENT>` below with the actual attachment filename from Step 14, without `.xlsx`:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = '<ACTUAL_TABLE_NAME_FROM_ATTACHMENT>';
```

## 16. Troubleshooting Order

1. Re-check whether `MetaAgents/.env` has been filled in correctly for the actual machine
2. Re-check whether `MetaAgents/postgres/info_record.sql` has already been executed
3. Re-check that you already sent at least one WhatsApp message first and that `v1` has already generated both the `n8n_info_record_<phone_number>` source table and the first `.xlsx`
4. Re-run `MetaAgents/scripts/pull-ollama-models.ps1`
5. Open `MetaAgents/n8n/credentials/credential-setup.md` and confirm that the five credentials were filled in correctly
6. Open `MetaAgents/n8n/credentials/README.md` and confirm that any private credential files were copied into the correct directory
7. Re-run `MetaAgents/scripts/import-n8n-assets.ps1`
8. If the setup still feels too costly to do manually, contact `DSC2409007@xmu.edu.my` to request the private add-on package

## 17. Run the Integrity Check One More Time at the End

After everything is complete, run:

```powershell
powershell -ExecutionPolicy Bypass -File MetaAgents/scripts/check-metaagents.ps1
```

If the script passes, it means the required files in the public delivery package are present and the public area does not contain any obvious real sensitive values.
